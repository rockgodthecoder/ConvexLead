import { mutation, action, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const saveSession = mutation({
  args: {
    sessionId: v.string(),
    browserId: v.string(),
    documentId: v.id("leadMagnets"),
    userId: v.optional(v.string()),
    leadId: v.optional(v.id("leads")),
    startTime: v.number(),
    endTime: v.number(),
    duration: v.number(),
    maxScrollPercentage: v.number(),
    scrollEvents: v.array(v.object({
      timestamp: v.number(),
      scrollY: v.number(),
      scrollPercentage: v.number(),
      viewportHeight: v.number(),
      documentHeight: v.number(),
    })),
    userAgent: v.string(),
    referrer: v.optional(v.string()),
    viewport: v.object({ width: v.number(), height: v.number() }),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Store scroll events in a separate file if there are many
    let scrollEventsFileId: any = undefined;
    // Note: File storage temporarily disabled due to API issues

    await ctx.db.insert("analyticsSessions", {
      sessionId: args.sessionId,
      browserId: args.browserId,
      documentId: args.documentId,
      userId: args.userId,
      leadId: args.leadId,
      startTime: args.startTime,
      endTime: args.endTime,
      duration: args.duration,
      maxScrollPercentage: args.maxScrollPercentage,
      scrollEventCount: args.scrollEvents.length,
      scrollEventsFileId,
      userAgent: args.userAgent,
      referrer: args.referrer,
      viewport: args.viewport,
      processed: false,
      createdAt: Date.now(),
      email: args.email,
    });
  },
});

export const saveCompleteSession = action({
  args: {
    sessionId: v.string(),
    browserId: v.string(),
    documentId: v.id("leadMagnets"),
    userId: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    duration: v.number(),
    maxScrollPercentage: v.number(),
    scrollEvents: v.array(v.object({
      timestamp: v.number(),
      scrollY: v.number(),
      scrollPercentage: v.number(),
      viewportHeight: v.number(),
      documentHeight: v.number(),
    })),
    userAgent: v.string(),
    referrer: v.optional(v.string()),
    viewport: v.object({ width: v.number(), height: v.number() }),
    email: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find lead by email if provided
    let leadId: any = undefined;
    if (args.email) {
      const lead: any = await ctx.runQuery(api.leads.getByEmail, { email: args.email });
      if (lead) {
        leadId = lead._id;
        
        // Update engagement metrics
        await ctx.runMutation(api.analytics.updateEngagement, {
          leadId: lead._id,
          leadMagnetId: args.documentId,
          duration: args.duration,
          maxScrollPercentage: args.maxScrollPercentage,
        });
      }
    }

    // Save session with leadId
    await ctx.runMutation(api.analytics.saveSession, {
      ...args,
      leadId,
    });

    return null;
  },
});

export const updateEngagement = mutation({
  args: {
    leadId: v.id("leads"),
    leadMagnetId: v.id("leadMagnets"),
    duration: v.number(),
    maxScrollPercentage: v.number(),
  },
  handler: async (ctx, args) => {
    const engagement = await ctx.db
      .query("leadMagnetEngagements")
      .withIndex("by_lead_and_magnet", (q) =>
        q.eq("leadId", args.leadId).eq("leadMagnetId", args.leadMagnetId)
      )
      .first();

    if (engagement) {
      await ctx.db.patch(engagement._id, {
        lastEngagement: Date.now(),
        totalTimeSpent: engagement.totalTimeSpent + args.duration,
        maxScrollPercentage: Math.max(engagement.maxScrollPercentage, args.maxScrollPercentage),
      });
    }
    return null;
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
      .withIndex("by_document_and_time", (q) =>
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
      .withIndex("by_document_and_timerange", (q) =>
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
    email: v.optional(v.string()),
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
      .withIndex("by_browser", (q) => q.eq("browserId", args.browserId))
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
      .withIndex("by_browser", (q) => q.eq("browserId", args.browserId))
      .first();
    return analytics || null;
  },
});

export const recordFormView = mutation({
  args: {
    leadMagnetId: v.id("leadMagnets"),
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate a unique session ID for this form view
    const sessionId = `form_view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const browserId = `browser_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📊 Recording form view for lead magnet: ${args.leadMagnetId}, shareId: ${args.shareId}`);
    
    await ctx.db.insert("analyticsSessions", {
      sessionId,
      browserId,
      documentId: args.leadMagnetId,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0, // Form view duration is 0 since we're just recording the view
      maxScrollPercentage: 0,
      scrollEventCount: 0,
      scrollEventsFileId: undefined,
      userAgent: "Form View Tracking",
      referrer: "Direct", // We'll get the actual referrer from the client
      viewport: { width: 0, height: 0 }, // Will be updated if needed
      processed: false,
      createdAt: Date.now(),
    });
    
    console.log(`✅ Form view recorded successfully with sessionId: ${sessionId}`);
  },
});

export const getFormViews = query({
  args: {
    leadMagnetId: v.id("leadMagnets"),
  },
  handler: async (ctx, args) => {
    console.log(`🔍 Getting form views for lead magnet: ${args.leadMagnetId}`);
    
    // Count form views (sessions with duration 0 and "Form View Tracking" user agent)
    const formViews = await ctx.db
      .query("analyticsSessions")
      .withIndex("by_document", (q) => q.eq("documentId", args.leadMagnetId))
      .filter((q) => 
        q.and(
          q.eq(q.field("duration"), 0),
          q.eq(q.field("userAgent"), "Form View Tracking")
        )
      )
      .collect();
    
    console.log(`📊 Found ${formViews.length} form views for lead magnet: ${args.leadMagnetId}`);
    
    return formViews.length;
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

export const getSessionsForLeadMagnet = query({
  args: {
    leadMagnetId: v.id("leadMagnets"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    
    // Get sessions for this lead magnet, ordered by most recent first
    const sessions = await ctx.db
      .query("analyticsSessions")
      .withIndex("by_document_and_time", (q) => q.eq("documentId", args.leadMagnetId))
      .order("desc")
      .take(limit);
    
    // Get lead information for sessions that have leadId
    const sessionsWithLeads = await Promise.all(
      sessions.map(async (session) => {
        let lead = null;
        if (session.leadId) {
          lead = await ctx.db.get(session.leadId);
        }
        
        return {
          ...session,
          lead: lead ? {
            email: lead.email,
            firstName: lead.firstName,
            lastName: lead.lastName,
            phone: lead.phone,
            company: lead.company,
          } : null,
        };
      })
    );
    
    return sessionsWithLeads;
  },
}); 