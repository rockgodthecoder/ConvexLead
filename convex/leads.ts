import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const list = query({
  args: { leadMagnetId: v.id("leadMagnets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get engagements for this lead magnet
    const engagements = await ctx.db
      .query("leadMagnetEngagements")
      .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", args.leadMagnetId))
      .collect();

    // Get lead details for each engagement
    const leadsWithEngagements = await Promise.all(
      engagements.map(async (engagement) => {
        const lead = await ctx.db.get(engagement.leadId);
        if (!lead) return null;
        return {
          ...lead,
          engagement: {
            firstEngagement: engagement.firstEngagement,
            lastEngagement: engagement.lastEngagement,
            totalTimeSpent: engagement.totalTimeSpent,
            maxScrollPercentage: engagement.maxScrollPercentage,
          },
        };
      })
    );

    return leadsWithEngagements
      .filter((lead): lead is NonNullable<typeof lead> => lead !== null)
      .sort((a, b) => (b.engagement.lastEngagement || 0) - (a.engagement.lastEngagement || 0));
  },
});

export const listAll = query({
  args: { leadMagnetId: v.optional(v.id("leadMagnets")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get all lead magnets for this user
    const leadMagnets = await ctx.db
      .query("leadMagnets")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .collect();

    const leadMagnetIds = leadMagnets.map(m => m._id);
    if (leadMagnetIds.length === 0) {
      return [];
    }

    // Filter by specific lead magnet if provided
    const targetMagnetIds = args.leadMagnetId ? [args.leadMagnetId] : leadMagnetIds;

    // Get all engagements for user's lead magnets (or specific magnet)
    const allEngagements: any[] = [];
    for (const magnetId of targetMagnetIds) {
      const engagements = await ctx.db
        .query("leadMagnetEngagements")
        .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", magnetId))
        .collect();
      allEngagements.push(...engagements);
    }

    // Get unique leads
    const uniqueLeadIds = [...new Set(allEngagements.map(e => e.leadId))];
    const leadsWithEngagements = await Promise.all(
      uniqueLeadIds.map(async (leadId) => {
        const lead = await ctx.db.get(leadId);
        if (!lead) return null;
        
        // If filtering by specific magnet, only include engagements for that magnet
        // Otherwise, include all engagements for the lead
        const leadEngagements = args.leadMagnetId 
          ? allEngagements.filter(e => e.leadId === leadId && e.leadMagnetId === args.leadMagnetId)
          : allEngagements.filter(e => e.leadId === leadId);
          
        const engagementsWithMagnetInfo = leadEngagements.map(engagement => {
          const magnet = leadMagnets.find(m => m._id === engagement.leadMagnetId);
          return {
            ...engagement,
            leadMagnetTitle: magnet?.title || "Unknown",
            leadMagnetType: magnet?.type || "unknown",
          };
        });
        
        return {
          ...lead,
          engagements: engagementsWithMagnetInfo,
        };
      })
    );

    return leadsWithEngagements
      .filter((lead): lead is NonNullable<typeof lead> => lead !== null)
      .sort((a, b) => {
        const aLead = a as any;
        const bLead = b as any;
        return (bLead.lastEngagement || 0) - (aLead.lastEngagement || 0);
      });
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    leadMagnetId: v.id("leadMagnets"),
  },
  handler: async (ctx, args) => {
    const { leadMagnetId, ...leadData } = args;
    
    // Check if lead already exists
    const existingLead = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    let leadId: any;
    
    if (existingLead) {
      // Update existing lead
      await ctx.db.patch(existingLead._id, {
        ...leadData,
      });
      leadId = existingLead._id;
    } else {
      // Create new lead
      leadId = await ctx.db.insert("leads", {
        ...leadData,
        createdAt: Date.now(),
      });
    }

    // Create engagement record
    await ctx.db.insert("leadMagnetEngagements", {
      leadId,
      leadMagnetId,
      firstEngagement: Date.now(),
      lastEngagement: Date.now(),
      totalTimeSpent: 0,
      maxScrollPercentage: 0,
    });

    return leadId;
  },
});

export const createFromShare = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    const { shareId, ...leadData } = args;
    
    // Find lead magnet by share ID
    const magnet = await ctx.db
      .query("leadMagnets")
      .withIndex("by_share_id", (q) => q.eq("shareId", shareId))
      .first();

    if (!magnet) {
      throw new Error("Lead magnet not found");
    }

    // Check if lead already exists
    const existingLead = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    let leadId: any;
    
    if (existingLead) {
      // Update existing lead
      await ctx.db.patch(existingLead._id, {
        ...leadData,
      });
      leadId = existingLead._id;
    } else {
      // Create new lead
      leadId = await ctx.db.insert("leads", {
        ...leadData,
        createdAt: Date.now(),
      });
    }

    // Check if engagement already exists
    const existingEngagement = await ctx.db
      .query("leadMagnetEngagements")
      .withIndex("by_lead_and_magnet", (q) => 
        q.eq("leadId", leadId).eq("leadMagnetId", magnet._id)
      )
      .first();

    if (existingEngagement) {
      // Update existing engagement
      await ctx.db.patch(existingEngagement._id, {
        lastEngagement: Date.now(),
      });
    } else {
      // Create new engagement
      await ctx.db.insert("leadMagnetEngagements", {
        leadId,
        leadMagnetId: magnet._id,
        firstEngagement: Date.now(),
        lastEngagement: Date.now(),
        totalTimeSpent: 0,
        maxScrollPercentage: 0,
      });
    }

    return { leadId, magnetId: magnet._id };
  },
});

export const remove = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Delete all engagements for this lead
    const engagements = await ctx.db
      .query("leadMagnetEngagements")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .collect();

    for (const engagement of engagements) {
      await ctx.db.delete(engagement._id);
    }

    // Delete the lead
    await ctx.db.delete(args.leadId);
  },
});

export const getAllLeadsWithEngagements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const leadMagnets = await ctx.db
      .query("leadMagnets")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .collect();

    const leadMagnetIds = leadMagnets.map(m => m._id);
    if (leadMagnetIds.length === 0) {
      return [];
    }

    const allEngagements: any[] = [];
    for (const magnetId of leadMagnetIds) {
      const engagements = await ctx.db
        .query("leadMagnetEngagements")
        .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", magnetId))
        .collect();
      allEngagements.push(...engagements);
    }

    const uniqueLeadIds = [...new Set(allEngagements.map(e => e.leadId))];
    const leadsWithEngagements = await Promise.all(
      uniqueLeadIds.map(async (leadId) => {
        const lead = await ctx.db.get(leadId);
        if (!lead) return null;
        const leadEngagements = allEngagements.filter(e => e.leadId === leadId);
        const engagementsWithMagnetInfo = leadEngagements.map(engagement => {
          const magnet = leadMagnets.find(m => m._id === engagement.leadMagnetId);
          return {
            ...engagement,
            leadMagnetTitle: magnet?.title || "Unknown",
            leadMagnetType: magnet?.type || "unknown",
          };
        });
        return {
          ...lead,
          engagements: engagementsWithMagnetInfo,
        };
      })
    );

    return leadsWithEngagements
      .filter((lead): lead is NonNullable<typeof lead> => lead !== null)
      .sort((a, b) => {
        const aLead = a as any;
        const bLead = b as any;
        return (bLead.lastEngagement || 0) - (aLead.lastEngagement || 0);
      });
  },
});

export const exportLeads = query({
  args: { leadMagnetId: v.id("leadMagnets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const magnet = await ctx.db.get(args.leadMagnetId);
    if (!magnet || magnet.createdBy !== userId) {
      throw new Error("Lead magnet not found or unauthorized");
    }

    const engagements = await ctx.db
      .query("leadMagnetEngagements")
      .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", args.leadMagnetId))
      .collect();

    const leadsWithEngagements = await Promise.all(
      engagements.map(async (engagement) => {
        const lead = await ctx.db.get(engagement.leadId);
        if (!lead) return null;
        return {
          ...lead,
          engagement: {
            firstEngagement: engagement.firstEngagement,
            lastEngagement: engagement.lastEngagement,
            totalTimeSpent: engagement.totalTimeSpent,
            maxScrollPercentage: engagement.maxScrollPercentage,
          },
        };
      })
    );

    return leadsWithEngagements
      .filter((lead): lead is NonNullable<typeof lead> => lead !== null)
      .sort((a, b) => (b.engagement.lastEngagement || 0) - (a.engagement.lastEngagement || 0));
  },
});
