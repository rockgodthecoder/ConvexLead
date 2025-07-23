import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { LeadForm } from "./LeadForm";
import { PDFViewer } from "./PDFViewer";
import { TipTapContentViewer } from "./TipTapContentViewer";

interface LeadMagnetDetailsProps {
  magnetId: Id<"leadMagnets">;
  onBack: () => void;
}

export function LeadMagnetDetails({ magnetId, onBack }: LeadMagnetDetailsProps) {
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const magnet = useQuery(api.leadMagnets.get, { id: magnetId });
  const leads = useQuery(api.leads.list, { leadMagnetId: magnetId });
  const exportLeads = useQuery(api.leads.exportLeads, { leadMagnetId: magnetId });
  
  const updateMagnet = useMutation(api.leadMagnets.update);
  const deleteMagnet = useMutation(api.leadMagnets.remove);
  const deleteLead = useMutation(api.leads.remove);
  const regenerateShareId = useMutation(api.leadMagnets.regenerateShareId);

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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getTypeIcon(magnet.type)}</span>
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 bg-transparent focus:outline-none"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{magnet.title}</h1>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  magnet.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {magnet.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm text-gray-500">
                  {leads.length} leads collected
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={handleToggleActive}
                  className={`px-3 py-1 rounded text-sm ${
                    magnet.isActive
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {magnet.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Description"
          />
        ) : (
          magnet.description && (
            <p className="text-gray-600 mb-4">{magnet.description}</p>
          )
        )}

        {/* Share Link Section */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
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
            <button
              onClick={handleViewSharePage}
              className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 whitespace-nowrap"
            >
              View Page
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

        {/* Form Fields Configuration */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Form Fields:</h3>
          <div className="flex flex-wrap gap-2">
            {enabledFields.map((field) => (
              <span
                key={field}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
              >
                {getFieldLabel(field)}
              </span>
            ))}
          </div>
        </div>

        {magnet.type === "notion" && magnet.notionUrl && (
          <div className="mt-4">
            <a
              href={magnet.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              View Notion Page →
            </a>
          </div>
        )}

        {magnet.type === "pdf" && magnet.fileUrl && (
          <div className="mt-4">
            <PDFViewer 
              fileUrl={magnet.fileUrl} 
              title={magnet.title}
              className="w-full"
            />
          </div>
        )}

        {magnet.type === "scratch" && magnet.content && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Content Preview:</h3>
            <div className="text-sm text-gray-700 max-h-40 overflow-y-auto flex justify-center">
              <TipTapContentViewer content={magnet.content} />
            </div>
          </div>
        )}
      </div>

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
                  {magnet.fields?.phone && (
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Phone</th>
                  )}
                  {magnet.fields?.company && (
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Company</th>
                  )}
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
                    {magnet.fields?.phone && (
                      <td className="py-3 px-4">{lead.phone || "-"}</td>
                    )}
                    {magnet.fields?.company && (
                      <td className="py-3 px-4">{lead.company || "-"}</td>
                    )}
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

      {showLeadForm && (
        <LeadForm
          magnetId={magnetId}
          onClose={() => setShowLeadForm(false)}
        />
      )}
    </div>
  );
}
