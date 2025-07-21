import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  leadMagnets: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("scratch"), v.literal("pdf"), v.literal("notion"), v.literal("html")),
    content: v.optional(v.string()), // For scratch content or HTML content
    fileId: v.optional(v.id("_storage")), // For PDF files
    notionUrl: v.optional(v.string()), // For Notion links
    createdBy: v.id("users"),
    isActive: v.boolean(),
    // Field configuration for the opt-in form
    fields: v.optional(v.object({
      firstName: v.boolean(),
      lastName: v.boolean(),
      email: v.boolean(), // Always true, but kept for consistency
      phone: v.boolean(),
      company: v.boolean(),
    })),
    // Unique shareable link identifier
    shareId: v.optional(v.string()),
  })
    .index("by_user", ["createdBy"])
    .index("by_user_and_active", ["createdBy", "isActive"])
    .index("by_share_id", ["shareId"]),

  leads: defineTable({
    leadMagnetId: v.id("leadMagnets"),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_lead_magnet", ["leadMagnetId"])
    .index("by_email", ["email"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
