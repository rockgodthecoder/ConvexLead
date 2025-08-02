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
}: AnalyticsDemoProps) {
    const [isVisible, setIsVisible] = useState(true);

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
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-xs backdrop-blur-sm border border-white/10">
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
                        {timeOnPage}s {!isTabVisible && '(frozen)'}
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
                    <span>Tab status:</span>
                    <span className={isTabVisible ? 'text-green-300' : 'text-yellow-300'}>
                        {isTabVisible ? 'Active' : 'Hidden'}
                    </span>
                </div>
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

            {/* Scroll Range Time Table */}
            {scrollRangeTimeData && (
                <div className="mt-3">
                    <div className="font-bold text-white/90 mb-1">Scroll % Range Time (s)</div>
                    <table className="w-full text-right border-separate border-spacing-y-1">
                        <thead>
                            <tr>
                                <th className="text-left text-white/60 font-normal">Range</th>
                                <th className="text-white/60 font-normal">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(scrollRangeTimeData).map(([range, ms]) => (
                                <tr key={range}>
                                    <td className="text-white/80">{range}%</td>
                                    <td className="text-white/80">{Math.round(ms / 1000)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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