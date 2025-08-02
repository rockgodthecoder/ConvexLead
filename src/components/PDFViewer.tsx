import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { usePDFAnalyticsTracking } from '../hooks/use-pdf-analytics-tracking';
import { Id } from '../../convex/_generated/dataModel';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/build/pdf.worker.mjs";

interface PDFViewerProps {
  fileUrl: string;
  title?: string;
  className?: string;
  documentId?: Id<'leadMagnets'>;
  onScrollData?: (data: ScrollData) => void;
}

interface ScrollData {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  scrollPercentage: number;
  currentPage: number;
  totalPages: number;
  timeSpent: number;
  scrollSpeed: number;
}

interface RenderedPage {
  pageNum: number;
  canvas: HTMLCanvasElement;
  textContent?: any;
}

interface SectionTime {
  section: string;
  timeSpent: number;
  isActive: boolean;
}

export function PDFViewer({ fileUrl, title, className = "", documentId, onScrollData }: PDFViewerProps) {
  // Test PDF.js loading
  useEffect(() => {
    console.log("🔍 PDF.js test:", {
      pdfjsLib: typeof pdfjsLib,
      workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc,
      fileUrl
    });
  }, [fileUrl]);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);
  const [scale, setScale] = useState(1.5);
  const [showScrollOverlay, setShowScrollOverlay] = useState(false);
  const [scrollData, setScrollData] = useState<ScrollData>({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    scrollPercentage: 0,
    currentPage: 1,
    totalPages: 1,
    timeSpent: 0,
    scrollSpeed: 0
  });
  const [scrollHistory, setScrollHistory] = useState<Array<{timestamp: number, scrollTop: number}>>([]);
  const [sectionTimes, setSectionTimes] = useState<SectionTime[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startTime = useRef<number>(Date.now());

  // PDF-specific analytics tracking
  const pdfAnalytics = usePDFAnalyticsTracking({
    documentId: documentId || "temp" as any,
    containerRef,
    enabled: !!documentId
  });
  const lastScrollTime = useRef<number>(Date.now());
  const lastSectionUpdate = useRef<number>(Date.now());
  const currentSection = useRef<number>(0);

  // Initialize sections
  const initializeSections = () => {
    const sections: SectionTime[] = [];
    for (let i = 0; i < 10; i++) {
      sections.push({
        section: `${i * 10 + 1}-${(i + 1) * 10}%`,
        timeSpent: 0,
        isActive: false
      });
    }
    setSectionTimes(sections);
  };

  // Update section times based on current scroll position
  const updateSectionTimes = (scrollPercentage: number) => {
    const now = Date.now();
    const timeDiff = now - lastSectionUpdate.current;
    
    // Calculate which section we're in (0-9)
    const newSection = Math.floor(scrollPercentage / 10);
    
    // If we've moved to a new section, update the times
    if (newSection !== currentSection.current) {
      setSectionTimes(prev => {
        const updated = [...prev];
        
        // Add time to the previous section
        if (currentSection.current >= 0 && currentSection.current < 10) {
          updated[currentSection.current] = {
            ...updated[currentSection.current],
            timeSpent: updated[currentSection.current].timeSpent + timeDiff,
            isActive: false
          };
        }
        
        // Set new section as active
        if (newSection >= 0 && newSection < 10) {
          updated[newSection] = {
            ...updated[newSection],
            isActive: true
          };
        }
        
        return updated;
      });
      
      currentSection.current = newSection;
      lastSectionUpdate.current = now;
    } else {
      // We're still in the same section, just update the time
      setSectionTimes(prev => {
        const updated = [...prev];
        if (currentSection.current >= 0 && currentSection.current < 10) {
          updated[currentSection.current] = {
            ...updated[currentSection.current],
            timeSpent: updated[currentSection.current].timeSpent + timeDiff
          };
        }
        return updated;
      });
      lastSectionUpdate.current = now;
    }
  };

  // Load and convert PDF to HTML-friendly format
  const loadAndConvertPDF = async (url: string) => {
    try {
      console.log("🔄 Starting PDF conversion for:", url);
      setIsLoading(true);
      setHasError(false);
      startTime.current = Date.now();
      lastSectionUpdate.current = Date.now();
      currentSection.current = 0;
      setScrollHistory([]);
      initializeSections();

      // Load PDF document
      console.log("📄 Loading PDF with PDF.js...");
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      console.log("✅ PDF loaded successfully, pages:", pdf.numPages);
      setPdfDocument(pdf);

      // Convert all pages to HTML-friendly canvas elements
      console.log("🎨 Converting PDF pages to canvas...");
      await renderAllPages(pdf);
      console.log("✅ PDF conversion complete!");
      
    } catch (error) {
      console.error("❌ Error loading PDF:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert PDF pages to HTML canvas elements
  const renderAllPages = async (pdf: any) => {
    const pages: RenderedPage[] = [];
    
    // Get device pixel ratio for high DPI displays
    const pixelRatio = window.devicePixelRatio || 1;
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        
        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) continue;

        // Calculate viewport with device pixel ratio for crisp rendering
        const viewport = page.getViewport({ scale: scale * pixelRatio });
        
        // Set canvas size accounting for device pixel ratio
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Set display size (CSS pixels)
        canvas.style.height = `${viewport.height / pixelRatio}px`;
        canvas.style.width = `${viewport.width / pixelRatio}px`;
        canvas.style.marginBottom = '20px';
        canvas.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        canvas.style.borderRadius = '8px';

        // Scale the context to match the device pixel ratio
        context.scale(pixelRatio, pixelRatio);

        // Render page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: page.getViewport({ scale }), // Use original scale for viewport
        };

        await page.render(renderContext).promise;

        // Extract text content for analytics (optional)
        let textContent;
        try {
          textContent = await page.getTextContent();
        } catch (textError) {
          console.warn(`Could not extract text from page ${pageNum}:`, textError);
        }

        pages.push({ pageNum, canvas, textContent });
        
      } catch (error) {
        console.error(`Error rendering page ${pageNum}:`, error);
      }
    }
    
    setRenderedPages(pages);
  };

  // Load PDF when component mounts or fileUrl changes
  useEffect(() => {
    if (fileUrl) {
      loadAndConvertPDF(fileUrl);
    }
  }, [fileUrl]);

  // Re-render pages when scale changes
  useEffect(() => {
    if (pdfDocument) {
      renderAllPages(pdfDocument);
    }
  }, [scale, pdfDocument]);

  // Scroll tracking is now handled by usePDFAnalyticsTracking hook

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  };

  // Calculate reading speed
  const averageScrollSpeed = scrollHistory.length > 1 
    ? scrollHistory.reduce((acc, curr, i) => {
        if (i === 0) return 0;
        const prev = scrollHistory[i - 1];
        const timeDiff = curr.timestamp - prev.timestamp;
        const scrollDiff = Math.abs(curr.scrollTop - prev.scrollTop);
        return acc + (timeDiff > 0 ? scrollDiff / timeDiff : 0);
      }, 0) / (scrollHistory.length - 1) * 1000
    : 0;

  // Format time in MM:SS
  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (hasError) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
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
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
      )}
      
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Converting PDF...</p>
            </div>
          </div>
        )}
        
        {!isLoading && renderedPages.length > 0 && (
          <div className="p-4">
            {/* PDF Pages Container */}
            <div 
              ref={containerRef}
              className="border rounded-lg bg-gray-50 max-h-[800px] overflow-y-auto relative"
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
              
              {/* Enhanced Sticky Scroll Data Overlay */}
              {showScrollOverlay && (
                <>
                  {console.log("🎯 Analytics overlay render check:", {
                    showScrollOverlay,
                    renderedPagesLength: renderedPages.length,
                    scrollData: scrollData
                  })}
                <div className="fixed top-4 right-4 bg-black/95 text-white p-4 rounded-lg font-mono text-xs max-w-[300px] z-50 shadow-lg border border-gray-600 max-h-[80vh] overflow-y-auto">
                  <div className="space-y-3">
                    <div className="border-b border-gray-600 pb-2">
                      <h4 className="font-bold text-blue-400 mb-2">📊 Reading Analytics</h4>
                    </div>
                    
                    {/* Current Progress */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>Progress:</span>
                        <span className="font-bold text-green-400">{scrollData.scrollPercentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Page:</span>
                        <span>{scrollData.currentPage} / {scrollData.totalPages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <span className={scrollData.scrollSpeed > 100 ? 'text-yellow-400' : 'text-gray-300'}>
                          {Math.round(scrollData.scrollSpeed)} px/s
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Time:</span>
                        <span>{Math.floor(scrollData.timeSpent / 60)}:{(scrollData.timeSpent % 60).toString().padStart(2, '0')}</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-100"
                        style={{ width: `${scrollData.scrollPercentage}%` }}
                      />
                    </div>
                    
                    {/* Section Time Tracking */}
                    <div className="border-t border-gray-600 pt-2">
                      <h5 className="font-bold text-yellow-400 mb-2 text-xs">⏱️ Section Times</h5>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {sectionTimes.map((section, index) => (
                          <div 
                            key={index} 
                            className={`flex justify-between items-center text-xs p-1 rounded ${
                              section.isActive 
                                ? 'bg-blue-600/30 border border-blue-400' 
                                : section.timeSpent > 0 
                                  ? 'bg-gray-700/30' 
                                  : 'text-gray-500'
                            }`}
                          >
                            <span className="font-mono">{section.section}</span>
                            <span className={section.isActive ? 'text-yellow-300 font-bold' : 'text-gray-300'}>
                              {formatTime(section.timeSpent)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Reading Speed */}
                    <div className="text-xs text-center pt-1 border-t border-gray-600">
                      <span className="text-gray-400">Avg Speed: </span>
                      <span className="font-bold">{Math.round(averageScrollSpeed)} px/s</span>
                    </div>
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          <span>PDF Viewer ({renderedPages.length} pages)</span>
        </div>
      </div>
    </div>
  );
} 