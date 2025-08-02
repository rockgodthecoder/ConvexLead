"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface PDFAnalyticsTrackingProps {
    documentId: Id<'leadMagnets'>;
    containerRef: React.RefObject<HTMLElement | null>;
    userId?: string;
    enabled?: boolean;
    userEmail?: string;
}

interface ScrollEvent {
    timestamp: number;
    scrollTop: number;
    scrollPercentage: number;
    containerHeight: number;
    scrollHeight: number;
}

interface ScrollMetrics {
    maxScrollPercentage: number;
    currentScrollPercentage: number;
    containerHeight: number;
    scrollHeight: number;
}

interface DwellTimeData {
    [range: string]: number; // e.g., "0-10": 5000 (milliseconds)
}

export function usePDFAnalyticsTracking({
    documentId,
    containerRef,
    userId,
    enabled = true,
    userEmail
}: PDFAnalyticsTrackingProps) {
    const [browserId, setBrowserId] = useState<string>('');
    const [sessionId, setSessionId] = useState<string>('');
    const [isTracking, setIsTracking] = useState(false);
    const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
    const [timeOnPage, setTimeOnPage] = useState(0);
    const [shouldStop, setShouldStop] = useState(false);
    const [dwellTimeData, setDwellTimeData] = useState<DwellTimeData>({});

    // Refs for tracking
    const sessionStartTime = useRef<number>(0);
    const pausedTime = useRef<number>(0);
    const lastPauseStart = useRef<number>(0);
    const isTabVisibleRef = useRef(!document.hidden);
    const scrollEvents = useRef<ScrollEvent[]>([]);
    const scrollMetrics = useRef<ScrollMetrics>({
        maxScrollPercentage: 0,
        currentScrollPercentage: 0,
        containerHeight: 0,
        scrollHeight: 0
    });
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
        isTabVisibleRef.current = isVisible;

        if (!isTracking) return;

        const now = Date.now();

        if (isVisible) {
            if (lastPauseStart.current > 0) {
                pausedTime.current += now - lastPauseStart.current;
                lastPauseStart.current = 0;
            }
        } else {
            lastPauseStart.current = now;
        }
    }, [isTracking]);

    // Handle scroll events on the PDF container
    const handleScroll = useCallback(() => {
        if (!isTracking || !containerRef.current) return;

        const container = containerRef.current;
        const now = Date.now();
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const containerHeight = container.clientHeight;
        
        const scrollPercentage = scrollHeight > containerHeight 
            ? (scrollTop / (scrollHeight - containerHeight)) * 100 
            : 0;

        // Update scroll metrics
        scrollMetrics.current = {
            maxScrollPercentage: Math.max(scrollMetrics.current.maxScrollPercentage, scrollPercentage),
            currentScrollPercentage: scrollPercentage,
            containerHeight,
            scrollHeight
        };

        // Add scroll event
        const scrollEvent: ScrollEvent = {
            timestamp: now,
            scrollTop,
            scrollPercentage,
            containerHeight,
            scrollHeight
        };

        scrollEvents.current.push(scrollEvent);

        // Keep only last 100 events
        if (scrollEvents.current.length > 100) {
            scrollEvents.current = scrollEvents.current.slice(-100);
        }

        // Update dwell time
        if (lastScrollTimestamp.current > 0) {
            const timeDiff = now - lastScrollTimestamp.current;
            const range = Math.floor(lastScrollPercentage.current / 10) * 10;
            const key = `${range}-${range + 10}`;
            
            dwellTimeRef.current[key] = (dwellTimeRef.current[key] || 0) + timeDiff;
            setDwellTimeData({ ...dwellTimeRef.current });
        }

        lastScrollPercentage.current = scrollPercentage;
        lastScrollTimestamp.current = now;
        lastScrollTime.current = now;
    }, [isTracking, containerRef]);

    // Update time tracking
    const updateTimeTracking = useCallback(() => {
        if (!isTracking) return;

        const now = Date.now();
        const totalTime = now - sessionStartTime.current - pausedTime.current;
        setTimeOnPage(Math.floor(totalTime / 1000));

        // Stop after 90 seconds
        if (totalTime > 90000 && !shouldStop) {
            setShouldStop(true);
        }
    }, [isTracking, shouldStop]);

    // Update current dwell time
    const updateCurrentDwellTime = useCallback(() => {
        if (!isTracking || !isTabVisibleRef.current) return;

        const now = Date.now();
        if (lastScrollTimestamp.current > 0) {
            const timeDiff = now - lastScrollTimestamp.current;
            const range = Math.floor(lastScrollPercentage.current / 10) * 10;
            const key = `${range}-${range + 10}`;
            
            dwellTimeRef.current[key] = (dwellTimeRef.current[key] || 0) + timeDiff;
            setDwellTimeData({ ...dwellTimeRef.current });
        }
        lastScrollTimestamp.current = now;
    }, [isTracking]);

    // Start tracking
    const startTracking = useCallback(() => {
        if (isTracking) return;

        const browserId = initializeBrowserId();
        const sessionId = generateSessionId();
        
        sessionStartTime.current = Date.now();
        lastScrollTime.current = Date.now();
        lastScrollTimestamp.current = Date.now();
        lastScrollPercentage.current = 0;
        
        scrollEvents.current = [];
        dwellTimeRef.current = {};
        setDwellTimeData({});
        
        setIsTracking(true);
        
        console.log(`📊 PDF Analytics tracking started - Session: ${sessionId}, Browser: ${browserId}`);
    }, [isTracking, initializeBrowserId, generateSessionId]);

    // Send analytics data
    const sendAnalyticsData = useCallback(async () => {
        if (!isTracking) return;

        const now = Date.now();
        const finalTimeOnPage = Math.floor((now - sessionStartTime.current - pausedTime.current) / 1000);
        const finalScrollMetrics = scrollMetrics.current;

        try {
            const result = await saveSessionAnalytics({
                sessionId,
                documentId,
                browserId,
                userId,
                startTime: sessionStartTime.current,
                endTime: now,
                duration: finalTimeOnPage,
                maxScrollPercentage: finalScrollMetrics.maxScrollPercentage,
                scrollEvents: scrollEvents.current.map(event => ({
                    timestamp: event.timestamp,
                    scrollY: event.scrollTop,
                    scrollPercentage: event.scrollPercentage,
                    viewportHeight: event.containerHeight,
                    documentHeight: event.scrollHeight
                })),
                userAgent: navigator.userAgent,
                referrer: document.referrer || '',
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                email: userEmail
            });

            console.log(`✅ PDF Analytics saved to Convex - Session: ${sessionId}, Active time: ${finalTimeOnPage}s, Events: ${scrollEvents.current.length}, Max scroll: ${finalScrollMetrics.maxScrollPercentage}%`);

        } catch (error) {
            console.error('Failed to save PDF analytics data:', error);
        }
    }, [sessionId, browserId, documentId, userId, userEmail, saveSessionAnalytics]);

    // Stop tracking and send all data
    const stopTracking = useCallback(async () => {
        if (!isTracking) return;

        setIsTracking(false);
        await sendAnalyticsData();
    }, [isTracking, sendAnalyticsData]);

    // Initialize tracking
    useEffect(() => {
        if (enabled && documentId && containerRef.current) {
            startTracking();
        }

        return () => {
            stopTracking();
        };
    }, [documentId, enabled, startTracking, stopTracking, containerRef]);

    // Setup visibility change listener
    useEffect(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [handleVisibilityChange]);

    // Setup scroll listener on PDF container
    useEffect(() => {
        if (!isTracking || !containerRef.current) return;

        const container = containerRef.current;
        container.addEventListener('scroll', handleScroll, { passive: true });
        
        console.log('📊 PDF container scroll listener added');
        
        return () => {
            container.removeEventListener('scroll', handleScroll);
            console.log('📊 PDF container scroll listener removed');
        };
    }, [isTracking, handleScroll, containerRef]);

    // Periodic time updates
    useEffect(() => {
        if (!isTracking) return;

        const interval = setInterval(() => {
            updateTimeTracking();
            updateCurrentDwellTime();
        }, 1000);

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
        maxScrollPercentage: scrollMetrics.current.maxScrollPercentage,
        currentScrollPercentage: scrollMetrics.current.currentScrollPercentage,
        scrollEventsCount: scrollEvents.current.length,
        scrollRangeTimeData,
        startTracking,
        stopTracking
    };
} 