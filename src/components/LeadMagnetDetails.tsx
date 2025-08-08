import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { LeadForm } from "./LeadForm";
import { PDFViewer } from "./PDFViewer";
import { TipTapContentViewer } from "./TipTapContentViewer";
import { HeatmapAnalytics } from "./HeatmapAnalytics";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface LeadMagnetDetailsProps {
  magnetId: Id<"leadMagnets">;
  onBack: () => void;
  onCollapseSidebar?: () => void;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(ts: number | null) {
  if (!ts) return "-";
  const d = new Date(ts);
  return d.toLocaleDateString();
}

function LeadWatchTimeCell({ magnetId, email }: { magnetId: Id<'leadMagnets'>, email: string }) {
  const watch = useQuery(api.analytics.getLeadWatchTime, { leadMagnetId: magnetId, email });
  return (
    <>
      <td className="py-3 px-4">{watch ? formatDuration(watch.totalWatchTime) : '-'}</td>
      <td className="py-3 px-4">{watch ? formatDuration(watch.lastWatchTime) : '-'}</td>
      <td className="py-3 px-4">{watch ? formatDate(watch.lastWatchedAt) : '-'}</td>
      <td className="py-3 px-4">{watch ? watch.sessionCount : '-'}</td>
    </>
  );
}

// Base Screenshot Viewer Component
interface BaseScreenshotViewerProps {
  documentId: Id<"leadMagnets">;
}

function BaseScreenshotViewer({ documentId }: BaseScreenshotViewerProps) {
  const baseScreenshot = useQuery(api.analytics.getBaseScreenshot, {
    documentId,
  });

  if (baseScreenshot === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading screenshot...</span>
      </div>
    );
  }

  if (!baseScreenshot) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📸</div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Screenshot Available</h3>
        <p className="text-sm text-gray-500 mb-4">
          This lead magnet doesn't have a base screenshot yet.
        </p>
        <div className="text-xs text-gray-400">
          Screenshots are captured automatically when lead magnets are created.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            Captured on: {baseScreenshot.capturedAt ? new Date(baseScreenshot.capturedAt).toLocaleString() : 'Unknown'}
          </p>
        </div>
        <a
          href={baseScreenshot.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          🔗 Open Full Size
        </a>
      </div>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <img
          src={baseScreenshot.url}
          alt="Lead magnet base screenshot"
          className="w-full h-auto max-h-96 object-contain"
          style={{ backgroundColor: '#f9fafb' }}
        />
      </div>
      
      <div className="text-xs text-gray-500">
        This screenshot is used as the base for heatmap visualizations.
      </div>
    </div>
  );
}

// Heatmap Component
interface HeatmapOverlayProps {
  baseScreenshotUrl: string | null;
  pixelBins: Array<{ y: number; timeSpent: number }>;
  isLoading?: boolean;
}

function HeatmapOverlay({ baseScreenshotUrl, pixelBins, isLoading = false }: HeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!baseScreenshotUrl || !canvasRef.current || pixelBins.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw base image
      ctx.drawImage(img, 0, 0);
      
      // Draw heatmap overlay
      const maxScore = Math.max(...pixelBins.map(bin => bin.timeSpent));
      
      pixelBins.forEach((bin) => {
        if (bin.timeSpent > 0) {
          const intensity = maxScore > 0 ? (bin.timeSpent / maxScore) : 0;
          const opacity = Math.min(intensity * 0.7, 0.7); // Max 70% opacity
          
          ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
          ctx.fillRect(0, bin.y, canvas.width, 25); // 25px bin height
        }
      });
      
      setImageLoaded(true);
    };
    
    img.onerror = () => {
      console.error('Failed to load base screenshot');
    };
    
    img.src = baseScreenshotUrl;
  }, [baseScreenshotUrl, pixelBins]);

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 h-full flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading heatmap...</p>
        </div>
      </div>
    );
  }

  if (!baseScreenshotUrl) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 h-full flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="text-4xl mb-4">📸</div>
          <h4 className="text-lg font-medium text-gray-700 mb-2">No Base Screenshot</h4>
          <p className="text-sm text-gray-500">
            Base screenshot not available for this lead magnet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-auto border border-gray-200 rounded-lg"
        style={{ maxHeight: '500px' }}
      />
      {imageLoaded && (
        <div className="mt-2 text-xs text-gray-600">
          Heatmap overlay showing engagement intensity (red = high engagement)
        </div>
      )}
    </div>
  );
}

// Session Details Modal Component
interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData?: {
    email: string;
    firstName?: string;
    lastName?: string;
    totalTimeSpent: number;
    maxScrollPercentage: number;
    ctaClicks: number | string;
    firstEngagement?: number;
    lastEngagement?: number;
  };
  magnetId?: Id<"leadMagnets">;
}

function SessionDetailsModal({ isOpen, onClose, sessionData, magnetId }: SessionDetailsModalProps) {
  // Fetch base screenshot and session data for heatmap
  const baseScreenshot = useQuery(api.analytics.getBaseScreenshot, {
    documentId: magnetId || "temp" as any,
  });
  
  // Fetch sessions for this lead magnet to aggregate pixel bins
  const sessions = useQuery(api.analytics.getSessionsForLeadMagnet, {
    leadMagnetId: magnetId || "temp" as any,
    limit: 100,
  });

  // Aggregate pixel bins from all sessions
  const aggregatedPixelBins = sessions?.reduce((bins, session) => {
    if (session.pixelBins) {
      session.pixelBins.forEach((bin) => {
        const existingBin = bins.find(b => b.y === bin.y);
        if (existingBin) {
          existingBin.timeSpent += bin.timeSpent;
        } else {
          bins.push({ y: bin.y, timeSpent: bin.timeSpent });
        }
      });
    }
    return bins;
  }, [] as Array<{ y: number; timeSpent: number }>) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Session Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              {sessionData?.firstName && sessionData?.lastName 
                ? `${sessionData.firstName} ${sessionData.lastName}`
                : sessionData?.email || 'Unknown User'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 flex overflow-y-auto">
          {/* Left Side - Heatmap */}
          <div className="w-2/3 p-6 border-r border-gray-200 flex-shrink-0">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Engagement Heatmap</h3>
              <p className="text-sm text-gray-600">Scroll depth and time spent analysis</p>
            </div>
            {/* Heatmap Component */}
            <HeatmapOverlay
              baseScreenshotUrl={baseScreenshot?.url || null}
              pixelBins={aggregatedPixelBins}
              isLoading={baseScreenshot === undefined || sessions === undefined}
            />
          </div>

          {/* Right Side - Analytics */}
          <div className="w-1/3 p-6 flex-shrink-0">
            {/* Session Info */}
            <div className="mb-6 space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Session Info</h3>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="font-semibold text-gray-900">{sessionData?.email || '-'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">First Name</span>
                  <span className="font-semibold text-gray-900">{sessionData?.firstName || '-'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Last Name</span>
                  <span className="font-semibold text-gray-900">{sessionData?.lastName || '-'}</span>
                </div>
              </div>
            </div>
            {/* Total Time Spent */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Total Time Spent</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {sessionData?.totalTimeSpent ? Math.round(sessionData.totalTimeSpent / 60) : 0}m {sessionData?.totalTimeSpent ? sessionData.totalTimeSpent % 60 : 0}s
                </div>
                <div className="text-sm text-blue-700">
                  Active reading time
                </div>
              </div>
            </div>
            {/* CTA Clicks */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">CTA Engagement</h3>
              <div className="bg-pink-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-pink-600 mb-1">
                  {sessionData?.ctaClicks || 0}
                </div>
                <div className="text-sm text-pink-700">
                  Call-to-action clicks
                </div>
              </div>
            </div>
            {/* Last Engagement Only */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Last Engagement</h3>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Date</span>
                <span className="font-semibold text-gray-900">
                  {sessionData?.lastEngagement 
                    ? new Date(sessionData.lastEngagement).toLocaleDateString()
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
            {/* AI Summary */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Summary</h3>
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                  <span className="text-sm font-medium text-purple-700">Engagement Analysis</span>
                </div>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>
                    <strong>Reading Pattern:</strong> This user showed {sessionData?.maxScrollPercentage && sessionData.maxScrollPercentage > 75 ? 'high' : sessionData?.maxScrollPercentage && sessionData.maxScrollPercentage > 50 ? 'moderate' : 'low'} engagement, 
                    reaching {sessionData?.maxScrollPercentage || 0}% of the content.
                  </p>
                  <p>
                    <strong>Time Investment:</strong> Spent {sessionData?.totalTimeSpent ? Math.round(sessionData.totalTimeSpent / 60) : 0} minutes actively reading, 
                    indicating {sessionData?.totalTimeSpent && sessionData.totalTimeSpent > 300 ? 'strong' : sessionData?.totalTimeSpent && sessionData.totalTimeSpent > 120 ? 'moderate' : 'limited'} interest in the material.
                  </p>
                  <p>
                    <strong>Engagement Quality:</strong> {sessionData?.maxScrollPercentage && sessionData.maxScrollPercentage > 80 && sessionData?.totalTimeSpent && sessionData.totalTimeSpent > 300 ? 'High-quality engagement with deep content consumption.' : sessionData?.maxScrollPercentage && sessionData.maxScrollPercentage > 50 ? 'Moderate engagement with selective content review.' : 'Quick scan with limited content absorption.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeadMagnetDetails({ magnetId, onBack, onCollapseSidebar }: LeadMagnetDetailsProps) {
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [activeTab, setActiveTab] = useState<'overall' | 'sessions' | 'share'>('overall');
  const [dateFilter, setDateFilter] = useState<'all' | '7' | '30' | '90'>('all');
  const [trendsFilter, setTrendsFilter] = useState<'all' | '7' | '30' | '90'>('all');
  const [showContentPopup, setShowContentPopup] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const magnet = useQuery(api.leadMagnets.get, { id: magnetId });
  const leads = useQuery(api.leads.list, { leadMagnetId: magnetId });
  const exportLeads = useQuery(api.leads.exportLeads, { leadMagnetId: magnetId });
  const sessions = useQuery(api.analytics.getSessionsForLeadMagnet, { leadMagnetId: magnetId });
  const averageViewTime = useQuery(api.analytics.getAverageViewTime, { leadMagnetId: magnetId });
  
  const updateMagnet = useMutation(api.leadMagnets.update);
  const deleteMagnet = useMutation(api.leadMagnets.remove);
  const deleteLead = useMutation(api.leads.remove);
  const regenerateShareId = useMutation(api.leadMagnets.regenerateShareId);

  // Generate real analytics data from leads and form views
  const generateAnalytics = () => {
    if (!leads || !magnet) return {
      views: 0,
      leads: 0,
      conversionRate: 0,
      trends: []
    };

    // Generate trends data by aggregating leads by date
    const leadsByDate = new Map<string, number>();
    
    leads.forEach(lead => {
      const date = new Date(lead._creationTime).toISOString().split('T')[0]; // YYYY-MM-DD format
      leadsByDate.set(date, (leadsByDate.get(date) || 0) + 1);
    });

    // Convert to trends array and sort by date
    const trends = Array.from(leadsByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate core metrics using real data
    const totalLeads = leads.length;
    const realViews = magnet.formViews || 0;
    const conversionRate = realViews > 0 ? Math.round((totalLeads / realViews) * 100) : 0;

    return {
      views: realViews,
      leads: totalLeads,
      conversionRate,
      trends
    };
  };

  const analytics = generateAnalytics();

  if (magnet === undefined || leads === undefined) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!magnet) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Lead magnet not found</h3>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700"
        >
          ← Back to dashboard
        </button>
      </div>
    );
  }

  const shareUrl = magnet.shareId ? `${window.location.origin}/share/${magnet.shareId}` : null;

  // Filter leads based on date filter
  const filteredLeads = leads?.filter(lead => {
    if (dateFilter === 'all') return true;
    
    const leadDate = new Date(lead._creationTime);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (dateFilter) {
      case '7': return daysDiff <= 7;
      case '30': return daysDiff <= 30;
      case '90': return daysDiff <= 90;
      default: return true;
    }
  }) || [];

  // Filter trends data based on trends filter
  const filteredTrends = analytics.trends.filter(trend => {
    if (trendsFilter === 'all') return true;
    
    const trendDate = new Date(trend.date);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - trendDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (trendsFilter) {
      case '7': return daysDiff <= 7;
      case '30': return daysDiff <= 30;
      case '90': return daysDiff <= 90;
      default: return true;
    }
  });

  const handleEdit = () => {
    setEditTitle(magnet.title);
    setEditDescription(magnet.description || "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateMagnet({
        id: magnetId,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
      toast.success("Lead magnet updated successfully!");
    } catch (error) {
      toast.error("Failed to update lead magnet");
    }
  };

  const handleToggleActive = async () => {
    try {
      await updateMagnet({
        id: magnetId,
        isActive: !magnet.isActive,
      });
      toast.success(`Lead magnet ${magnet.isActive ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      toast.error("Failed to update lead magnet status");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this lead magnet? This will also delete all associated leads.")) {
      return;
    }

    try {
      await deleteMagnet({ id: magnetId });
      toast.success("Lead magnet deleted successfully!");
      onBack();
    } catch (error) {
      toast.error("Failed to delete lead magnet");
    }
  };

  const handleDeleteLead = async (leadId: Id<"leads">) => {
    if (!confirm("Are you sure you want to delete this lead?")) {
      return;
    }

    try {
      await deleteLead({ id: leadId });
      toast.success("Lead deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete lead");
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) {
      toast.error("No share link available");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleViewSharePage = () => {
    if (!shareUrl) {
      toast.error("No share link available");
      return;
    }
    window.open(shareUrl, '_blank');
  };

  const handleRegenerateShareId = async () => {
    if (!confirm("Are you sure you want to regenerate the share link? The old link will stop working.")) {
      return;
    }

    try {
      await regenerateShareId({ id: magnetId });
      toast.success("Share link regenerated successfully!");
    } catch (error) {
      toast.error("Failed to regenerate share link");
    }
  };

  const downloadCSV = () => {
    if (!exportLeads || exportLeads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    const enabledFields = magnet.fields || { firstName: true, lastName: true, email: true, phone: false, company: false };
    const headers = ["Email"];
    if (enabledFields.firstName) headers.push("First Name");
    if (enabledFields.lastName) headers.push("Last Name");
    if (enabledFields.phone) headers.push("Phone");
    if (enabledFields.company) headers.push("Company");
    headers.push("Notes", "Created At");

    const csvContent = [
      headers.join(","),
      ...exportLeads.map(lead => {
        const row = [lead.email];
        if (enabledFields.firstName) row.push(lead.firstName);
        if (enabledFields.lastName) row.push(lead.lastName);
        if (enabledFields.phone) row.push(lead.phone);
        if (enabledFields.company) row.push(lead.company);
        row.push(lead.notes, lead.createdAt);
        return row.map(field => `"${field}"`).join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${magnet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_leads.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "scratch": return "✏️";
      case "pdf": return "📄";
      case "notion": return "📝";
      case "html": return "🌐";
      default: return "📄";
    }
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case "firstName": return "First Name";
      case "lastName": return "Last Name";
      case "email": return "Email";
      case "phone": return "Phone";
      case "company": return "Company";
      default: return field;
    }
  };

  const enabledFields = Object.entries(magnet.fields || { firstName: true, lastName: true, email: true, phone: false, company: false })
    .filter(([_, enabled]) => enabled)
    .map(([field, _]) => field);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Tab navigation removed. Only rendering Overall tab content. */}
      {/* Tab Content */}
            <div>
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overall')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overall'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sessions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sessions
            </button>
    
                <button
              onClick={() => setActiveTab('share')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'share'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
                >
              Share
                </button>
          </nav>
        </div>
        {activeTab === 'overall' && (
          <div>
            {/* --- Lead Magnet Info Card --- */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{magnet.title}</h1>
                <div className="mb-1 text-xs text-gray-500 font-medium">
                  {magnet.type === 'scratch' && 'From Scratch'}
                  {magnet.type === 'pdf' && 'PDF Upload'}
                  {magnet.type === 'notion' && 'Notion Link'}
                  {magnet.type === 'html' && 'HTML File'}
                </div>
                {magnet.description && (
                  <p className="text-gray-600 mb-2">{magnet.description}</p>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleToggleActive}
                  className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                    magnet.isActive
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {magnet.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => setShowContentPopup(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Content
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700"
                >
                  Delete
                </button>
          </div>
        </div>
            {/* --- Analytics Dashboard --- */}
            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Big picture</h2>
          </div>
              {/* Big picture stats */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">Views</div>
                  <div className="text-3xl font-bold text-gray-900">{analytics.views}</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">Leads</div>
                  <div className="text-3xl font-bold text-gray-900">{analytics.leads}</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">Conversion Rate</div>
                  <div className="text-3xl font-bold text-gray-900">{analytics.conversionRate}%</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">Avg. View Time</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {averageViewTime ? formatDuration(averageViewTime.averageViewTime) : '--'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {averageViewTime && averageViewTime.totalSessions > 0 
                      ? `${averageViewTime.totalSessions} sessions` 
                      : 'No sessions yet'}
                  </div>
                </div>
              </div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Trends</h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">Leads</span>
                  <div className="flex items-center gap-2">
                    <label htmlFor="trendsFilter" className="text-sm font-medium text-gray-700">
                      Filter:
                    </label>
                    <select
                      id="trendsFilter"
                      value={trendsFilter}
                      onChange={(e) => setTrendsFilter(e.target.value as 'all' | '7' | '30' | '90')}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Time</option>
                      <option value="7">Last 7 Days</option>
                      <option value="30">Last 30 Days</option>
                      <option value="90">Last 90 Days</option>
                    </select>
                  </div>
                </div>
          </div>
              {/* Trends chart (leads over time) */}
              <TrendsChart trends={filteredTrends} />
            </div>
            
            {/* --- Other Details Section --- */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Other Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Included Fields */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Included Fields</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-600">Email</span>
                      <span className="text-sm font-medium text-green-600">✓ Required</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-600">First Name</span>
                      <span className={`text-sm font-medium ${magnet.fields?.firstName ? 'text-green-600' : 'text-gray-400'}`}>
                        {magnet.fields?.firstName ? '✓ Included' : '✗ Not included'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-600">Last Name</span>
                      <span className={`text-sm font-medium ${magnet.fields?.lastName ? 'text-green-600' : 'text-gray-400'}`}>
                        {magnet.fields?.lastName ? '✓ Included' : '✗ Not included'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-600">Phone</span>
                      <span className={`text-sm font-medium ${magnet.fields?.phone ? 'text-green-600' : 'text-gray-400'}`}>
                        {magnet.fields?.phone ? '✓ Included' : '✗ Not included'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-600">Company</span>
                      <span className={`text-sm font-medium ${magnet.fields?.company ? 'text-green-600' : 'text-gray-400'}`}>
                        {magnet.fields?.company ? '✓ Included' : '✗ Not included'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* CTA Status */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Call-to-Action (CTA)</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-600">CTA Status</span>
                      <span className={`text-sm font-medium ${magnet.cta ? 'text-green-600' : 'text-gray-400'}`}>
                        {magnet.cta ? '✓ Configured' : '✗ Not configured'}
                      </span>
                    </div>
                    
                    {/* CTA Text */}
                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="text-sm text-gray-600 mb-1">CTA Text</div>
                      <div className="text-sm font-medium text-gray-900 break-words">
                        {magnet.cta?.mainText || 'Not set'}
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="text-sm text-gray-600 mb-1">Description</div>
                      <div className="text-sm font-medium text-gray-900 break-words">
                        {magnet.cta?.description || 'Not set'}
                      </div>
                    </div>
                    
                    {/* Button Text */}
                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="text-sm text-gray-600 mb-1">Button Text</div>
                      <div className="text-sm font-medium text-gray-900 break-words">
                        {magnet.cta?.buttonText || 'Not set'}
                      </div>
                    </div>
                    
                    {/* CTA Link */}
                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="text-sm text-gray-600 mb-1">CTA Link</div>
                      {magnet.cta?.link ? (
                        <a 
                          href={magnet.cta.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 underline break-all"
                          title={magnet.cta.link}
                        >
                          {magnet.cta.link}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-gray-400">Not set</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div>
            {/* --- Sessions Tab Content --- */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Sessions ({sessions?.length || 0})</h2>
                      <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="dateFilter" className="text-sm font-medium text-gray-700">
                  Filter:
                </label>
                <select
                  id="dateFilter"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as 'all' | '7' | '30' | '90')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>
            </div>
        </div>

        {!sessions || sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {!sessions ? "Loading sessions..." : "No sessions yet"}
            </h3>
            <p className="text-gray-600 mb-4">
              {!sessions ? "Please wait while we load your session data" : "Start tracking sessions for this magnet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">User</th>
                  {magnet.fields?.firstName && (
                    <th className="text-left py-2 px-3 font-medium text-gray-700">First Name</th>
                  )}
                  {magnet.fields?.lastName && (
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Last Name</th>
                  )}
                  <th className="text-left py-2 px-3 font-medium text-gray-700">First Engagement</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Last Engagement</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Total Time Spent</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">CTA Clicks</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session._id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">{session.lead?.email || session.email || "-"}</td>
                    {magnet.fields?.firstName && (
                      <td className="py-2 px-3">{session.lead?.firstName || "-"}</td>
                    )}
                    {magnet.fields?.lastName && (
                      <td className="py-2 px-3">{session.lead?.lastName || "-"}</td>
                    )}
                    <td className="py-2 px-3">
                      {session.startTime 
                        ? new Date(session.startTime).toLocaleDateString()
                        : "-"
                      }
                    </td>
                    <td className="py-2 px-3">
                      {session.endTime 
                        ? new Date(session.endTime).toLocaleDateString()
                        : "-"
                      }
                    </td>
                    <td className="py-2 px-3">
                      {session.duration 
                        ? formatDuration(session.duration)
                        : "-"
                      }
                    </td>
                    <td className="py-2 px-3">
                      {magnet.cta ? (session.ctaClicks || 0) : "N/A"}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => {
                          setSelectedSession({
                            email: session.lead?.email || session.email || "",
                            firstName: session.lead?.firstName,
                            lastName: session.lead?.lastName,
                            totalTimeSpent: session.duration ?? 0,
                            maxScrollPercentage: session.maxScrollPercentage ?? 0,
                            ctaClicks: magnet.cta ? (session.ctaClicks ?? 0) : "N/A",
                            firstEngagement: session.startTime,
                            lastEngagement: session.endTime,
                          });
                          setShowSessionModal(true);
                          onCollapseSidebar?.();
                        }}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        View Insights
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
          </div>
        )}



        {activeTab === 'share' && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-medium mb-3 text-blue-900">📤 Share Link</h3>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={shareUrl || ""}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm font-mono"
              />
              <button
                onClick={handleCopyShareLink}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRegenerateShareId}
                className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
              >
                Regenerate Link
              </button>
              <span className="text-xs text-blue-700">
                Share this link to collect leads publicly
              </span>
            </div>
          </div>
        )}

      {showLeadForm && (
        <LeadForm
          magnetId={magnetId}
          onClose={() => setShowLeadForm(false)}
        />
      )}

      {/* Content Preview Popup */}
      {showContentPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Lead Magnet Content Preview</h2>
              <button
                onClick={() => setShowContentPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {magnet?.type === 'pdf' && magnet.fileUrl ? (
                <div className="w-full">
                  <PDFViewer 
                    fileUrl={magnet.fileUrl} 
                    title={magnet.title}
                    documentId={magnet._id}
                  />
                </div>
              ) : magnet?.type === 'notion' && magnet.notionUrl ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📝</div>
                  <p className="text-gray-600">Notion content preview not available</p>
                  <p className="text-sm text-gray-500 mt-2">
                    <a 
                      href={magnet.notionUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      View in Notion
                    </a>
                  </p>
                </div>
              ) : magnet?.type === 'html' && magnet.content ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: magnet.content }}
                />
              ) : magnet?.type === 'scratch' && magnet.content ? (
                <div className="prose max-w-none">
                  <TipTapContentViewer content={magnet.content} />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📄</div>
                  <p className="text-gray-600">No content available</p>
                  <p className="text-sm text-gray-500 mt-2">This lead magnet doesn't have any content</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
      <SessionDetailsModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        sessionData={selectedSession}
        magnetId={magnetId}
      />
    </div>
  );
}

function TrendsChart({ trends }: { trends: { date: string; value: number }[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6" style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={trends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} label={{ value: 'Leads', angle: -90, position: 'insideLeft', fontSize: 12 }} />
          <Tooltip formatter={(value: any, name: any, props: any) => [`${value} leads`, '']} labelFormatter={label => `Date: ${label}`} />
          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
