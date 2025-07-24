import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// 1. Save a complete analytics session (called from frontend)
export const saveSession = mutation({
  args: {
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
    email: v.optional(v.string()), // <-- add this
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("analyticsSessions", {
      ...args,
      processed: false,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const saveSessionAnalytics = action({
  args: {
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
    email: v.optional(v.string()), // <-- add this
  },
  handler: async (ctx, args) => {
    // Store session data in analyticsSessions, mark as unprocessed
    await ctx.runMutation(api.analytics.saveSession, { ...args });
    return { success: true };
  },
});

// 2. Aggregate analytics for a document and time range
export const processAndGetDocumentAnalytics = mutation({
  args: {
    documentId: v.id("leadMagnets"),
    timeRange: v.optional(v.number()), // days
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || 7;
    const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;
    // Get all sessions for this document in the time range
    const sessions = await ctx.db
      .query("analyticsSessions")
      .withIndex("by_document_and_time", q =>
        q.eq("documentId", args.documentId).gte("startTime", cutoffTime)
      )
      .collect();
    // Aggregate metrics
    const totalSessions = sessions.length;
    const uniqueVisitors = new Set(sessions.map(s => s.browserId)).size;
    const totalTimeSpent = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalScrollEvents = sessions.reduce((sum, s) => sum + (s.scrollEventCount || 0), 0);
    const completedSessions = sessions.filter(s => (s.maxScrollPercentage || 0) >= 90).length;
    const bouncedSessions = sessions.filter(s => (s.duration || 0) < 10).length;
    // Scroll depth buckets
    const scrollDepthBuckets = {
      depth_0_25: sessions.filter(s => s.maxScrollPercentage < 25).length,
      depth_25_50: sessions.filter(s => s.maxScrollPercentage >= 25 && s.maxScrollPercentage < 50).length,
      depth_50_75: sessions.filter(s => s.maxScrollPercentage >= 50 && s.maxScrollPercentage < 75).length,
      depth_75_100: sessions.filter(s => s.maxScrollPercentage >= 75).length,
    };
    // Device breakdown
    const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
    sessions.forEach(s => {
      const w = s.viewport?.width || 0;
      if (w < 768) deviceBreakdown.mobile++;
      else if (w < 1024) deviceBreakdown.tablet++;
      else deviceBreakdown.desktop++;
    });
    // Referrer domains
    const referrerDomainsMap: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.referrer) {
        try {
          const url = new URL(s.referrer);
          const domain = url.hostname;
          referrerDomainsMap[domain] = (referrerDomainsMap[domain] || 0) + 1;
        } catch {}
      }
    });
    const referrerDomains = Object.entries(referrerDomainsMap).map(([domain, count]) => ({ domain, count }));
    // Daily stats
    const dailyStatsMap: Record<string, { sessions: number; uniqueVisitors: Set<string>; totalTime: number; totalScroll: number; }> = {};
    sessions.forEach(s => {
      const date = new Date(s.startTime).toISOString().slice(0, 10);
      if (!dailyStatsMap[date]) dailyStatsMap[date] = { sessions: 0, uniqueVisitors: new Set(), totalTime: 0, totalScroll: 0 };
      dailyStatsMap[date].sessions++;
      dailyStatsMap[date].uniqueVisitors.add(s.browserId);
      dailyStatsMap[date].totalTime += s.duration || 0;
      dailyStatsMap[date].totalScroll += s.maxScrollPercentage || 0;
    });
    const dailyStats = Object.entries(dailyStatsMap).map(([date, stats]) => ({
      date,
      sessions: stats.sessions,
      uniqueVisitors: stats.uniqueVisitors.size,
      averageTimeSpent: stats.sessions > 0 ? stats.totalTime / stats.sessions : 0,
      averageScrollDepth: stats.sessions > 0 ? stats.totalScroll / stats.sessions : 0,
    }));
    // Upsert into documentAnalytics
    await ctx.db.insert("documentAnalytics", {
      documentId: args.documentId,
      timeRange,
      totalSessions,
      uniqueVisitors,
      totalTimeSpent,
      totalScrollEvents,
      completedSessions,
      bouncedSessions,
      scrollDepthBuckets,
      deviceBreakdown,
      referrerDomains,
      dailyStats,
      lastProcessedSession: undefined,
      lastUpdated: Date.now(),
    });
    return {
      totalSessions,
      uniqueVisitors,
      totalTimeSpent,
      totalScrollEvents,
      completedSessions,
      bouncedSessions,
      scrollDepthBuckets,
      deviceBreakdown,
      referrerDomains,
      dailyStats,
    };
  },
});

// 3. Query aggregated analytics for a document
export const getDocumentAnalytics = query({
  args: {
    documentId: v.id("leadMagnets"),
    timeRange: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || 7;
    // Find the latest analytics for this document and time range
    const analytics = await ctx.db
      .query("documentAnalytics")
      .withIndex("by_document_and_timerange", q =>
        q.eq("documentId", args.documentId).eq("timeRange", timeRange)
      )
      .first();
    return analytics || null;
  },
});

// --- User Journey & Sales Intelligence ---

export const recordJourneySession = mutation({
  args: {
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
    email: v.optional(v.string()), // <-- add this
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("journeySessions", {
      ...args,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const processAndGetUserJourneyAnalytics = mutation({
  args: {
    browserId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all journey sessions for this browserId (and userId if provided)
    const sessions = await ctx.db
      .query("journeySessions")
      .withIndex("by_browser", q => q.eq("browserId", args.browserId))
      .collect();
    if (sessions.length === 0) return null;
    // Group by document
    const docMap = new Map<string, any>();
    sessions.forEach(s => {
      const docId = s.documentId;
      if (!docMap.has(docId)) {
        docMap.set(docId, {
          documentId: docId,
          documentTitle: s.documentTitle || "",
          sessions: 0,
          totalDuration: 0,
          totalScrollDepth: 0,
          firstVisit: s.startTime,
          lastVisit: s.startTime,
          averageEngagement: 0,
        });
      }
      const doc = docMap.get(docId);
      doc.sessions++;
      doc.totalDuration += s.duration || 0;
      doc.firstVisit = Math.min(doc.firstVisit, s.startTime);
      doc.lastVisit = Math.max(doc.lastVisit, s.startTime);
      // (Scroll depth can be added if tracked)
    });
    const allDocuments = Array.from(docMap.values());
    // Top 3 documents by sessions
    const topDocuments = [...allDocuments].sort((a, b) => b.sessions - a.sessions).slice(0, 3);
    // Engagement score (simple average of sessions per doc)
    const engagementScore = allDocuments.length > 0 ? Math.round(allDocuments.reduce((sum, d) => sum + d.sessions, 0) / allDocuments.length) : 0;
    let engagementLevel = "Low";
    if (engagementScore >= 7) engagementLevel = "High";
    else if (engagementScore >= 3) engagementLevel = "Medium";
    // Device type
    const firstSession = sessions[0];
    const device = firstSession.viewport?.width < 768 ? "Mobile" : "Desktop";
    // Insert/update analytics
    await ctx.db.insert("userJourneyAnalytics", {
      browserId: args.browserId,
      userId: args.userId,
      totalSessions: sessions.length,
      uniqueDocuments: allDocuments.length,
      totalDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      averageDuration: Math.round(sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length),
      engagementLevel,
      engagementScore,
      topDocuments,
      allDocuments,
      firstVisit: Math.min(...sessions.map(s => s.startTime)),
      lastVisit: Math.max(...sessions.map(s => s.startTime)),
      daysSinceFirstVisit: Math.ceil((Date.now() - Math.min(...sessions.map(s => s.startTime))) / (24 * 60 * 60 * 1000)),
      daysSinceLastVisit: Math.ceil((Date.now() - Math.max(...sessions.map(s => s.startTime))) / (24 * 60 * 60 * 1000)),
      device,
      userAgent: firstSession.userAgent,
      referrer: firstSession.referrer || "Direct",
      lastUpdated: Date.now(),
    });
    return {
      totalSessions: sessions.length,
      uniqueDocuments: allDocuments.length,
      totalDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      averageDuration: Math.round(sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length),
      engagementLevel,
      engagementScore,
      topDocuments,
      allDocuments,
    };
  },
});

export const getUserJourneyAnalytics = query({
  args: {
    browserId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the latest analytics for this browserId/userId
    const analytics = await ctx.db
      .query("userJourneyAnalytics")
      .withIndex("by_browser", q => q.eq("browserId", args.browserId))
      .first();
    return analytics || null;
  },
});

export const getLeadWatchTime = query({
  args: {
    leadMagnetId: v.id("leadMagnets"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all sessions for this document and email
    const sessions = await ctx.db
      .query("analyticsSessions")
      .withIndex("by_document", (q) => q.eq("documentId", args.leadMagnetId))
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();
    const totalWatchTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const lastSession = sessions.length > 0 ? sessions.reduce((a, b) => (a.endTime > b.endTime ? a : b)) : null;
    return {
      totalWatchTime,
      lastWatchTime: lastSession ? lastSession.duration : 0,
      lastWatchedAt: lastSession ? lastSession.endTime : null,
      sessionCount: sessions.length,
    };
  },
}); 