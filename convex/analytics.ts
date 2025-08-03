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
    // CTA Click Tracking
    ctaClicks: v.optional(v.number()),
    // Method 2 Pixel Bin Tracking
    pixelBins: v.optional(v.array(v.object({
      y: v.number(),
      timeSpent: v.number(),
      isActive: v.optional(v.boolean())
    }))),
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
      ctaClicks: args.ctaClicks || 0,
      pixelBins: args.pixelBins,
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
    // CTA Click Tracking
    ctaClicks: v.optional(v.number()),
    // Method 2 Pixel Bin Tracking
    pixelBins: v.optional(v.array(v.object({
      y: v.number(),
      timeSpent: v.number(),
      isActive: v.optional(v.boolean())
    }))),
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
    
    // CTA Analytics
    const totalCtaClicks = sessions.reduce((sum, s) => sum + (s.ctaClicks || 0), 0);
    const sessionsWithCtaClicks = sessions.filter(s => (s.ctaClicks || 0) > 0).length;
    const ctaClickRate = totalSessions > 0 ? (sessionsWithCtaClicks / totalSessions) * 100 : 0;
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
    const dailyStatsMap: Record<string, { sessions: number; uniqueVisitors: Set<string>; totalTime: number; totalScroll: number; totalCtaClicks: number; }> = {};
    sessions.forEach(s => {
      const date = new Date(s.startTime).toISOString().slice(0, 10);
      if (!dailyStatsMap[date]) dailyStatsMap[date] = { sessions: 0, uniqueVisitors: new Set(), totalTime: 0, totalScroll: 0, totalCtaClicks: 0 };
      dailyStatsMap[date].sessions++;
      dailyStatsMap[date].uniqueVisitors.add(s.browserId);
      dailyStatsMap[date].totalTime += s.duration || 0;
      dailyStatsMap[date].totalScroll += s.maxScrollPercentage || 0;
      dailyStatsMap[date].totalCtaClicks += s.ctaClicks || 0;
    });
    const dailyStats = Object.entries(dailyStatsMap).map(([date, stats]) => ({
      date,
      sessions: stats.sessions,
      uniqueVisitors: stats.uniqueVisitors.size,
      averageTimeSpent: stats.sessions > 0 ? stats.totalTime / stats.sessions : 0,
      averageScrollDepth: stats.sessions > 0 ? stats.totalScroll / stats.sessions : 0,
      ctaClicks: stats.totalCtaClicks,
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
      totalCtaClicks,
      ctaClickRate,
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
      totalCtaClicks,
      ctaClickRate,
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

export const trackCtaClick = mutation({
  args: {
    sessionId: v.string(),
    documentId: v.id("leadMagnets"),
    browserId: v.string(),
    clickTime: v.number(),
  },
  handler: async (ctx, args) => {
    console.log(`🔘 Tracking CTA click for session: ${args.sessionId}`);
    
    // Find the current session
    const sessions = await ctx.db
      .query("analyticsSessions")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .filter((q) => 
        q.and(
          q.eq(q.field("sessionId"), args.sessionId),
          q.eq(q.field("browserId"), args.browserId)
        )
      )
      .collect();
    
    if (sessions.length === 0) {
      console.log(`⚠️ No session found for CTA click tracking: ${args.sessionId} - will be included in session save`);
      // Don't return error - the click will be included when the session is saved
      return null;
    }
    
    const session = sessions[0];
    
    // Update the session with CTA click data
    await ctx.db.patch(session._id, {
      ctaClicks: (session.ctaClicks || 0) + 1,
    });
    
    console.log(`✅ CTA click tracked successfully for session: ${args.sessionId}`);
    return null;
  },
}); 