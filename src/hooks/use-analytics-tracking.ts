"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface AnalyticsTrackingProps {
    documentId: Id<'leadMagnets'>;
    userId?: string;
    enabled?: boolean;
    userEmail?: string;
    containerRef?: React.RefObject<HTMLElement | null>; // Optional container ref for PDF/scratch content
}

interface ScrollEvent {
    timestamp: number;
    scrollY: number;
    scrollPercentage: number;
    viewportHeight: number;
    documentHeight: number;
}

interface ScrollMetrics {
    maxScrollPercentage: number;
    currentScrollPercentage: number;
    documentHeight: number;
    viewportHeight: number;
}

interface DwellTimeData {
    [range: string]: number; // e.g., "0-10": 5000 (milliseconds)
}

// Method 2 Tracking Interfaces
interface PixelBin {
    y: number;
    timeSpent: number;
    isActive: boolean;
}

interface HeatmapData {
    pixelBins: PixelBin[];
    activeBinIndex: number | null;
}

export function useAnalyticsTracking({
    documentId,
    userId,
    enabled = true,
    userEmail,
    containerRef
}: AnalyticsTrackingProps) {
    const [browserId, setBrowserId] = useState<string>('');
    const [sessionId, setSessionId] = useState<string>('');
    const [isTracking, setIsTracking] = useState(false);
    const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
    const [timeOnPage, setTimeOnPage] = useState(0);
    const [shouldStop, setShouldStop] = useState(false);
    const [dwellTimeData, setDwellTimeData] = useState<DwellTimeData>({});
    const [scrollMetrics, setScrollMetrics] = useState<ScrollMetrics>({
        maxScrollPercentage: 0,
        currentScrollPercentage: 0,
        documentHeight: 0,
        viewportHeight: 0
    });
    const [scrollEventsCount, setScrollEventsCount] = useState(0);

    // Method 2 Tracking State
    const [pixelBins, setPixelBins] = useState<PixelBin[]>([]);
    const [heatmapData, setHeatmapData] = useState<HeatmapData>({
        pixelBins: [],
        activeBinIndex: null
    });
    const [showGridOverlay, setShowGridOverlay] = useState(false);
    const [showPixelTracking, setShowPixelTracking] = useState(false);

    // Refs for tracking
    const sessionStartTime = useRef<number>(0);
    const pausedTime = useRef<number>(0); // Track total time when tab was hidden
    const lastPauseStart = useRef<number>(0); // When current pause started
    const isTabVisibleRef = useRef(!document.hidden); // Ref to avoid dependency issues
    const scrollEvents = useRef<ScrollEvent[]>([]);
    const lastScrollTime = useRef<number>(0);
    const dwellTimeRef = useRef<DwellTimeData>({});
    const lastScrollPercentage = useRef<number>(0);
    const lastScrollTimestamp = useRef<number>(0);
    const hasSubmittedData = useRef<boolean>(false); // Prevent multiple submissions

    // Method 2 Tracking Refs
    const animationFrame = useRef<number>(0);
    const lastBinUpdate = useRef<number>(Date.now());
    const currentBin = useRef<number>(0);
    const pixelBinsRef = useRef<PixelBin[]>([]);
    const totalHeight = useRef<number>(0);
    const binSize = useRef<number>(25); // 25px bins like Method 2
    const isTrackingRef = useRef<boolean>(false); // Ref to track tracking state
    
    // CTA Tracking Refs
    const ctaClicks = useRef<number>(0);
    
    // Refs to store current values for unload handler
    const sessionIdRef = useRef<string>('');
    const browserIdRef = useRef<string>('');
    const documentIdRef = useRef<Id<'leadMagnets'> | undefined>(undefined);
    const userIdRef = useRef<string | undefined>(undefined);
    const userEmailRef = useRef<string | undefined>(undefined);
    const scrollMetricsRef = useRef<ScrollMetrics>(scrollMetrics);

    // Convex action for sending complete session data
    const saveSessionAnalytics = useAction(api.analytics.saveCompleteSession);
    const trackCtaClick = useMutation(api.analytics.trackCtaClick);

    // Generate or retrieve browser ID
    const initializeBrowserId = useCallback(() => {
        const stored = localStorage.getItem('heatmagnet_browser_id');
        if (stored) {
            setBrowserId(stored);
            browserIdRef.current = stored;
            return stored;
        }

        // Generate new browser ID: timestamp + random
        const newBrowserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('heatmagnet_browser_id', newBrowserId);
        setBrowserId(newBrowserId);
        browserIdRef.current = newBrowserId;
        return newBrowserId;
    }, []);

    // Generate session ID
    const generateSessionId = useCallback(() => {
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        sessionIdRef.current = newSessionId;
        return newSessionId;
    }, []);

    // Handle tab visibility changes
    const handleVisibilityChange = useCallback(() => {
        const isVisible = !document.hidden;
        const wasVisible = isTabVisibleRef.current;
        setIsTabVisible(isVisible);
        isTabVisibleRef.current = isVisible; // Update ref too

        if (!isTrackingRef.current) return;

        if (isVisible && !wasVisible) {
            // Tab became visible - resume tracking
            console.log('📱 Tab visible - resuming analytics tracking');
            // Calculate how long we were paused and add to paused time
            if (lastPauseStart.current > 0) {
                const pauseDuration = Date.now() - lastPauseStart.current;
                pausedTime.current += pauseDuration;
                lastPauseStart.current = 0; // Reset pause start
                console.log(`📱 Resume: Added ${pauseDuration}ms to paused time. Total paused: ${pausedTime.current}ms`);
            }
        } else if (!isVisible && wasVisible) {
            // Tab became hidden - pause tracking
            console.log('📱 Tab hidden - pausing analytics tracking');
            lastPauseStart.current = Date.now();
        }
    }, []);

    // Helper function to get scroll range (0-10, 10-20, etc.)
    const getScrollRange = useCallback((scrollPercentage: number): string => {
        const range = Math.floor(scrollPercentage / 10) * 10;
        const nextRange = range + 10;
        return `${range}-${nextRange}`;
    }, []);

    // Update current dwell time for current scroll position
    const updateCurrentDwellTime = useCallback(() => {
        if (!isTrackingRef.current || !isTabVisibleRef.current) return;

        const now = Date.now();
        const dwellTime = now - lastScrollTimestamp.current;
        const currentRange = getScrollRange(lastScrollPercentage.current);
        
        if (currentRange) {
            dwellTimeRef.current[currentRange] = (dwellTimeRef.current[currentRange] || 0) + dwellTime;
            setDwellTimeData({ ...dwellTimeRef.current });
        }
        
        // Reset the timestamp for the next interval
        lastScrollTimestamp.current = now;
    }, [getScrollRange]);

    // Update time on page (only when tab is visible, cap at 90s)
    const updateTimeTracking = useCallback(() => {
        console.log(`⏱️ updateTimeTracking called - isTracking: ${isTrackingRef.current}, sessionStartTime: ${sessionStartTime.current}`);
        
        if (!sessionStartTime.current) {
            console.log('⏱️ No session start time, skipping update');
            return;
        }

        const currentTime = Date.now();
        let totalElapsed = currentTime - sessionStartTime.current;

        // If tab is currently hidden, calculate paused time up to now
        if (!isTabVisibleRef.current && lastPauseStart.current > 0) {
            const currentPauseDuration = currentTime - lastPauseStart.current;
            totalElapsed -= currentPauseDuration;
        }

        // Subtract total paused time from elapsed time
        totalElapsed -= pausedTime.current;

        // Calculate active time (excluding paused time)
        const newTimeOnPage = Math.round(totalElapsed / 1000);

        // Cap at 90 seconds - stop tracking once we hit the limit
        if (newTimeOnPage >= 90) {
            setTimeOnPage(90);
            if (isTrackingRef.current) {
                console.log('⏱️ Reached 90s tracking limit - stopping analytics');
                setShouldStop(true);
            }
            return;
        }

        // Don't show negative time
        const displayTime = Math.max(0, newTimeOnPage);
        
        console.log(`⏱️ Updating time on page: ${displayTime}s (active time, paused: ${pausedTime.current}ms, isTracking: ${isTrackingRef.current})`);
        setTimeOnPage(displayTime);
    }, []);

    // Method 2 Tracking Functions
    const initializePixelBins = useCallback((height: number) => {
        console.log('🎯 initializePixelBins called with height:', height);
        
        totalHeight.current = height;
        const numBins = Math.ceil(height / binSize.current);
        const bins: PixelBin[] = [];
        
        for (let i = 0; i < numBins; i++) {
            bins.push({
                y: i * binSize.current,
                timeSpent: 0,
                isActive: false
            });
        }
        
        setPixelBins(bins);
        pixelBinsRef.current = bins;
        console.log(`🎯 Initialized ${numBins} pixel bins for height ${height}px`);
    }, []);

    const updatePixelBins = useCallback(() => {
        console.log('🎯 updatePixelBins called:', {
            isTracking: isTrackingRef.current,
            isTabVisible: isTabVisibleRef.current,
            pixelBinsLength: pixelBinsRef.current.length
        });
        
        if (!isTrackingRef.current || !isTabVisibleRef.current || pixelBinsRef.current.length === 0) {
            console.log('🎯 updatePixelBins returning early:', {
                isTracking: isTrackingRef.current,
                isTabVisible: isTabVisibleRef.current,
                pixelBinsLength: pixelBinsRef.current.length
            });
            return;
        }

        const now = Date.now();
        const timeDiff = now - lastBinUpdate.current;
        
        // Use entire webpage scroll position and viewport (like PDF-HTML Method 2)
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        const viewportHeight = window.innerHeight;
        
        const binSize = 25;
        const viewportStart = scrollY;
        const viewportEnd = scrollY + viewportHeight;
        const viewportCenter = scrollY + viewportHeight / 2;
        
        console.log('📍 Scroll tracking:', { scrollY, viewportCenter });
        
        // Find which bin the viewport center is in (for entire webpage)
        const centerBinIndex = Math.floor(viewportCenter / binSize);
        
        // Update bins with the same logic as PDF-HTML Method 2
        const updatedBins = pixelBinsRef.current.map((bin, index) => {
            const binStart = bin.y;
            const binEnd = bin.y + binSize;
            
            // Check if this bin is visible in viewport (for entire webpage)
            if (binStart < viewportEnd && binEnd > viewportStart) {
                // Calculate distance from viewport center for bell curve weightage
                const binCenter = bin.y + binSize / 2; // Center of 25px bin
                const distanceFromCenter = Math.abs(binCenter - viewportCenter);
                
                // Apply bell curve weightage based on distance (exactly like PDF-HTML)
                let weightageMultiplier = 0.25; // minimum weightage
                
                if (distanceFromCenter <= 100) {
                    weightageMultiplier = 0.75; // center bins (highest)
                } else if (distanceFromCenter <= 200) {
                    weightageMultiplier = 0.5; // middle bins
                } else if (distanceFromCenter <= 300) {
                    weightageMultiplier = 0.25; // edge bins
                } else {
                    weightageMultiplier = 0.25; // far edge bins (lowest)
                }
                
                // Add scoring points based on bell curve weightage (exactly like PDF-HTML)
                const weightagePerSecond = 1.0; // 1 scoring point per second at center
                const scoringPoints = (timeDiff / 1000) * weightagePerSecond * weightageMultiplier;
                
                return {
                    ...bin,
                    timeSpent: bin.timeSpent + scoringPoints, // Using timeSpent field for scoring
                    isActive: index === centerBinIndex
                };
            } else {
                // Bin not visible, keep existing score but mark as inactive
                return {
                    ...bin,
                    isActive: false
                };
            }
        });
        
        // Update state and refs
        setPixelBins(updatedBins);
        pixelBinsRef.current = updatedBins;
        lastBinUpdate.current = now;
        
        // Update heatmap data
        const totalScore = updatedBins.reduce((sum, bin) => sum + bin.timeSpent, 0);
        const maxScore = Math.max(...updatedBins.map(bin => bin.timeSpent));
        
        console.log('🎯 Updated bins:', {
            totalScore,
            maxScore,
            activeBinIndex: centerBinIndex,
            viewportCenter,
            binSize,
            binsWithData: updatedBins.filter(bin => bin.timeSpent > 0).length
        });
        
        // Debug: Log active bin changes
        console.log('🎯 Active bin:', centerBinIndex, 'at position:', `${centerBinIndex * 25}-${(centerBinIndex + 1) * 25}px`);
        
        setHeatmapData({
            pixelBins: updatedBins,
            activeBinIndex: centerBinIndex
        });
    }, [containerRef]);

    const startMethod2Tracking = useCallback(() => {
        console.log('🎯 startMethod2Tracking called');
        
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
        }
        
        const animate = () => {
            updatePixelBins();
            animationFrame.current = requestAnimationFrame(animate);
        };
        
        animationFrame.current = requestAnimationFrame(animate);
        console.log('🎯 Method 2 tracking started with animation frame:', animationFrame.current);
    }, [updatePixelBins]);

    const stopMethod2Tracking = useCallback(() => {
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
            animationFrame.current = 0;
        }
        console.log('🎯 Method 2 tracking stopped');
    }, []);

    // Start tracking session
    const startTracking = useCallback(() => {
        console.log(`🚀 startTracking called - enabled: ${enabled}, isTracking: ${isTracking}`);
        
        if (!enabled || isTracking) {
            console.log(`🚀 startTracking skipped - enabled: ${enabled}, isTracking: ${isTracking}`);
            return;
        }

        const browserIdValue = initializeBrowserId();
        const sessionIdValue = generateSessionId();
        const now = Date.now();

        sessionStartTime.current = now;
        pausedTime.current = 0;
        lastPauseStart.current = 0;
        hasSubmittedData.current = false; // Reset submission flag for new session
        setShouldStop(false);
        setIsTracking(true);
        isTrackingRef.current = true; // Set the ref immediately

        // If tab is hidden when tracking starts, begin pause immediately
        if (!isTabVisibleRef.current) {
            lastPauseStart.current = now;
        }

        console.log(`🚀 Analytics tracking started - Browser: ${browserIdValue}, Session: ${sessionIdValue}, isTracking will be: true`);
        
        // Start Method 2 tracking - use entire webpage height like Method 2 in PDF-HTML
        console.log('🎯 Starting Method 2 tracking with entire webpage height');
        
        // Function to calculate and initialize pixel bins with full height
        const initializeWithFullHeight = () => {
            // Try multiple methods to get the full webpage height
            const scrollHeight = document.documentElement.scrollHeight;
            const bodyScrollHeight = document.body.scrollHeight;
            const bodyOffsetHeight = document.body.offsetHeight;
            const documentElementOffsetHeight = document.documentElement.offsetHeight;
            
            console.log('🎯 Height calculations:', {
                scrollHeight,
                bodyScrollHeight,
                bodyOffsetHeight,
                documentElementOffsetHeight
            });
            
            // Use the maximum of all height calculations to ensure we get the full height
            const totalHeight = Math.max(scrollHeight, bodyScrollHeight, bodyOffsetHeight, documentElementOffsetHeight);
            console.log('🎯 Using total webpage height:', totalHeight);
            
            initializePixelBins(totalHeight);
        };
        
        // Initialize immediately
        initializeWithFullHeight();
        
        // Also try again after a short delay to catch any late-loading content
        setTimeout(() => {
            console.log('🎯 Recalculating height after delay...');
            initializeWithFullHeight();
        }, 1000);
        
        startMethod2Tracking();
    }, [enabled, isTracking, initializeBrowserId, generateSessionId, containerRef, initializePixelBins, startMethod2Tracking]);

    // Send all analytics data to backend
    const sendAnalyticsData = useCallback(async () => {
        console.log('📊 sendAnalyticsData called with:', {
            sessionId,
            browserId,
            hasSubmittedData: hasSubmittedData.current,
            documentId,
            userId,
            userEmail
        });
        
        if (!sessionId || !browserId || hasSubmittedData.current) {
            console.log('📊 Analytics data already submitted or missing data, skipping submission');
            return;
        }

        // Set flag immediately to prevent duplicate submissions
        hasSubmittedData.current = true;
        console.log('📊 Set hasSubmittedData to true to prevent duplicates');

        // Calculate final active time on page (excluding paused time)
        const currentTime = Date.now();
        let totalElapsed = sessionStartTime.current
            ? currentTime - sessionStartTime.current
            : 0;

        // If tab is currently hidden, calculate paused time up to now
        if (!isTabVisibleRef.current && lastPauseStart.current > 0) {
            const currentPauseDuration = currentTime - lastPauseStart.current;
            totalElapsed -= currentPauseDuration;
        }

        // Subtract total paused time from elapsed time
        totalElapsed -= pausedTime.current;

        const finalTimeOnPage = Math.max(0, Math.round(totalElapsed / 1000));

        // Get final scroll data
        const finalScrollMetrics = scrollMetrics;
        const finalScrollEvents = scrollEvents.current;

        try {
            // Save pixel bin data to localStorage (like PDF-HTML Method 2)
            const analyticsData = {
                pixelBins: pixelBinsRef.current,
                timestamp: Date.now(),
                sessionId,
                documentId,
                duration: finalTimeOnPage,
                maxScrollPercentage: finalScrollMetrics.maxScrollPercentage
            };
            
            // Store in localStorage for analytics page to access
            localStorage.setItem('heatmagnet-analytics-data', JSON.stringify(analyticsData));
            console.log('💾 Saved analytics data to localStorage:', analyticsData);

            // Send complete analytics session to Convex
            const analyticsPayload = {
                sessionId,
                documentId,
                browserId,
                userId,
                startTime: sessionStartTime.current,
                endTime: Date.now(),
                duration: finalTimeOnPage, // Only active time, not total elapsed time
                maxScrollPercentage: finalScrollMetrics.maxScrollPercentage,
                scrollEvents: finalScrollEvents,
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                email: userEmail, // Assuming userId is the userEmail for now
                ctaClicks: ctaClicks.current,
                pixelBins: pixelBinsRef.current.map(bin => ({
                    y: bin.y,
                    timeSpent: bin.timeSpent
                    // Remove isActive - not needed for analytics
                })) // Method 2 pixel bin data
            };

            console.log('📊 About to save analytics session with payload:', analyticsPayload);
            console.log('📊 Calling saveSessionAnalytics with sessionId:', sessionId);
            
            const result = await saveSessionAnalytics(analyticsPayload);
            console.log('📊 saveSessionAnalytics result:', result);

            console.log(`✅ Analytics saved to Convex - Session: ${sessionId}, Active time: ${finalTimeOnPage}s, Events: ${finalScrollEvents.length}, Max scroll: ${finalScrollMetrics.maxScrollPercentage}%`);

        } catch (error) {
            console.error('❌ Failed to save analytics data:', error);
            console.error('❌ Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                sessionId,
                browserId,
                documentId
            });
        }
    }, [sessionId, browserId, documentId, userId, saveSessionAnalytics, userEmail, scrollMetrics]);

    // Stop tracking and send all data
    const stopTracking = useCallback(async () => {
        console.log(`📊 Stop tracking called - isTracking: ${isTracking}, hasSubmittedData: ${hasSubmittedData.current}`);
        
        if (!isTracking || hasSubmittedData.current) {
            console.log('📊 Stop tracking called but already stopped or data submitted');
            return;
        }

        setIsTracking(false);
        isTrackingRef.current = false; // Set the ref to false
        console.log('📊 Setting isTracking to false, about to send analytics data');

        // Stop Method 2 tracking
        stopMethod2Tracking();

        // Send all analytics data
        await sendAnalyticsData();
    }, [isTracking, sendAnalyticsData, stopMethod2Tracking]);

    // Initialize tracking
    useEffect(() => {
        console.log(`🔧 Initialize tracking effect - enabled: ${enabled}, documentId: ${documentId}`);
        
        if (enabled && documentId) {
            console.log('🔧 Calling startTracking...');
            startTracking();
        }

        // Don't call stopTracking in cleanup - let pagehide handle it
        return () => {
            console.log('🔧 Cleanup - not calling stopTracking (pagehide will handle it)');
        };
    }, [documentId, enabled, startTracking]);

    // Update refs when values change
    useEffect(() => {
        documentIdRef.current = documentId;
        userIdRef.current = userId;
        userEmailRef.current = userEmail;
        scrollMetricsRef.current = scrollMetrics;
    }, [documentId, userId, userEmail, scrollMetrics]);



    // Setup visibility change listener
    useEffect(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [handleVisibilityChange]);

    // Setup scroll listener - only run once when component mounts
    useEffect(() => {
        const handleScrollEvent = () => {
            // Don't track scroll events when tab is hidden or not tracking
            if (!isTabVisibleRef.current || !isTrackingRef.current) return;
            
            if (containerRef?.current) {
                // Use container scroll if available (for PDF/scratch content)
                const container = containerRef.current;
                const scrollTop = container.scrollTop;
                const containerHeight = container.clientHeight;
                const scrollHeight = container.scrollHeight;
                const scrollPercentage = Math.round((scrollTop / (scrollHeight - containerHeight)) * 100);
                const clampedScrollPercentage = Math.min(100, Math.max(0, scrollPercentage));
                
                const now = Date.now();
                
                // Add scroll event
                const scrollEvent: ScrollEvent = {
                    timestamp: now,
                    scrollY: scrollTop,
                    scrollPercentage: clampedScrollPercentage,
                    viewportHeight: containerHeight,
                    documentHeight: scrollHeight
                };
                scrollEvents.current.push(scrollEvent);
                setScrollEventsCount(scrollEvents.current.length);

                // Update scroll metrics
                setScrollMetrics(prev => ({
                    currentScrollPercentage: clampedScrollPercentage,
                    maxScrollPercentage: Math.max(prev.maxScrollPercentage, clampedScrollPercentage),
                    documentHeight: scrollHeight,
                    viewportHeight: containerHeight
                }));
            } else {
                // Use window scroll (for regular content)
                const scrollY = window.scrollY;
                const viewportHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;
                const scrollPercentage = Math.round((scrollY / (documentHeight - viewportHeight)) * 100);
                const clampedScrollPercentage = Math.min(100, Math.max(0, scrollPercentage));

                // Throttle scroll events (max once per 100ms)
                const now = Date.now();
                if (now - lastScrollTime.current < 100) return;
                lastScrollTime.current = now;

                // Add scroll event to array
                const scrollEvent: ScrollEvent = {
                    timestamp: now,
                    scrollY,
                    scrollPercentage: clampedScrollPercentage,
                    viewportHeight,
                    documentHeight
                };
                scrollEvents.current.push(scrollEvent);
                setScrollEventsCount(scrollEvents.current.length);

                // Update scroll metrics for quick access
                setScrollMetrics(prev => ({
                    currentScrollPercentage: clampedScrollPercentage,
                    maxScrollPercentage: Math.max(prev.maxScrollPercentage, clampedScrollPercentage),
                    documentHeight,
                    viewportHeight
                }));

                console.log(`📊 Scroll update - Current: ${clampedScrollPercentage}%, Max: ${Math.max(scrollMetrics.maxScrollPercentage, clampedScrollPercentage)}%, Events: ${scrollEvents.current.length + 1}`);
            }

            // Update dwell time for current position (only if tab is visible)
            if (isTabVisibleRef.current) {
                const currentRange = getScrollRange(scrollMetrics.currentScrollPercentage);
                if (currentRange) {
                    const now = Date.now();
                    const dwellTime = now - lastScrollTimestamp.current;
                    dwellTimeRef.current[currentRange] = (dwellTimeRef.current[currentRange] || 0) + dwellTime;
                    setDwellTimeData({ ...dwellTimeRef.current });
                }
                
                // Update last scroll tracking
                lastScrollPercentage.current = scrollMetrics.currentScrollPercentage;
                lastScrollTimestamp.current = Date.now();
            }
        };

        if (containerRef?.current) {
            // Use container scroll for PDF/scratch content
            const container = containerRef.current;
            container.addEventListener('scroll', handleScrollEvent, { passive: true });
            console.log('📊 Container scroll listener added');
            
            return () => {
                container.removeEventListener('scroll', handleScrollEvent);
                console.log('📊 Container scroll listener removed');
            };
        } else {
            // Use window scroll for regular content
            window.addEventListener('scroll', handleScrollEvent, { passive: true });
            console.log('📊 Window scroll listener added');
            
            return () => {
                window.removeEventListener('scroll', handleScrollEvent);
                console.log('📊 Window scroll listener removed');
            };
        }
    }, [containerRef, getScrollRange]); // Only depend on containerRef and getScrollRange

    // Periodic time updates (no data flushing - only on unload)
    useEffect(() => {
        const interval = setInterval(() => {
            // Only update if tracking is active
            if (isTrackingRef.current) {
                updateTimeTracking();
                updateCurrentDwellTime(); // Update dwell time every second
            }
        }, 1000); // Update time every second

        return () => clearInterval(interval);
    }, []); // Empty dependency array - only run once

    // Handle 90s limit reached
    useEffect(() => {
        if (shouldStop && isTrackingRef.current && !hasSubmittedData.current) {
            console.log('📊 90s limit reached, calling stopTracking');
            stopTracking();
            setShouldStop(false);
        } else if (shouldStop && hasSubmittedData.current) {
            console.log('📊 90s limit reached but data already submitted, just stopping');
            setIsTracking(false);
            setShouldStop(false);
        }
    }, [shouldStop]); // Only depend on shouldStop

    // Cleanup on page unload - use pagehide with sendBeacon for best reliability
    useEffect(() => {
        const saveAnalyticsOnPageHide = (event: PageTransitionEvent) => {
            console.log(`📊 Pagehide event triggered - hasSubmittedData: ${hasSubmittedData.current}, isTracking: ${isTrackingRef.current}`);
            console.log(`📊 Pagehide event details:`, {
                timestamp: new Date().toISOString(),
                sessionId: sessionIdRef.current,
                browserId: browserIdRef.current,
                documentId: documentIdRef.current,
                eventType: event.type,
                persisted: event.persisted
            });
            
            // Only save if we haven't already and we're tracking
            if (!hasSubmittedData.current && isTrackingRef.current) {
                console.log('📊 Saving analytics data on pagehide');
                hasSubmittedData.current = true; // Set flag immediately
                
                // Stop tracking
                setIsTracking(false);
                isTrackingRef.current = false;
                stopMethod2Tracking();
                
                // Calculate final active time on page (excluding paused time)
                const currentTime = Date.now();
                let totalElapsed = sessionStartTime.current
                    ? currentTime - sessionStartTime.current
                    : 0;

                // If tab is currently hidden, calculate paused time up to now
                if (!isTabVisibleRef.current && lastPauseStart.current > 0) {
                    const currentPauseDuration = currentTime - lastPauseStart.current;
                    totalElapsed -= currentPauseDuration;
                }

                // Subtract total paused time from elapsed time
                totalElapsed -= pausedTime.current;

                const finalTimeOnPage = Math.max(0, Math.round(totalElapsed / 1000));

                // Get final scroll data
                const finalScrollMetrics = scrollMetricsRef.current;
                const finalScrollEvents = scrollEvents.current;

                try {
                    // Save pixel bin data to localStorage (like PDF-HTML Method 2)
                    const analyticsData = {
                        pixelBins: pixelBinsRef.current.map(bin => ({
                            y: bin.y,
                            timeSpent: bin.timeSpent
                            // Remove isActive - not needed for analytics
                        })),
                        timestamp: Date.now(),
                        sessionId: sessionIdRef.current,
                        documentId: documentIdRef.current,
                        duration: finalTimeOnPage,
                        maxScrollPercentage: finalScrollMetrics.maxScrollPercentage
                    };
                    
                    // Store in localStorage for analytics page to access
                    localStorage.setItem('heatmagnet-analytics-data', JSON.stringify(analyticsData));
                    console.log('💾 Saved analytics data to localStorage (pagehide):', analyticsData);

                    // Prepare analytics data
                    const analyticsPayload = {
                        sessionId: sessionIdRef.current,
                        documentId: documentIdRef.current!,
                        browserId: browserIdRef.current,
                        userId: userIdRef.current,
                        startTime: sessionStartTime.current,
                        endTime: Date.now(),
                        duration: finalTimeOnPage,
                        maxScrollPercentage: finalScrollMetrics.maxScrollPercentage,
                        scrollEvents: finalScrollEvents,
                        userAgent: navigator.userAgent,
                        viewport: {
                            width: window.innerWidth,
                            height: window.innerHeight
                        },
                        email: userEmailRef.current,
                        ctaClicks: ctaClicks.current,
                        pixelBins: pixelBinsRef.current.map(bin => ({
                            y: bin.y,
                            timeSpent: bin.timeSpent
                            // Remove isActive - not needed for analytics
                        }))
                    };

                    console.log('📊 About to save analytics session (pagehide) with payload:', analyticsPayload);
                    console.log('📊 Session ID:', sessionIdRef.current, 'Browser ID:', browserIdRef.current, 'Document ID:', documentIdRef.current);

                    // Use sendBeacon for reliable data transmission on page unload
                    if (navigator.sendBeacon) {
                        const beaconData = new Blob([JSON.stringify(analyticsPayload)], {
                            type: 'application/json'
                        });
                        
                        const beaconUrl = '/api/analytics/beacon'; // You'll need to create this endpoint
                        const beaconSuccess = navigator.sendBeacon(beaconUrl, beaconData);
                        
                        if (beaconSuccess) {
                            console.log('✅ Analytics sent via sendBeacon - Session:', sessionIdRef.current);
                        } else {
                            console.warn('⚠️ sendBeacon failed, falling back to fetch');
                            // Fallback to fetch with keepalive
                            fetch('/api/analytics/beacon', {
                                method: 'POST',
                                body: JSON.stringify(analyticsPayload),
                                headers: { 'Content-Type': 'application/json' },
                                keepalive: true
                            }).catch(error => {
                                console.error('❌ Fetch fallback also failed:', error);
                            });
                        }
                    } else {
                        console.warn('⚠️ sendBeacon not supported, using fetch with keepalive');
                        // Fallback for browsers that don't support sendBeacon
                        fetch('/api/analytics/beacon', {
                            method: 'POST',
                            body: JSON.stringify(analyticsPayload),
                            headers: { 'Content-Type': 'application/json' },
                            keepalive: true
                        }).catch(error => {
                            console.error('❌ Fetch fallback failed:', error);
                        });
                    }

                    console.log(`✅ Analytics sent via pagehide - Session: ${sessionIdRef.current}, Active time: ${finalTimeOnPage}s, Events: ${finalScrollEvents.length}, Max scroll: ${finalScrollMetrics.maxScrollPercentage}%`);

                } catch (error) {
                    console.error('Failed to save analytics data (pagehide):', error);
                }
            } else {
                console.log('📊 Skipping analytics save - already submitted or not tracking');
            }
        };


        
        // Show popup when user tries to close tab
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            console.log('📊 Beforeunload event fired:', {
                isTracking: isTrackingRef.current,
                hasSubmittedData: hasSubmittedData.current,
                sessionId: sessionIdRef.current,
                documentId: documentIdRef.current
            });
            
            if (isTrackingRef.current && !hasSubmittedData.current) {
                // Show confirmation dialog
                event.preventDefault();
                event.returnValue = 'Are you sure you want to leave?';
                
                // Save analytics data when user confirms
                console.log('📊 User confirmed tab close - saving analytics data');
                hasSubmittedData.current = true;
                
                // Prepare analytics data (same as Test Save button)
                const analyticsPayload = {
                    sessionId: sessionIdRef.current,
                    documentId: documentIdRef.current!,
                    browserId: browserIdRef.current,
                    userId: userIdRef.current,
                    startTime: sessionStartTime.current,
                    endTime: Date.now(),
                    duration: Math.round((Date.now() - (sessionStartTime.current || Date.now())) / 1000),
                    maxScrollPercentage: scrollMetricsRef.current.maxScrollPercentage,
                    scrollEvents: scrollEvents.current,
                    userAgent: navigator.userAgent,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    email: userEmailRef.current,
                    ctaClicks: ctaClicks.current,
                    pixelBins: pixelBinsRef.current.map(bin => ({
                        y: bin.y,
                        timeSpent: bin.timeSpent
                        // Remove isActive - not needed for analytics
                    }))
                };

                console.log('📊 About to call saveSessionAnalytics with payload:', analyticsPayload);
                
                // Use the same action as Test Save button
                saveSessionAnalytics(analyticsPayload)
                    .then(result => {
                        console.log('✅ Analytics saved successfully via beforeunload:', result);
                    })
                    .catch(error => {
                        console.error('❌ Failed to save analytics via beforeunload:', error);
                    });
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Use pagehide as backup
        window.addEventListener('pagehide', saveAnalyticsOnPageHide);
        
        // Also try to save when the component unmounts
        return () => {
            console.log('📊 Component unmounting - attempting to save analytics');
            saveAnalyticsOnPageHide({} as PageTransitionEvent);
            
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', saveAnalyticsOnPageHide);
        };
    }, []); // Empty dependency array - only run once, using refs for current values

    // CTA Click Tracking Function
    const trackCtaClickEvent = useCallback(async () => {
        if (!isTrackingRef.current || !sessionIdRef.current || !documentIdRef.current || !browserIdRef.current) {
            console.log('⚠️ Cannot track CTA click - tracking not active or missing session data');
            return;
        }

        const clickTime = Date.now();
        ctaClicks.current += 1;

        console.log(`🔘 CTA click tracked - Session: ${sessionIdRef.current}, Total clicks: ${ctaClicks.current}`);

        try {
            await trackCtaClick({
                sessionId: sessionIdRef.current,
                documentId: documentIdRef.current,
                browserId: browserIdRef.current,
                clickTime
            });
            console.log('✅ CTA click saved to database');
        } catch (error) {
            console.error('❌ Failed to save CTA click:', error);
        }
    }, [trackCtaClick]);

    // At the end of the hook, before the return statement
    // Ensure all ranges 0-10, 10-20, ..., 90-100 are present in the data
    const scrollRangeTimeData: DwellTimeData = {};
    for (let i = 0; i < 100; i += 10) {
        const key = `${i}-${i + 10}`;
        scrollRangeTimeData[key] = dwellTimeData[key] || 0;
    }

    return {
        browserId,
        sessionId,
        isTracking,
        isTabVisible,
        timeOnPage,
        maxScrollPercentage: scrollMetrics.maxScrollPercentage,
        currentScrollPercentage: scrollMetrics.currentScrollPercentage,
        scrollEventsCount,
        scrollRangeTimeData,
        startTracking,
        stopTracking,
        // CTA Tracking
        trackCtaClickEvent,
        ctaClicks: ctaClicks.current,
        // Method 2 Tracking
        pixelBins,
        heatmapData,
        showGridOverlay,
        showPixelTracking,
        setShowGridOverlay,
        setShowPixelTracking,
        initializePixelBins,
        startMethod2Tracking,
        stopMethod2Tracking
    };
} 