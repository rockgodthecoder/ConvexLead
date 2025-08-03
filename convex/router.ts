import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// HTTP endpoint for analytics beacon (used when tab closes)
http.route({
  path: "/api/analytics/beacon",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      console.log('📊 Beacon endpoint hit - processing analytics data');
      
      // Parse the JSON data from the request
      const analyticsData = await req.json();
      
      console.log('📊 Analytics data received:', {
        sessionId: analyticsData.sessionId,
        documentId: analyticsData.documentId,
        duration: analyticsData.duration,
        maxScrollPercentage: analyticsData.maxScrollPercentage,
        pixelBinsCount: analyticsData.pixelBins?.length || 0
      });
      
      // Call the saveCompleteSession action
      await ctx.runAction(api.analytics.saveCompleteSession, analyticsData);
      
      console.log('✅ Analytics data saved successfully via beacon');
      
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error('❌ Error processing beacon request:', error);
      return new Response("Error", { status: 500 });
    }
  }),
});

export default http;
