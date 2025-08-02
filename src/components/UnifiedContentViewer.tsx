import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { TipTapContentViewer } from './TipTapContentViewer';
import { Id } from '../../convex/_generated/dataModel';

import { useAnalyticsTracking } from '../hooks/use-analytics-tracking';
import { AnalyticsDemo } from './AnalyticsDemo';

interface UnifiedContentViewerProps {
  type: 'pdf' | 'scratch' | 'notion' | 'html';
  content?: string | null;
  fileUrl?: string | null;
  notionUrl?: string | null;
  title?: string | null;
  documentId?: Id<'leadMagnets'>;
  userEmail?: string;
}

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/build/pdf.worker.mjs";

interface RenderedPage {
  pageNum: number;
  canvas: HTMLCanvasElement;
}

export function UnifiedContentViewer({ 
  type, 
  content, 
  fileUrl, 
  notionUrl, 
  title, 
  documentId, 
  userEmail 
}: UnifiedContentViewerProps) {
  // PDF state
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);
  const [scale, setScale] = useState(1.5);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Analytics tracking for all content types
  const analyticsState = useAnalyticsTracking({
    documentId: documentId || "temp" as any,
    enabled: !!documentId, // Enable for all content types
    userEmail,
    containerRef // Pass container ref for PDF/scratch content
  });

  // Use main analytics for all content types
  const activeAnalytics = analyticsState;

  // Debug logging
  console.log("🔍 UnifiedContentViewer Analytics Debug:", {
    type,
    isTracking: activeAnalytics.isTracking,
    documentId,
    enabled: !!documentId,
    timeOnPage: activeAnalytics.timeOnPage,
    maxScrollPercentage: activeAnalytics.maxScrollPercentage,
    currentScrollPercentage: activeAnalytics.currentScrollPercentage,
    scrollEventsCount: activeAnalytics.scrollEventsCount,
    isTabVisible: activeAnalytics.isTabVisible,
    showAnalytics,
    userEmail,
    timestamp: Date.now(),
    analyticsEnabled: !!documentId, // Single analytics hook enabled for all content
    containerRefExists: !!containerRef.current,
    content: !!content,
    fileUrl: !!fileUrl
  });

  // Load and convert PDF
  const loadAndConvertPDF = async (url: string) => {
    try {
      setIsLoading(true);
      setHasError(false);
      
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      
      await renderAllPages(pdf);
    } catch (error) {
      console.error("Error loading PDF:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Render all pages
  const renderAllPages = async (pdf: any) => {
    const pages: RenderedPage[] = [];
    const numPages = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      // Get device pixel ratio for high DPI displays
      const pixelRatio = window.devicePixelRatio || 1;
      
      // Set canvas size accounting for device pixel ratio
      canvas.width = viewport.width * pixelRatio;
      canvas.height = viewport.height * pixelRatio;
      
      // Set CSS size
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
      
      if (context) {
        // Scale the context to account for device pixel ratio
        context.scale(pixelRatio, pixelRatio);
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        await page.render(renderContext).promise;
      }
      
      pages.push({ pageNum, canvas });
    }
    
    setRenderedPages(pages);
  };

  // Load PDF when component mounts or fileUrl changes
  useEffect(() => {
    if (type === "pdf" && fileUrl) {
      loadAndConvertPDF(fileUrl);
    }
  }, [type, fileUrl, scale]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden relative">
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
      )}
      
      <div className="border rounded-lg bg-gray-50 overflow-y-auto relative">
        <div className="p-4">
          {type === "pdf" && fileUrl && (
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Converting PDF...</p>
                  </div>
                </div>
              )}
              
              {hasError && (
                <div className="text-center p-8">
                  <div className="text-gray-500 mb-4">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to display PDF</h3>
                  <p className="text-gray-600 mb-4">The PDF couldn't be loaded in the browser viewer.</p>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📄 Download PDF
                  </a>
                </div>
              )}
              
              {!isLoading && !hasError && renderedPages.length > 0 && (
                <div 
                  ref={containerRef}
                  className="relative"
                >
                  <div className="flex flex-col items-center p-4">
                    {renderedPages.map(({ pageNum, canvas }) => (
                      <div key={pageNum} className="mb-4 text-center">
                        <div className="text-sm text-gray-500 mb-2">Page {pageNum}</div>
                        <div 
                          ref={(el) => {
                            if (el && !el.contains(canvas)) {
                              el.appendChild(canvas);
                            }
                          }} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {type === "scratch" && content && (
            <TipTapContentViewer content={content} />
          )}
          
          {type === "notion" && notionUrl && (
            <div className="text-center">
              <a
                href={notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                📝 View Notion Page
              </a>
            </div>
          )}
          
          {type === "html" && content && (
            <div 
              className="text-gray-800 text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
      </div>
      
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span>{type.charAt(0).toUpperCase() + type.slice(1)} Content</span>
            {type === "pdf" && renderedPages.length > 0 && (
              <span> ({renderedPages.length} pages)</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Sticky Analytics Button - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
            {activeAnalytics.isTracking ? '🟢 Tracking' : '🔴 Not Tracking'}
          </div>
          <button
            onClick={() => {
              console.log("🔘 Analytics button clicked! Current state:", showAnalytics);
              setShowAnalytics(!showAnalytics);
              console.log("🔘 New state will be:", !showAnalytics);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            <span>📊</span>
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            {activeAnalytics.isTracking && (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            )}
          </button>
        </div>
      </div>
      
      {/* Analytics Demo - Show users the tracking in action */}
      {showAnalytics && (
        <AnalyticsDemo
          browserId={activeAnalytics.browserId || "debug-browser"}
          sessionId={activeAnalytics.sessionId || "debug-session"}
          timeOnPage={activeAnalytics.timeOnPage || 0}
          maxScrollPercentage={activeAnalytics.maxScrollPercentage || 0}
          currentScrollPercentage={activeAnalytics.currentScrollPercentage || 0}
          scrollEventsCount={activeAnalytics.scrollEventsCount || 0}
          isTracking={activeAnalytics.isTracking || false}
          isTabVisible={activeAnalytics.isTabVisible || true}
          scrollRangeTimeData={activeAnalytics.scrollRangeTimeData || {}}
        />
      )}
    </div>
  );
} 