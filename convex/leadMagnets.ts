import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate a random share ID
function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const leadMagnets = await ctx.db
      .query("leadMagnets")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .order("desc")
      .collect();

    return Promise.all(
      leadMagnets.map(async (magnet) => {
        const leadsCount = await ctx.db
          .query("leads")
          .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", magnet._id))
          .collect()
          .then((leads) => leads.length);

        return {
          ...magnet,
          leadsCount,
          fileUrl: magnet.fileId ? await ctx.storage.getUrl(magnet.fileId) : null,
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("leadMagnets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const magnet = await ctx.db.get(args.id);
    if (!magnet || magnet.createdBy !== userId) {
      return null;
    }

    return {
      ...magnet,
      fileUrl: magnet.fileId ? await ctx.storage.getUrl(magnet.fileId) : null,
    };
  },
});

// Public query to get lead magnet by share ID
export const getByShareId = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    console.log("Looking for shareId:", args.shareId);
    
    const magnet = await ctx.db
      .query("leadMagnets")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    console.log("Found magnet:", magnet);

    if (!magnet || !magnet.isActive) {
      console.log("Magnet not found or inactive:", { found: !!magnet, isActive: magnet?.isActive });
      return null;
    }

    return {
      ...magnet,
      fileUrl: magnet.fileId ? await ctx.storage.getUrl(magnet.fileId) : null,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("scratch"), v.literal("pdf"), v.literal("notion"), v.literal("html")),
    content: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    notionUrl: v.optional(v.string()),
    fields: v.optional(v.object({
      firstName: v.boolean(),
      lastName: v.boolean(),
      email: v.boolean(),
      phone: v.boolean(),
      company: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Generate a unique share ID
    let shareId = generateShareId();
    
    // Ensure the share ID is unique
    while (await ctx.db.query("leadMagnets").withIndex("by_share_id", (q) => q.eq("shareId", shareId)).first()) {
      shareId = generateShareId();
    }

    return await ctx.db.insert("leadMagnets", {
      ...args,
      createdBy: userId,
      isActive: true,
      shareId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("leadMagnets"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    fields: v.optional(v.object({
      firstName: v.boolean(),
      lastName: v.boolean(),
      email: v.boolean(),
      phone: v.boolean(),
      company: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { id, ...updates } = args;
    const magnet = await ctx.db.get(id);
    
    if (!magnet || magnet.createdBy !== userId) {
      throw new Error("Lead magnet not found or unauthorized");
    }

    await ctx.db.patch(id, updates);
  },
});

export const regenerateShareId = mutation({
  args: { id: v.id("leadMagnets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const magnet = await ctx.db.get(args.id);
    if (!magnet || magnet.createdBy !== userId) {
      throw new Error("Lead magnet not found or unauthorized");
    }

    // Generate a new unique share ID
    let shareId = generateShareId();
    
    // Ensure the share ID is unique
    while (await ctx.db.query("leadMagnets").withIndex("by_share_id", (q) => q.eq("shareId", shareId)).first()) {
      shareId = generateShareId();
    }

    await ctx.db.patch(args.id, { shareId });
    return shareId;
  },
});

export const remove = mutation({
  args: { id: v.id("leadMagnets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const magnet = await ctx.db.get(args.id);
    if (!magnet || magnet.createdBy !== userId) {
      throw new Error("Lead magnet not found or unauthorized");
    }

    // Delete all associated leads first
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", args.id))
      .collect();

    for (const lead of leads) {
      await ctx.db.delete(lead._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});
