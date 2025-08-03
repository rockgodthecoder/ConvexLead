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
  cta?: {
    mainText: string;
    description?: string;
    buttonText: string;
    link: string;
  } | null;
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
  userEmail,
  cta
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

  // Method 2 tracking state from enhanced analytics hook
  const {
    pixelBins,
    heatmapData,
    showGridOverlay,
    showPixelTracking,
    setShowGridOverlay,
    setShowPixelTracking,
    initializePixelBins,
    startMethod2Tracking,
    stopMethod2Tracking
  } = analyticsState;

  // Heatmap overlay component
  const HeatmapOverlay = () => {
    if (!showPixelTracking || pixelBins.length === 0) return null;

    const maxScore = Math.max(...pixelBins.map(bin => bin.timeSpent));
    
    return (
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{ 
          background: 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      >
        {pixelBins.map((bin, index) => {
          if (bin.timeSpent === 0) return null;
          
          const intensity = maxScore > 0 ? (bin.timeSpent / maxScore) : 0;
          const opacity = Math.min(intensity * 0.8, 0.8); // Max 80% opacity
          
          return (
            <div
              key={index}
              className="absolute"
              style={{
                top: `${bin.y}px`,
                left: 0,
                right: 0,
                height: '25px',
                backgroundColor: `rgba(255, 0, 0, ${opacity})`,
                pointerEvents: 'none',
                transition: 'background-color 0.3s ease'
              }}
            />
          );
        })}
      </div>
    );
  };

  // Grid overlay component
  const GridOverlay = () => {
    if (!showGridOverlay || pixelBins.length === 0) return null;

    return (
      <div className="pointer-events-none fixed inset-0 z-40">
        {pixelBins.map((bin, i) => {
          const scrollY = window.pageYOffset || document.documentElement.scrollTop;
          const adjustedY = bin.y - scrollY;
          const isActive = heatmapData.activeBinIndex === i;
          
          // Calculate color based on actual bin score (like screenshot heatmap)
          const maxScore = Math.max(...pixelBins.map(bin => bin.timeSpent));
          const percentageOfMax = maxScore > 0 ? bin.timeSpent / maxScore : 0;
          const roundedPercentage = Math.round(percentageOfMax * 10) / 10;
          
          // Use red shades based on actual score (10% increments)
          let borderColor = 'border-red-300/60';
          let bgColor = 'bg-red-300/10';
          let textColor = 'text-red-300';
          
          if (bin.timeSpent > 0) {
            if (roundedPercentage >= 0.7) {
              // High scores (70-100% of max) - Dark red
              borderColor = 'border-red-600/60';
              bgColor = 'bg-red-600/10';
              textColor = 'text-red-600';
            } else if (roundedPercentage >= 0.5) {
              // Medium scores (50-69% of max) - Medium red
              borderColor = 'border-red-500/60';
              bgColor = 'bg-red-500/10';
              textColor = 'text-red-500';
            } else if (roundedPercentage >= 0.3) {
              // Lower scores (30-49% of max) - Light red
              borderColor = 'border-red-400/60';
              bgColor = 'bg-red-400/10';
              textColor = 'text-red-400';
            } else if (roundedPercentage >= 0.1) {
              // Low scores (10-29% of max) - Very light red
              borderColor = 'border-red-300/60';
              bgColor = 'bg-red-300/10';
              textColor = 'text-red-300';
            }
          }
          
          // Override with blue for active bin
          if (isActive) {
            borderColor = 'border-blue-400';
            bgColor = 'bg-blue-400/20';
            textColor = 'text-blue-400';
          }
          
          return (
            <div
              key={i}
              className={`absolute left-0 right-0 border-t ${borderColor} ${bgColor}`}
              style={{ top: `${adjustedY}px` }}
            >
              <div className={`absolute right-2 text-xs font-mono ${textColor} px-1 rounded`}>
                {bin.y}-{bin.y + 25}px {isActive ? '(ACTIVE)' : ''}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Download heatmap function (like PDF-HTML Method 2)
  const downloadHeatmap = async () => {
    try {
      console.log('📄 Starting heatmap generation...');
      
      // Create a temporary canvas with heatmap
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = document.body.scrollWidth;
      tempCanvas.height = document.body.scrollHeight;
      
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) {
        console.error('❌ Failed to get canvas context for heatmap');
        return;
      }
      
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw heatmap using current bin data
      const maxScore = Math.max(...pixelBins.map(bin => bin.timeSpent));
      const binSize = 25;
      
      console.log('🎨 Drawing heatmap...');
      
      pixelBins.forEach((bin, index) => {
        if (bin.timeSpent > 0) {
          const x = 0;
          const y = bin.y;
          const width = tempCanvas.width;
          const height = binSize;
          
          // Calculate percentage of max score (0 to 1)
          const percentageOfMax = bin.timeSpent / maxScore;
          const roundedPercentage = Math.round(percentageOfMax * 10) / 10;
          
          // Use only red with opacity based on 10% increments
          const opacity = Math.max(0.1, Math.min(0.7, roundedPercentage));
          const color = `rgba(255, 0, 0, ${opacity})`;
          
          // Draw the heatmap rectangle
          ctx.fillStyle = color;
          ctx.fillRect(x, y, width, height);
          
          // Add score text if score is significant
          if (bin.timeSpent > maxScore * 0.1) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`${bin.timeSpent.toFixed(2)}pts (${(roundedPercentage * 100).toFixed(0)}%)`, x + 10, y + 15);
          }
        }
      });
      
      // Draw grid lines for reference
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      
      for (let i = 0; i <= tempCanvas.height; i += binSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(tempCanvas.width, i);
        ctx.stroke();
      }
      
      // Add title and metadata
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('HeatMagnet Analysis', tempCanvas.width / 2, 40);
      
      ctx.font = '14px Arial';
      ctx.fillText(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, tempCanvas.width / 2, 60);
      ctx.fillText(`Total Score: ${pixelBins.reduce((sum, bin) => sum + bin.timeSpent, 0).toFixed(2)} points`, tempCanvas.width / 2, 80);
      ctx.fillText(`Max Score: ${maxScore.toFixed(2)} points`, tempCanvas.width / 2, 100);
      
      // Convert canvas to blob
      tempCanvas.toBlob(async (blob) => {
        if (blob) {
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `heatmagnet-analysis-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          console.log('📄 Heatmap downloaded successfully');
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('❌ Error generating heatmap:', error);
    }
  };

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
    <>
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
                    
                    {/* Method 2 Overlays */}
                    <HeatmapOverlay />
                    <GridOverlay />
                  </div>
                )}
              </div>
            )}
            
            {type === "scratch" && content && (
              <div className="relative">
                <TipTapContentViewer content={content} />
                {/* Method 2 Overlays */}
                <HeatmapOverlay />
                <GridOverlay />
              </div>
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
              <div className="relative">
                <div 
                  className="text-gray-800 text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
                {/* Method 2 Overlays */}
                <HeatmapOverlay />
                <GridOverlay />
              </div>
            )}
          </div>
        </div>
        
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {/* Content type removed */}
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Display - Now outside the frame */}
      {cta && (
        <div className="px-4 py-6 bg-white">
          <div className="bg-blue-600 text-white p-4 rounded-lg text-center">
            <h4 className="font-semibold text-lg mb-2">{cta.mainText}</h4>
            {cta.description && (
              <p className="text-blue-100 mb-3">{cta.description}</p>
            )}
            <a
              href={cta.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-gray-100 transition-colors"
              onClick={() => {
                console.log('🔘 CTA button clicked');
                if (activeAnalytics.trackCtaClickEvent) {
                  activeAnalytics.trackCtaClickEvent();
                }
              }}
            >
              {cta.buttonText}
            </a>
          </div>
        </div>
      )}
      
      {/* Sticky Analytics Button - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center gap-3">
          {/* Method 2 Tracking Controls */}
          {activeAnalytics.isTracking && (
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border">
              <button
                onClick={() => setShowPixelTracking(!showPixelTracking)}
                className={`text-xs px-2 py-1 rounded ${
                  showPixelTracking 
                    ? 'bg-red-100 text-red-700 border border-red-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                {showPixelTracking ? '🔥 Hide Heatmap' : '🔥 Show Heatmap'}
              </button>
              <button
                onClick={() => setShowGridOverlay(!showGridOverlay)}
                className={`text-xs px-2 py-1 rounded ${
                  showGridOverlay 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                {showGridOverlay ? '📐 Hide Grid' : '📐 Show Grid'}
              </button>
            </div>
          )}
          
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
          
          {/* Test Analytics Save Button */}
          <button
            onClick={() => {
              console.log("🧪 Test analytics save clicked!");
              activeAnalytics.stopTracking();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors shadow-lg"
          >
            <span>🧪</span>
            Test Save
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
          // CTA Tracking Data
          ctaClicks={activeAnalytics.ctaClicks || 0}
          // Method 2 Tracking Data
          pixelBins={pixelBins}
          heatmapData={heatmapData}
        />
      )}
    </>
  );
} 