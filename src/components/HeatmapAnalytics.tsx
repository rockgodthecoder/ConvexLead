import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface HeatmapAnalyticsProps {
  documentId: Id<"leadMagnets">;
  documentTitle: string;
}

export function HeatmapAnalytics({ documentId, documentTitle }: HeatmapAnalyticsProps) {
  const [timeRange, setTimeRange] = useState(30);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Fetch heatmap data
  const heatmapData = useQuery(api.analytics.getDocumentHeatmapData, {
    documentId,
    timeRange,
  });

  // Fetch paragraph engagement data
  const paragraphEngagement = useQuery(api.analytics.getDocumentParagraphEngagement, {
    documentId,
    timeRange,
  });

  if (heatmapData === undefined || paragraphEngagement === undefined) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getHeatColor = (engagement: number) => {
    if (engagement >= 80) return "bg-red-500";
    if (engagement >= 60) return "bg-orange-500";
    if (engagement >= 40) return "bg-yellow-500";
    if (engagement >= 20) return "bg-blue-500";
    return "bg-gray-300";
  };

  const getHeatLevel = (engagement: number) => {
    if (engagement >= 80) return "Very Hot";
    if (engagement >= 60) return "Hot";
    if (engagement >= 40) return "Warm";
    if (engagement >= 20) return "Cool";
    return "Cold";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Heatmap Analytics</h2>
          <p className="text-gray-600 mt-1">Engagement analysis for "{documentTitle}"</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            {showHeatmap ? "Hide" : "Show"} Heatmap
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900">{heatmapData.totalSessions}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-2xl">��</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Visitors</p>
              <p className="text-3xl font-bold text-gray-900">{heatmapData.uniqueVisitors}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl"></span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Engagement</p>
              <p className="text-3xl font-bold text-gray-900">
                {heatmapData.totalSessions > 0 
                  ? Math.round(heatmapData.scrollHeatmapData.reduce((sum, data) => sum + data.reachPercentage, 0) / heatmapData.scrollHeatmapData.length)
                  : 0}%
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <span className="text-2xl"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Depth Heatmap */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Scroll Depth Analysis</h3>
        
        {heatmapData.scrollHeatmapData.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📈</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No scroll data available</h4>
            <p className="text-gray-600">Share your lead magnet to start collecting engagement data</p>
          </div>
        ) : (
          <div className="space-y-4">
            {heatmapData.scrollHeatmapData.map((data) => (
              <div key={data.scrollDepth} className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium text-gray-600">
                  {data.scrollDepth}%
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full ${getHeatColor(data.reachPercentage)} transition-all duration-300`}
                    style={{ width: `${data.reachPercentage}%` }}
                  />
                </div>
                <div className="w-24 text-sm text-gray-600">
                  {data.sessionsReached} / {data.totalSessions}
                </div>
                <div className="w-16 text-sm font-medium text-gray-900">
                  {data.reachPercentage}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paragraph Engagement */}
      {paragraphEngagement.paragraphMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Paragraph Engagement</h3>
          
          <div className="space-y-4">
            {paragraphEngagement.paragraphMetrics.slice(0, 10).map((paragraph) => (
              <div key={paragraph.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {paragraph.id.replace('paragraph-', 'Paragraph ')}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {paragraph.content}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      paragraph.engagementScore >= 80 ? 'bg-red-100 text-red-800' :
                      paragraph.engagementScore >= 60 ? 'bg-orange-100 text-orange-800' :
                      paragraph.engagementScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                      paragraph.engagementScore >= 20 ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {paragraph.engagementScore}% engagement
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Reached:</span>
                    <span className="font-medium ml-1">{paragraph.sessionsReached}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-medium ml-1">{paragraph.sessionsCompleted}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Completion:</span>
                    <span className="font-medium ml-1">{Math.round(paragraph.completionRate)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Dropoff:</span>
                    <span className="font-medium ml-1">{Math.round(paragraph.dropoffRate)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {paragraphEngagement.paragraphMetrics.length > 10 && (
            <div className="text-center mt-6">
              <p className="text-gray-600">
                Showing top 10 paragraphs. Total: {paragraphEngagement.paragraphMetrics.length} paragraphs
              </p>
            </div>
          )}
        </div>
      )}

      {/* Document Structure */}
      {paragraphEngagement.documentStructure && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Document Structure</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {paragraphEngagement.documentStructure.totalParagraphs}
              </div>
              <div className="text-sm text-gray-600">Total Paragraphs</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {paragraphEngagement.documentStructure.wordCount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Word Count</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {paragraphEngagement.documentStructure.estimatedReadingTime}
              </div>
              <div className="text-sm text-gray-600">Est. Reading Time (min)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 