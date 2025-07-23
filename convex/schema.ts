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

  // --- Advanced Analytics Tables ---
  analyticsSessions: defineTable({
    documentId: v.id("leadMagnets"),
    sessionId: v.string(),
    browserId: v.string(),
    userId: v.optional(v.string()),
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
  })
    .index("by_document", ["documentId"])
    .index("by_browser", ["browserId"])
    .index("by_document_and_time", ["documentId", "startTime"]),

  documentAnalytics: defineTable({
    documentId: v.id("leadMagnets"),
    timeRange: v.number(),
    totalSessions: v.number(),
    uniqueVisitors: v.number(),
    totalTimeSpent: v.number(),
    totalScrollEvents: v.number(),
    completedSessions: v.number(),
    bouncedSessions: v.number(),
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
    })),
    lastProcessedSession: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_document_and_timerange", ["documentId", "timeRange"])
    .index("by_document", ["documentId"]),

  // --- User Journey & Sales Intelligence Tables ---
  journeySessions: defineTable({
    browserId: v.string(),
    sessionId: v.string(),
    userId: v.optional(v.string()),
    documentId: v.id("leadMagnets"),
    documentTitle: v.optional(v.string()),
    pageName: v.optional(v.string()),
    pathname: v.string(),
    referrer: v.optional(v.string()),
    previousPage: v.optional(v.string()),
    userAgent: v.string(),
    viewport: v.object({ width: v.number(), height: v.number() }),
    startTime: v.number(),
    endTime: v.number(),
    duration: v.number(),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_browser", ["browserId"])
    .index("by_document", ["documentId"])
    .index("by_session", ["sessionId"])
    .index("by_document_and_time", ["documentId", "startTime"]),

  // Aggregated user journey analytics (for sales intelligence)
  userJourneyAnalytics: defineTable({
    browserId: v.string(),
    userId: v.optional(v.string()),
    totalSessions: v.number(),
    uniqueDocuments: v.number(),
    totalDuration: v.number(),
    averageDuration: v.number(),
    engagementLevel: v.string(),
    engagementScore: v.number(),
    topDocuments: v.array(v.object({
      documentId: v.id("leadMagnets"),
      documentTitle: v.string(),
      sessions: v.number(),
      totalDuration: v.number(),
      totalScrollDepth: v.number(),
      firstVisit: v.number(),
      lastVisit: v.number(),
      averageEngagement: v.number(),
    })),
    allDocuments: v.array(v.object({
      documentId: v.id("leadMagnets"),
      documentTitle: v.string(),
      sessions: v.number(),
      totalDuration: v.number(),
      totalScrollDepth: v.number(),
      firstVisit: v.number(),
      lastVisit: v.number(),
      averageEngagement: v.number(),
    })),
    firstVisit: v.number(),
    lastVisit: v.number(),
    daysSinceFirstVisit: v.number(),
    daysSinceLastVisit: v.number(),
    device: v.string(),
    userAgent: v.string(),
    referrer: v.string(),
    lastUpdated: v.number(),
  })
    .index("by_browser", ["browserId"])
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
