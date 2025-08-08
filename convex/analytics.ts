import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

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
      userAgent: args.userAgent,
      viewport: args.viewport,
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
      referrerDomains: [],
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
      referrerDomains: [],
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
      userAgent: "Form View Tracking",
      viewport: { width: 0, height: 0 }, // Will be updated if needed
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

export const getAverageViewTime = query({
  args: {
    leadMagnetId: v.id("leadMagnets"),
  },
  handler: async (ctx, args) => {
    // Get all sessions for this lead magnet
    const sessions = await ctx.db
      .query("analyticsSessions")
      .withIndex("by_document", (q) => q.eq("documentId", args.leadMagnetId))
      .collect();
    
    // Filter out sessions with duration 0 (form views) and calculate average
    const validSessions = sessions.filter(session => session.duration > 0);
    
    if (validSessions.length === 0) {
      return {
        averageViewTime: 0,
        totalSessions: 0,
        totalTimeSpent: 0
      };
    }
    
    const totalTimeSpent = validSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const averageViewTime = Math.round(totalTimeSpent / validSessions.length);
    
    return {
      averageViewTime,
      totalSessions: validSessions.length,
      totalTimeSpent
    };
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
      return null;
    }

    const session = sessions[0] as any;
    await ctx.db.patch(session._id, {
      ctaClicks: (session.ctaClicks || 0) + 1,
      ctaClickTimes: Array.isArray(session.ctaClickTimes)
        ? [...session.ctaClickTimes, args.clickTime]
        : [args.clickTime],
    });

    console.log(`✅ CTA click tracked successfully for session: ${args.sessionId}`);
    return null;
  },
});

export const getSessionsForAllLeadMagnets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get all lead magnets for this user
    const leadMagnets = await ctx.db
      .query("leadMagnets")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .collect();

    if (leadMagnets.length === 0) {
      return [];
    }

    const leadMagnetIds = leadMagnets.map(m => m._id);

    // Get all sessions for user's lead magnets
    const allSessions = await ctx.db
      .query("analyticsSessions")
      .collect()
      .then(sessions => sessions.filter(session => leadMagnetIds.includes(session.documentId)))
      .then(sessions => sessions.sort((a, b) => b.createdAt - a.createdAt));

    return allSessions;
  },
});

export const getOverallLeadGenerationPerformance = query({
  args: {
    timeRange: v.optional(v.number()), // days, default 30
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const timeRange = args.timeRange || 30;
    const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;

    // Get all lead magnets for this user
    const leadMagnets = await ctx.db
      .query("leadMagnets")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .collect();

    if (leadMagnets.length === 0) {
      return {
        totalLeadMagnets: 0,
        activeLeadMagnets: 0,
        totalLeads: 0,
        totalViews: 0,
        overallConversionRate: 0,
        averageLeadsPerMagnet: 0,
        averageViewsPerMagnet: 0,
        topPerformingMagnets: [],
        performanceByType: {},
        dailyLeadTrends: [],
        totalSessions: 0,
        totalTimeSpent: 0,
        averageSessionDuration: 0,
        averageScrollDepth: 0,
        completionRate: 0,
        bounceRate: 0,
        totalCtaClicks: 0,
        ctaClickRate: 0,
        deviceBreakdown: { mobile: 0, tablet: 0, desktop: 0 },
      };
    }

    const leadMagnetIds = leadMagnets.map(m => m._id);

    // Get all leads for user's lead magnets
    const allEngagements = await ctx.db
      .query("leadMagnetEngagements")
      .collect()
      .then(engagements => engagements.filter(e => leadMagnetIds.includes(e.leadMagnetId)));

    // Get all sessions for user's lead magnets
    const allSessions = await ctx.db
      .query("analyticsSessions")
      .collect()
      .then(sessions => sessions.filter(s => leadMagnetIds.includes(s.documentId)));

    // Filter by time range
    const recentSessions = allSessions.filter(s => s.createdAt >= cutoffTime);
    const recentEngagements = allEngagements.filter(e => e.lastEngagement >= cutoffTime);

    // Calculate core metrics
    const totalLeadMagnets = leadMagnets.length;
    const activeLeadMagnets = leadMagnets.filter(m => m.isActive).length;
    const totalLeads = allEngagements.length;
    const totalViews = leadMagnets.reduce((sum, m) => sum + (m.formViews || 0), 0);
    const overallConversionRate = totalViews > 0 ? Math.round((totalLeads / totalViews) * 100) : 0;
    const averageLeadsPerMagnet = totalLeadMagnets > 0 ? Math.round(totalLeads / totalLeadMagnets) : 0;
    const averageViewsPerMagnet = totalLeadMagnets > 0 ? Math.round(totalViews / totalLeadMagnets) : 0;

    // Top performing magnets (by leads)
    const magnetsWithLeads = await Promise.all(
      leadMagnets.map(async (magnet) => {
        const magnetLeads = allEngagements.filter(e => e.leadMagnetId === magnet._id).length;
        const magnetViews = magnet.formViews || 0;
        const magnetConversionRate = magnetViews > 0 ? Math.round((magnetLeads / magnetViews) * 100) : 0;
        
        return {
          _id: magnet._id,
          title: magnet.title,
          type: magnet.type,
          leads: magnetLeads,
          views: magnetViews,
          conversionRate: magnetConversionRate,
          isActive: magnet.isActive,
        };
      })
    );

    const topPerformingMagnets = magnetsWithLeads
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5);

    // Performance by type
    const performanceByType = magnetsWithLeads.reduce((acc, magnet) => {
      if (!acc[magnet.type]) {
        acc[magnet.type] = { totalLeads: 0, totalViews: 0, count: 0, conversionRate: 0, averageLeads: 0 };
      }
      acc[magnet.type].totalLeads += magnet.leads;
      acc[magnet.type].totalViews += magnet.views;
      acc[magnet.type].count += 1;
      return acc;
    }, {} as Record<string, { totalLeads: number; totalViews: number; count: number; conversionRate: number; averageLeads: number }>);

    // Calculate conversion rates by type
    Object.keys(performanceByType).forEach(type => {
      const data = performanceByType[type];
      data.conversionRate = data.totalViews > 0 ? Math.round((data.totalLeads / data.totalViews) * 100) : 0;
      data.averageLeads = data.count > 0 ? Math.round(data.totalLeads / data.count) : 0;
    });

    // Daily lead trends
    const leadsByDate = new Map<string, number>();
    allEngagements.forEach(engagement => {
      const date = new Date(engagement.lastEngagement).toISOString().split('T')[0];
      leadsByDate.set(date, (leadsByDate.get(date) || 0) + 1);
    });

    const dailyLeadTrends = Array.from(leadsByDate.entries())
      .map(([date, count]) => ({ date, leads: count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Session analytics
    const totalSessions = allSessions.length;
    const totalTimeSpent = allSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const averageSessionDuration = totalSessions > 0 ? Math.round(totalTimeSpent / totalSessions) : 0;
    const averageScrollDepth = totalSessions > 0 
      ? Math.round(allSessions.reduce((sum, s) => sum + (s.maxScrollPercentage || 0), 0) / totalSessions)
      : 0;
    const completionRate = totalSessions > 0 
      ? Math.round((allSessions.filter(s => (s.maxScrollPercentage || 0) >= 90).length / totalSessions) * 100)
      : 0;
    const bounceRate = totalSessions > 0
      ? Math.round((allSessions.filter(s => (s.duration || 0) < 10).length / totalSessions) * 100)
      : 0;

    // CTA analytics
    const totalCtaClicks = allSessions.reduce((sum, s) => sum + (s.ctaClicks || 0), 0);
    const sessionsWithCtaClicks = allSessions.filter(s => (s.ctaClicks || 0) > 0).length;
    const ctaClickRate = totalSessions > 0 ? Math.round((sessionsWithCtaClicks / totalSessions) * 100) : 0;

    // Device breakdown
    const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
    allSessions.forEach(s => {
      const w = s.viewport?.width || 0;
      if (w < 768) deviceBreakdown.mobile++;
      else if (w < 1024) deviceBreakdown.tablet++;
      else deviceBreakdown.desktop++;
    });

    return {
      totalLeadMagnets,
      activeLeadMagnets,
      totalLeads,
      totalViews,
      overallConversionRate,
      averageLeadsPerMagnet,
      averageViewsPerMagnet,
      topPerformingMagnets,
      performanceByType,
      dailyLeadTrends,
      totalSessions,
      totalTimeSpent,
      averageSessionDuration,
      averageScrollDepth,
      completionRate,
      bounceRate,
      totalCtaClicks,
      ctaClickRate,
      deviceBreakdown,
    };
  },
});



export const getBaseScreenshot = query({
  args: {
    documentId: v.id("leadMagnets"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    
    if (!document || !document.baseScreenshotFileId) {
      return null;
    }
    
    try {
      const url = await ctx.storage.getUrl(document.baseScreenshotFileId);
      return {
        url,
        capturedAt: document.baseScreenshotCapturedAt,
      };
    } catch (error) {
      console.error(`❌ Error getting base screenshot URL:`, error);
      return null;
    }
  },
});





export const updateScreenshotFields = mutation({
  args: {
    documentId: v.id("leadMagnets"),
    fileId: v.id("_storage"),
    capturedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      baseScreenshotFileId: args.fileId,
      baseScreenshotCapturedAt: args.capturedAt,
    });
  },
}); 