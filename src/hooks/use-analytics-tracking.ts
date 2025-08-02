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

    // Convex action for sending complete session data
    const saveSessionAnalytics = useAction(api.analytics.saveCompleteSession);

    // Generate or retrieve browser ID
    const initializeBrowserId = useCallback(() => {
        const stored = localStorage.getItem('heatmagnet_browser_id');
        if (stored) {
            setBrowserId(stored);
            return stored;
        }

        // Generate new browser ID: timestamp + random
        const newBrowserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('heatmagnet_browser_id', newBrowserId);
        setBrowserId(newBrowserId);
        return newBrowserId;
    }, []);

    // Generate session ID
    const generateSessionId = useCallback(() => {
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        return newSessionId;
    }, []);

    // Handle tab visibility changes
    const handleVisibilityChange = useCallback(() => {
        const isVisible = !document.hidden;
        setIsTabVisible(isVisible);
        isTabVisibleRef.current = isVisible; // Update ref too

        if (!isTracking) return;

        if (isVisible) {
            // Tab became visible - resume tracking
            console.log('📱 Tab visible - resuming analytics tracking');
        } else {
            // Tab became hidden - pause tracking
            console.log('📱 Tab hidden - pausing analytics tracking');
        }
    }, [isTracking]);

    // Helper function to get scroll range (0-10, 10-20, etc.)
    const getScrollRange = useCallback((scrollPercentage: number): string => {
        const range = Math.floor(scrollPercentage / 10) * 10;
        const nextRange = range + 10;
        return `${range}-${nextRange}`;
    }, []);

    // Update current dwell time for current scroll position
    const updateCurrentDwellTime = useCallback(() => {
        if (!isTracking || !isTabVisibleRef.current) return;

        const now = Date.now();
        const dwellTime = now - lastScrollTimestamp.current;
        const currentRange = getScrollRange(lastScrollPercentage.current);
        
        if (currentRange) {
            dwellTimeRef.current[currentRange] = (dwellTimeRef.current[currentRange] || 0) + dwellTime;
            setDwellTimeData({ ...dwellTimeRef.current });
        }
        
        // Reset the timestamp for the next interval
        lastScrollTimestamp.current = now;
    }, [isTracking, getScrollRange]);

    // Update time on page (only when tab is visible, cap at 90s)
    const updateTimeTracking = useCallback(() => {
        console.log(`⏱️ updateTimeTracking called - isTracking: ${isTracking}, sessionStartTime: ${sessionStartTime.current}`);
        
        if (!sessionStartTime.current) {
            console.log('⏱️ No session start time, skipping update');
            return;
        }

        // Don't update timer when tab is hidden - freeze the display
        if (!isTabVisibleRef.current) {
            console.log('⏱️ Tab hidden, freezing timer');
            return;
        }

        const currentTime = Date.now();
        const totalElapsed = currentTime - sessionStartTime.current;

        // Simple elapsed time (no subtraction of paused time)
        const newTimeOnPage = Math.round(totalElapsed / 1000);

        // Cap at 90 seconds - stop tracking once we hit the limit
        if (newTimeOnPage >= 90) {
            setTimeOnPage(90);
            if (isTracking) {
                console.log('⏱️ Reached 90s tracking limit - stopping analytics');
                setShouldStop(true);
            }
            return;
        }

        console.log(`⏱️ Updating time on page: ${newTimeOnPage}s (isTracking: ${isTracking})`);
        setTimeOnPage(newTimeOnPage);
    }, [isTracking]);

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
        setShouldStop(false);
        setIsTracking(true);

        // If tab is hidden when tracking starts, begin pause immediately
        if (!isTabVisibleRef.current) {
            lastPauseStart.current = now;
        }

        console.log(`🚀 Analytics tracking started - Browser: ${browserIdValue}, Session: ${sessionIdValue}, isTracking will be: true`);
    }, [enabled, isTracking, initializeBrowserId, generateSessionId]);

    // Send all analytics data to backend
    const sendAnalyticsData = useCallback(async () => {
        if (!sessionId || !browserId) return;

        // Calculate final time on page (simple elapsed time)
        const currentTime = Date.now();
        const totalElapsed = sessionStartTime.current
            ? currentTime - sessionStartTime.current
            : 0;

        const finalTimeOnPage = Math.round(totalElapsed / 1000);

        // Get final scroll data
        const finalScrollMetrics = scrollMetrics;
        const finalScrollEvents = scrollEvents.current;

        try {
            // Send complete analytics session to Convex
            const result = await saveSessionAnalytics({
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
                referrer: document.referrer || '',
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                email: userEmail // Assuming userId is the userEmail for now
            });

            console.log(`✅ Analytics saved to Convex - Session: ${sessionId}, Active time: ${finalTimeOnPage}s, Events: ${finalScrollEvents.length}, Max scroll: ${finalScrollMetrics.maxScrollPercentage}%`);

        } catch (error) {
            console.error('Failed to save analytics data:', error);
        }
    }, [sessionId, browserId, documentId, userId, saveSessionAnalytics, userEmail, scrollMetrics]);

    // Stop tracking and send all data
    const stopTracking = useCallback(async () => {
        if (!isTracking) return;

        setIsTracking(false);

        // Send all analytics data
        await sendAnalyticsData();
    }, [isTracking, sendAnalyticsData]);

    // Initialize tracking
    useEffect(() => {
        console.log(`🔧 Initialize tracking effect - enabled: ${enabled}, documentId: ${documentId}`);
        
        if (enabled && documentId) {
            console.log('🔧 Calling startTracking...');
            startTracking();
        }

        return () => {
            console.log('🔧 Cleanup - calling stopTracking');
            stopTracking();
        };
    }, [documentId, enabled, startTracking, stopTracking]);

    // Setup visibility change listener
    useEffect(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [handleVisibilityChange]);

    // Setup scroll listener
    useEffect(() => {
        if (!isTracking) return;

        const handleScrollEvent = () => {
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
                setScrollMetrics({
                    currentScrollPercentage: clampedScrollPercentage,
                    maxScrollPercentage: Math.max(scrollMetrics.maxScrollPercentage, clampedScrollPercentage),
                    documentHeight: scrollHeight,
                    viewportHeight: containerHeight
                });
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
                setScrollMetrics({
                    currentScrollPercentage: clampedScrollPercentage,
                    maxScrollPercentage: Math.max(scrollMetrics.maxScrollPercentage, clampedScrollPercentage),
                    documentHeight,
                    viewportHeight
                });

                console.log(`📊 Scroll update - Current: ${clampedScrollPercentage}%, Max: ${Math.max(scrollMetrics.maxScrollPercentage, clampedScrollPercentage)}%, Events: ${scrollEvents.current.length + 1}`);
            }

            // Update dwell time for current position
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
    }, [isTracking, containerRef, scrollMetrics.maxScrollPercentage, getScrollRange]);

    // Periodic time updates (no data flushing - only on unload)
    useEffect(() => {
        if (!isTracking) return;

        const interval = setInterval(() => {
            updateTimeTracking();
            updateCurrentDwellTime(); // Update dwell time every second
        }, 1000); // Update time every second

        return () => clearInterval(interval);
    }, [isTracking, updateTimeTracking, updateCurrentDwellTime]);

    // Handle 90s limit reached
    useEffect(() => {
        if (shouldStop && isTracking) {
            stopTracking();
            setShouldStop(false);
        }
    }, [shouldStop, isTracking, stopTracking]);

    // Cleanup on page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            stopTracking();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [stopTracking]);

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
        stopTracking
    };
} 