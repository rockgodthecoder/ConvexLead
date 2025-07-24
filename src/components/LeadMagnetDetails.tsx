import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { LeadForm } from "./LeadForm";
import { PDFViewer } from "./PDFViewer";
import { TipTapContentViewer } from "./TipTapContentViewer";
import { HeatmapAnalytics } from "./HeatmapAnalytics";

interface LeadMagnetDetailsProps {
  magnetId: Id<"leadMagnets">;
  onBack: () => void;
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

export function LeadMagnetDetails({ magnetId, onBack }: LeadMagnetDetailsProps) {
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [activeTab, setActiveTab] = useState<'overall' | 'leads' | 'heatmap' | 'edit' | 'share'>('overall');

  const magnet = useQuery(api.leadMagnets.get, { id: magnetId });
  const leads = useQuery(api.leads.list, { leadMagnetId: magnetId });
  const exportLeads = useQuery(api.leads.exportLeads, { leadMagnetId: magnetId });
  
  const updateMagnet = useMutation(api.leadMagnets.update);
  const deleteMagnet = useMutation(api.leadMagnets.remove);
  const deleteLead = useMutation(api.leads.remove);
  const regenerateShareId = useMutation(api.leadMagnets.regenerateShareId);

  // Placeholder: Replace with real queries when backend is ready
  // const analytics = useQuery(api.analytics.getDocumentAnalytics, { documentId: magnetId });
  // const scrollStats = useQuery(api.analytics.getDocumentHeatmapData, { documentId: magnetId });
  const analytics = {
    submissions: 1294,
    averageViewCompletion: 0.871, // 87.1%
    averageViewTime: 176, // seconds
    trends: [
      { date: "2024-06-05", value: 2 },
      { date: "2024-06-26", value: 2 },
      { date: "2024-07-15", value: 2 },
      { date: "2024-07-20", value: 2 },
      { date: "2024-07-24", value: 1 },
    ],
  };

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
              onClick={() => setActiveTab('leads')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'leads'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Leads
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'heatmap'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Heatmap Analytics
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'edit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Edit Content
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">Submissions</div>
                  <div className="text-3xl font-bold text-gray-900">{analytics.submissions}</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">Avg. View Completion Rate</div>
                  <div className="text-3xl font-bold text-gray-900">{Math.round(analytics.averageViewCompletion * 100)}%</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">Avg. View Time</div>
                  <div className="text-3xl font-bold text-gray-900">{formatDuration(analytics.averageViewTime)}</div>
                </div>
              </div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Trends</h2>
                <span className="text-sm text-gray-500">Submissions</span>
              </div>
              {/* Trends chart (submissions over time) */}
              <TrendsChart trends={analytics.trends} />
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div>
            {/* --- Leads Tab Content (existing leads table) --- */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Leads ({leads.length})</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLeadForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Lead
                  </button>
                  {leads.length > 0 && (
                    <button
                      onClick={downloadCSV}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Export CSV
                    </button>
                  )}
                </div>
              </div>

              {leads.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-4xl mb-4">📧</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No leads yet</h3>
                  <p className="text-gray-600 mb-4">Start collecting leads for this magnet</p>
                  <button
                    onClick={() => setShowLeadForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add First Lead
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                        {magnet.fields?.firstName && (
                          <th className="text-left py-3 px-4 font-medium text-gray-700">First Name</th>
                        )}
                        {magnet.fields?.lastName && (
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Last Name</th>
                        )}
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Total Watch Time</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Last Watch Time</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Last Watched</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Sessions</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead._id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{lead.email}</td>
                          {magnet.fields?.firstName && (
                            <td className="py-3 px-4">{lead.firstName || "-"}</td>
                          )}
                          {magnet.fields?.lastName && (
                            <td className="py-3 px-4">{lead.lastName || "-"}</td>
                          )}
                          <LeadWatchTimeCell magnetId={magnetId} email={lead.email} />
                          <td className="py-3 px-4">
                            {new Date(lead._creationTime).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleDeleteLead(lead._id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Delete
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

        {activeTab === 'heatmap' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Heatmap Analytics</h2>
            <div className="text-gray-600">Heatmap analytics coming soon...</div>
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Edit Content</h2>
            <div className="text-gray-600">Content editing UI coming soon...</div>
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
      </div>
    </div>
  );
}

function TrendsChart({ trends }: { trends: { date: string; value: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="relative h-48 flex items-end gap-2">
        {trends.map((point, idx) => (
          <div key={point.date} className="flex flex-col items-center justify-end" style={{ height: "100%" }}>
            <div
              className="bg-blue-500 rounded-t w-6 cursor-pointer relative"
              style={{ height: `${point.value * 20}px` }}
              title={`${point.value} on ${point.date}`}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === idx && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow z-10 whitespace-nowrap">
                  {point.value} submissions<br />{point.date}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">{point.date.slice(5)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
