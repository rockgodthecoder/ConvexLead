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
    // Analytics fields
    formViews: v.optional(v.number()), // Number of times the form was viewed
    // CTA (Call-to-Action) fields
    cta: v.optional(v.object({
      mainText: v.string(),
      description: v.optional(v.string()),
      buttonText: v.string(),
      link: v.string(),
    })),
  })
    .index("by_user", ["createdBy"])
    .index("by_user_and_active", ["createdBy", "isActive"])
    .index("by_share_id", ["shareId"]),

  leads: defineTable({
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_created_at", ["createdAt"]),

  leadMagnetEngagements: defineTable({
    leadId: v.id("leads"),
    leadMagnetId: v.id("leadMagnets"),
    firstEngagement: v.number(),
    lastEngagement: v.number(),
    totalTimeSpent: v.number(),
    maxScrollPercentage: v.number(),
  })
    .index("by_lead", ["leadId"])
    .index("by_lead_magnet", ["leadMagnetId"])
    .index("by_lead_and_magnet", ["leadId", "leadMagnetId"]),

  // --- Advanced Analytics Tables ---
  analyticsSessions: defineTable({
    documentId: v.id("leadMagnets"),
    sessionId: v.string(),
    browserId: v.string(),
    userId: v.optional(v.string()),
    leadId: v.optional(v.id("leads")),
    userAgent: v.string(),
    referrer: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    duration: v.number(),
    maxScrollPercentage: v.number(),
    scrollEventCount: v.optional(v.number()),
    scrollEventsFileId: v.optional(v.id("_storage")),
    viewport: v.object({ width: v.number(), height: v.number() }),
    processed: v.optional(v.boolean()),
    createdAt: v.number(),
    email: v.optional(v.string()),
    // CTA Click Tracking
    ctaClicks: v.optional(v.number()), // Number of CTA clicks in this session
    // Method 2 Pixel Bin Tracking
    pixelBins: v.optional(v.array(v.object({
      y: v.number(),
      timeSpent: v.number(),
      isActive: v.optional(v.boolean())
    }))),
  })
    .index("by_document", ["documentId"])
    .index("by_browser", ["browserId"])
    .index("by_document_and_time", ["documentId", "startTime"])
    .index("by_lead", ["leadId"]),

  documentAnalytics: defineTable({
    documentId: v.id("leadMagnets"),
    timeRange: v.number(),
    totalSessions: v.number(),
    uniqueVisitors: v.number(),
    totalTimeSpent: v.number(),
    totalScrollEvents: v.number(),
    completedSessions: v.number(),
    bouncedSessions: v.number(),
    // CTA Analytics
    totalCtaClicks: v.number(),
    ctaClickRate: v.number(), // Percentage of sessions with CTA clicks
    // Scroll depth buckets
    scrollDepthBuckets: v.object({
      depth_0_25: v.number(),
      depth_25_50: v.number(),
      depth_50_75: v.number(),
      depth_75_100: v.number(),
    }),
    deviceBreakdown: v.object({
      mobile: v.number(),
      tablet: v.number(),
      desktop: v.number(),
    }),
    referrerDomains: v.array(v.object({ domain: v.string(), count: v.number() })),
    dailyStats: v.array(v.object({
      date: v.string(),
      sessions: v.number(),
      uniqueVisitors: v.number(),
      averageTimeSpent: v.number(),
      averageScrollDepth: v.number(),
      ctaClicks: v.number(), // CTA clicks per day
    })),
    lastProcessedSession: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_document_and_timerange", ["documentId", "timeRange"])
    .index("by_document", ["documentId"]),


};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
