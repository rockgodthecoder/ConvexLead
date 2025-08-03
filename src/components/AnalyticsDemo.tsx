"use client";

import { useEffect, useState } from 'react';

interface AnalyticsDemoProps {
    browserId: string;
    sessionId: string;
    timeOnPage: number;
    maxScrollPercentage: number;
    currentScrollPercentage: number;
    scrollEventsCount: number;
    isTracking: boolean;
    isTabVisible?: boolean;
    scrollRangeTimeData?: { [range: string]: number };
    // CTA Tracking Data
    ctaClicks?: number;
    // Method 2 Tracking Data
    pixelBins?: Array<{ y: number; timeSpent: number; isActive: boolean }>;
    heatmapData?: {
        activeBinIndex: number | null;
    };
}

export function AnalyticsDemo({
    browserId,
    sessionId,
    timeOnPage,
    maxScrollPercentage,
    currentScrollPercentage,
    scrollEventsCount,
    isTracking,
    isTabVisible = true,
    scrollRangeTimeData,
    // CTA Tracking Data
    ctaClicks = 0,
    // Method 2 Tracking Data
    pixelBins,
    heatmapData,
}: AnalyticsDemoProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [currentTime, setCurrentTime] = useState(timeOnPage);

    // Force update when timeOnPage changes
    useEffect(() => {
        setCurrentTime(timeOnPage);
    }, [timeOnPage]);

    // Real-time update mechanism
    useEffect(() => {
        if (!isTracking) return;

        const interval = setInterval(() => {
            // Force a re-render every second to show updated time
            setCurrentTime(prev => {
                const newTime = timeOnPage;
                if (newTime !== prev) {
                    console.log(`⏱️ AnalyticsDemo time update: ${prev}s → ${newTime}s`);
                }
                return newTime;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isTracking, timeOnPage]);

    // Debug logging to see if props are updating
    console.log("📊 AnalyticsDemo props update:", {
        timeOnPage,
        maxScrollPercentage,
        currentScrollPercentage,
        scrollEventsCount,
        isTracking,
        isTabVisible
    });

    // Show demo panel immediately
    // useEffect(() => {
    //     const timer = setTimeout(() => {
    //         setIsVisible(true);
    //     }, 3000);
    //     return () => clearTimeout(timer);
    // }, []);

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-xs backdrop-blur-sm border border-white/10 z-50">
            <div className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isTabVisible ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                📊 Analytics Tracking
                {!isTabVisible && (
                    <span className="text-yellow-400 text-[10px] ml-1">(PAUSED)</span>
                )}
            </div>
            
            <div className="space-y-1 text-white/80">
                <div className="flex justify-between">
                    <span>Browser ID:</span>
                    <span className="text-green-300">{browserId.split('_')[2]}</span>
                </div>
                <div className="flex justify-between">
                    <span>Session ID:</span>
                    <span className="text-blue-300">{sessionId.split('_')[2]}</span>
                </div>
                <div className="flex justify-between">
                    <span>Time on page:</span>
                    <span className={`${isTabVisible ? 'text-yellow-300' : 'text-yellow-500'}`}>
                        {currentTime}s {!isTabVisible && '(frozen)'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>Max scroll:</span>
                    <span className="text-purple-300">{maxScrollPercentage}%</span>
                </div>
                <div className="flex justify-between">
                    <span>Current scroll:</span>
                    <span className="text-cyan-300">{currentScrollPercentage}%</span>
                </div>
                <div className="flex justify-between">
                    <span>Scroll events:</span>
                    <span className="text-orange-300">{scrollEventsCount}</span>
                </div>
                <div className="flex justify-between">
                    <span>CTA clicks:</span>
                    <span className="text-pink-300">{ctaClicks}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tab status:</span>
                    <span className={isTabVisible ? 'text-green-300' : 'text-yellow-300'}>
                        {isTabVisible ? 'Active' : 'Hidden'}
                    </span>
                </div>
                
                {/* Method 2 Tracking Data */}
                {heatmapData && pixelBins && (
                    <>
                        <div className="flex justify-between">
                            <span>Total Score:</span>
                            <span className="text-red-300">{Math.round(pixelBins.reduce((sum, bin) => sum + bin.timeSpent, 0))}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Max Score:</span>
                            <span className="text-red-300">{Math.round(Math.max(...pixelBins.map(bin => bin.timeSpent)))}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Active Bin:</span>
                            <span className="text-blue-300">{heatmapData.activeBinIndex !== null ? heatmapData.activeBinIndex : 'None'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Pixel Bins:</span>
                            <span className="text-purple-300">{pixelBins.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Bins with Data:</span>
                            <span className="text-green-300">{pixelBins.filter(bin => bin.timeSpent > 0).length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Avg Score/Bin:</span>
                            <span className="text-yellow-300">{pixelBins.length ? Math.round(pixelBins.reduce((sum, bin) => sum + bin.timeSpent, 0) / pixelBins.length) : 0}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Tab Visibility Notice */}
            {!isTabVisible && (
                <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-center">
                    <div className="text-yellow-300 text-[10px] font-medium">
                        ⏸️ Tracking paused - tab not visible
                    </div>
                    <div className="text-yellow-400/70 text-[9px] mt-1">
                        Time counter will resume when you return to this tab
                    </div>
                </div>
            )}

            {/* Method 2 Pixel Bins Table */}
            {pixelBins && pixelBins.length > 0 && (
                <div className="mt-3">
                    <div className="font-bold text-red-300 mb-1 flex items-center gap-1">
                        <span>✏️</span>
                        25px Bell Curve Scoring
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                        {pixelBins.map((bin, index) => {
                            const range = `${bin.y}-${bin.y + 25}px`;
                            return (
                                <div key={index} className="flex justify-between text-white/80 text-xs py-0.5">
                                    <span>{range}:</span>
                                    <span className="text-white">{bin.timeSpent.toFixed(2)} pts</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-3 pt-2 border-t border-white/20 text-center">
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-white/60 hover:text-white text-xs"
                >
                    ✕ Hide
                </button>
            </div>
        </div>
    );
} 