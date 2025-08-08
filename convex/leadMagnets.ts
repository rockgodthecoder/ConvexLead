import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function generateShareId(): string {
  return Math.random().toString(36).substring(2, 8);
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
      .collect();

    return await Promise.all(
      leadMagnets.map(async (magnet) => {
        const leadsCount = await ctx.db
          .query("leadMagnetEngagements")
          .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", magnet._id))
          .collect()
          .then((engagements) => engagements.length);

        const sessionsCount = await ctx.db
          .query("analyticsSessions")
          .withIndex("by_document", (q) => q.eq("documentId", magnet._id))
          .collect()
          .then((sessions) => sessions.length);

        return {
          ...magnet,
          leadsCount,
          sessionsCount,
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
    cta: v.optional(v.object({
      mainText: v.string(),
      description: v.optional(v.string()),
      buttonText: v.string(),
      link: v.string(),
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

    const magnetId = await ctx.db.insert("leadMagnets", {
      ...args,
      createdBy: userId,
      isActive: true,
      shareId,
    });
    
    return { id: magnetId, shareId };
  },
});

export const update = mutation({
  args: {
    id: v.id("leadMagnets"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.union(v.literal("scratch"), v.literal("pdf"), v.literal("notion"), v.literal("html"))),
    content: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    notionUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    fields: v.optional(v.object({
      firstName: v.boolean(),
      lastName: v.boolean(),
      email: v.boolean(),
      phone: v.boolean(),
      company: v.boolean(),
    })),
    cta: v.optional(v.object({
      mainText: v.string(),
      description: v.optional(v.string()),
      buttonText: v.string(),
      link: v.string(),
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

    // Delete all engagements for this lead magnet
    const engagements = await ctx.db
      .query("leadMagnetEngagements")
      .withIndex("by_lead_magnet", (q) => q.eq("leadMagnetId", args.id))
      .collect();

    for (const engagement of engagements) {
      await ctx.db.delete(engagement._id);
    }

    // Delete the lead magnet
    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const getShareId = mutation({
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

    return magnet.shareId;
  },
});

export const incrementFormViews = mutation({
  args: { leadMagnetId: v.id("leadMagnets") },
  handler: async (ctx, args) => {
    const magnet = await ctx.db.get(args.leadMagnetId);
    if (!magnet) {
      throw new Error("Lead magnet not found");
    }

    const currentViews = magnet.formViews || 0;
    await ctx.db.patch(args.leadMagnetId, {
      formViews: currentViews + 1
    });
  },
});
