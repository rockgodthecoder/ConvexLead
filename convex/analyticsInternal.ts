import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveSession = mutation({
  args: {
    documentId: v.id("leadMagnets"),
    sessionId: v.string(),
    browserId: v.string(),
    userId: v.optional(v.string()),
    userAgent: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    duration: v.number(),
    maxScrollPercentage: v.number(),
    scrollEventCount: v.optional(v.number()),
    viewport: v.object({ width: v.number(), height: v.number() }),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("analyticsSessions", {
      ...args,
      createdAt: Date.now(),
    });
    return null;
  },
}); 