"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import puppeteer from 'puppeteer';

export const captureShareLinkScreenshot = action({
  args: {
    documentId: v.id("leadMagnets"),
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`📸 Capturing share link screenshot for document: ${args.documentId}, shareId: ${args.shareId}`);
    
    try {
      // Construct the share link URL
      const shareUrl = `${process.env.CONVEX_SITE_URL || 'http://localhost:5173'}/share/${args.shareId}`;
      console.log(`🔗 Share URL: ${shareUrl}`);
      console.log(`🌐 Environment: CONVEX_SITE_URL=${process.env.CONVEX_SITE_URL}`);

      // Use Puppeteer to capture the screenshot
      console.log(`🚀 Launching Puppeteer browser...`);
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      console.log(`📄 Creating new page...`);
      const page = await browser.newPage();
      
      // Set viewport size
      console.log(`📱 Setting viewport to 1200x800...`);
      await page.setViewport({ width: 1200, height: 800 });
      
      // Navigate to the share link
      console.log(`🧭 Navigating to: ${shareUrl}`);
      await page.goto(shareUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      console.log(`✅ Navigation completed`);
      
      // Debug: Check what page we're actually on
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log(`📄 Page title: ${pageTitle}`);
      console.log(`🔗 Current URL: ${pageUrl}`);
      
      // Check if we're on the right page
      if (!pageUrl.includes('/share/')) {
        console.log(`⚠️ WARNING: Not on share page! Current URL: ${pageUrl}`);
      }
      
      // Wait for content to load
      console.log(`⏳ Waiting for body element...`);
      await page.waitForSelector('body', { timeout: 10000 });
      console.log(`✅ Body element found`);
      
      // Wait for the lead magnet content to load
      console.log(`⏳ Waiting for lead magnet header (.bg-gradient-to-r)...`);
      try {
        await page.waitForSelector('.bg-gradient-to-r', { timeout: 10000 }); // Header gradient
        console.log(`✅ Lead magnet header found`);
      } catch (error) {
        console.log(`❌ Lead magnet header not found: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log(`🔍 Checking what elements are available...`);
        
        // List all elements with classes
        const elements = await page.evaluate(() => {
          const allElements = document.querySelectorAll('*');
          const elementsWithClasses = Array.from(allElements)
            .filter(el => el.className && typeof el.className === 'string')
            .map(el => ({ tag: el.tagName, class: el.className }))
            .slice(0, 20); // First 20 elements
          return elementsWithClasses;
        });
        console.log(`📋 Available elements:`, elements);
      }
      
      // Wait for any dynamic content to load
      console.log(`⏳ Waiting 2 seconds for dynamic content...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Debug: Check page content
      console.log(`🔍 Analyzing page content...`);
      const pageContent = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyText: document.body.innerText.substring(0, 500),
          hasForm: !!document.querySelector('form'),
          hasGradient: !!document.querySelector('.bg-gradient-to-r'),
          hasLeadMagnet: !!document.querySelector('[class*="lead"]'),
          allClasses: Array.from(document.querySelectorAll('*'))
            .map(el => el.className)
            .filter(className => className && typeof className === 'string')
            .slice(0, 10)
        };
      });
      console.log(`📄 Page content analysis:`, pageContent);
      
      // Take screenshot
      console.log(`📸 Taking screenshot...`);
      const screenshot = await page.screenshot({ 
        fullPage: true,
        type: 'png'
      });
      console.log(`✅ Screenshot taken, size: ${screenshot.length} bytes`);
      
      await browser.close();
      
      // Store screenshot in Convex storage
      const fileId = await ctx.storage.store(new Blob([screenshot], { type: 'image/png' }));
      
      // Update the lead magnet with screenshot reference
      await ctx.runMutation(api.analytics.updateScreenshotFields, {
        documentId: args.documentId,
        fileId,
        capturedAt: Date.now(),
      });
      
      console.log(`✅ Share link screenshot captured and saved: ${fileId}`);
      return fileId;
      
    } catch (error) {
      console.error(`❌ Error capturing share link screenshot:`, error);
      throw new Error(`Failed to capture screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
}); 