import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: { leadMagnetId: v.id("leadMagnets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the user owns the lead magnet
    const magnet = await ctx.db.get(args.leadMagnetId);
    if (!magnet || magnet.createdBy !== userId) {
      throw new Error("Lead magnet not found or unauthorized");
    }

    return await ctx.db
      .query("leads")
      .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", args.leadMagnetId))
      .order("desc")
      .collect();
  },
});

// New query to list all leads for the authenticated user
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get all lead magnets owned by the user
    const leadMagnets = await ctx.db
      .query("leadMagnets")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .collect();

    const leadMagnetIds = leadMagnets.map(m => m._id);
    
    if (leadMagnetIds.length === 0) {
      return [];
    }

    // Get all leads for these lead magnets
    const allLeads = [];
    for (const magnetId of leadMagnetIds) {
      const leads = await ctx.db
        .query("leads")
        .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", magnetId))
        .collect();
      
      // Add lead magnet info to each lead
      const magnet = leadMagnets.find(m => m._id === magnetId);
      const leadsWithMagnetInfo = leads.map(lead => ({
        ...lead,
        leadMagnetTitle: magnet?.title || "Unknown",
        leadMagnetType: magnet?.type || "unknown",
      }));
      
      allLeads.push(...leadsWithMagnetInfo);
    }

    // Sort by creation time (newest first)
    return allLeads.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const create = mutation({
  args: {
    leadMagnetId: v.id("leadMagnets"),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if lead already exists for this magnet
    const existingLead = await ctx.db
      .query("leads")
      .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", args.leadMagnetId))
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingLead) {
      throw new Error("Email already registered for this lead magnet");
    }

    return await ctx.db.insert("leads", args);
  },
});

// Public mutation to create lead via share link
export const createFromShare = mutation({
  args: {
    shareId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the lead magnet by share ID
    const magnet = await ctx.db
      .query("leadMagnets")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!magnet || !magnet.isActive) {
      throw new Error("Lead magnet not found or inactive");
    }

    // Check if lead already exists for this magnet
    const existingLead = await ctx.db
      .query("leads")
      .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", magnet._id))
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingLead) {
      throw new Error("Email already registered for this lead magnet");
    }

    const { shareId, ...leadData } = args;
    return await ctx.db.insert("leads", {
      ...leadData,
      leadMagnetId: magnet._id,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const lead = await ctx.db.get(args.id);
    if (!lead) {
      throw new Error("Lead not found");
    }

    // Verify the user owns the lead magnet
    const magnet = await ctx.db.get(lead.leadMagnetId);
    if (!magnet || magnet.createdBy !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const exportLeads = query({
  args: { leadMagnetId: v.id("leadMagnets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the user owns the lead magnet
    const magnet = await ctx.db.get(args.leadMagnetId);
    if (!magnet || magnet.createdBy !== userId) {
      throw new Error("Lead magnet not found or unauthorized");
    }

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", args.leadMagnetId))
      .collect();

    return leads.map((lead) => ({
      email: lead.email,
      firstName: lead.firstName || "",
      lastName: lead.lastName || "",
      phone: lead.phone || "",
      company: lead.company || "",
      notes: lead.notes || "",
      createdAt: new Date(lead._creationTime).toISOString(),
    }));
  },
});
