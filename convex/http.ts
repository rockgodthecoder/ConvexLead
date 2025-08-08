import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { v } from "convex/values";
import { api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// Test endpoint
http.route({
  path: "/test",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(JSON.stringify({ message: "HTTP endpoint is working!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }),
});

// Screenshot capture endpoint
http.route({
  path: "/capture-screenshot",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { documentId, shareId } = await request.json();
      
      if (!documentId || !shareId) {
        return new Response(JSON.stringify({ error: "Missing documentId or shareId" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Call the action to capture screenshot
      const fileId = await ctx.runAction(api.screenshot.captureShareLinkScreenshot, {
        documentId,
        shareId,
      });
      
      return new Response(JSON.stringify({ success: true, fileId }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      
    } catch (error) {
      console.error(`❌ Error capturing screenshot:`, error);
      return new Response(JSON.stringify({ 
        error: `Failed to capture screenshot: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }),
});

export default http;
