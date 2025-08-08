import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
// Remove: import { Dialog } from "@radix-ui/react-dialog";

function formatDuration(seconds: number): string {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString();
}

function LeadMagnetsModal({ email, onClose }: { email: string; onClose: () => void }) {
  // Placeholder: Replace with actual query when backend is ready
  // const { data, isLoading } = useQuery(api.leads.getLeadMagnetsForLead, { email });
  const isLoading = false;
  const data = [
    { 
      magnetId: "1", 
      title: "Ebook.pdf", 
      totalWatchTime: 510, 
      lastInteraction: Date.now(),
      type: "pdf",
      interactionType: "viewed",
      description: "Downloaded and viewed the complete guide"
    },
    { 
      magnetId: "2", 
      title: "Checklist", 
      totalWatchTime: 240, 
      lastInteraction: Date.now() - 86400000,
      type: "scratch",
      interactionType: "completed",
      description: "Completed the entire checklist"
    },
    { 
      magnetId: "3", 
      title: "Video Tutorial", 
      totalWatchTime: 1800, 
      lastInteraction: Date.now() - 172800000,
      type: "html",
      interactionType: "watched",
      description: "Watched 75% of the tutorial video"
    },
  ];

  // Sort by last interaction (most recent first)
  const sortedData = [...data].sort((a, b) => b.lastInteraction - a.lastInteraction);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "scratch": return "✏️";
      case "pdf": return "📄";
      case "notion": return "📝";
      case "html": return "🌐";
      default: return "📄";
    }
  };



  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Lead Magnet Timeline</h3>
            <p className="text-sm text-gray-600 mt-1">{email}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading timeline...</p>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📭</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No interactions yet</h4>
            <p className="text-gray-600">This lead hasn't interacted with any lead magnets yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {sortedData.map((magnet, index) => (
                <div key={magnet.magnetId} className="relative flex items-start gap-4 mb-6">
                                     {/* Timeline dot */}
                   <div className="relative z-10 flex-shrink-0 w-12 h-12 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center">
                     <span className="text-lg">⏱️</span>
                   </div>
                  
                  {/* Content */}
                  <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                                         <div className="flex items-start justify-between mb-2">
                       <div className="flex items-center gap-2">
                         <h4 className="font-semibold text-gray-900">{magnet.title}</h4>
                       </div>
                     </div>
                    
                                         <p className="text-sm text-gray-600 mb-3">{magnet.description}</p>
                     
                     <div className="flex items-center gap-4 text-xs text-gray-500">
                       <div className="flex items-center gap-1">
                         <span>⏱️</span>
                         <span className="font-medium">{formatDuration(magnet.totalWatchTime)} view time</span>
                       </div>
                       <div className="flex items-center gap-1">
                         <span>📅</span>
                         <span className="font-medium">Last read: {new Date(magnet.lastInteraction).toLocaleDateString()}</span>
                       </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Total Magnets:</span>
                  <span className="ml-1 text-blue-900">{sortedData.length}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Total Time:</span>
                  <span className="ml-1 text-blue-900">
                    {formatDuration(sortedData.reduce((sum, m) => sum + m.totalWatchTime, 0))}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Last Activity:</span>
                  <span className="ml-1 text-blue-900">
                    {new Date(sortedData[0]?.lastInteraction || 0).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMagnet, setSelectedMagnet] = useState<string>("all");
  const [selectedLeadEmail, setSelectedLeadEmail] = useState<string | null>(null);
  
  const leadMagnets = useQuery(api.leadMagnets.list);
  const allLeads = useQuery(api.leads.listAll, { 
    leadMagnetId: selectedMagnet === "all" ? undefined : selectedMagnet as any 
  });

  if (leadMagnets === undefined || allLeads === undefined) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }



  const downloadAllLeadsCSV = () => {
    if (!allLeads || allLeads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    const headers = ["Email", "First Name", "Last Name", "Phone", "Company", "Notes", "Created At"];
    const csvContent = [
      headers.join(","),
      ...allLeads.map(lead => [
        lead.email,
        lead.firstName || "",
        lead.lastName || "",
        lead.phone || "",
        lead.company || "",
        lead.notes || "",
        new Date(lead._creationTime).toISOString()
      ].map(field => `"${field}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all_leads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter leads based on search term only (lead magnet filtering is now handled by backend)
  const filteredLeads = allLeads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.engagements && lead.engagements.some(engagement => 
        engagement.leadMagnetTitle.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    
    return matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "scratch": return "✏️";
      case "pdf": return "📄";
      case "notion": return "📝";
      case "html": return "🌐";
      default: return "📄";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage all leads across your lead magnets</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search Leads
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Search by email, name, company, or lead magnet..."
            />
          </div>
          <div className="md:w-64">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filter by Lead Magnet
            </label>
            <select
              value={selectedMagnet}
              onChange={(e) => setSelectedMagnet(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Lead Magnets</option>
              {leadMagnets.map((magnet) => (
                <option key={magnet._id} value={magnet._id}>
                  {getTypeIcon(magnet.type)} {magnet.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{allLeads.length}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-full">
              <span className="text-lg">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Active Lead Magnets</p>
              <p className="text-2xl font-bold text-gray-900">{leadMagnets.filter(m => m.isActive).length}</p>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <span className="text-lg">🧲</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Avg Leads per Magnet</p>
              <p className="text-2xl font-bold text-gray-900">
                {leadMagnets.length > 0 ? Math.round(allLeads.length / leadMagnets.length) : 0}
              </p>
            </div>
            <div className="bg-purple-100 p-2 rounded-full">
              <span className="text-lg">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Leads ({filteredLeads.length})
          </h2>
          {allLeads.length > 0 && (
            <button
              onClick={downloadAllLeadsCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
            >
              Export All Leads
            </button>
          )}
        </div>

        {filteredLeads.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-3xl mb-3">👥</div>
            <h3 className="text-base font-medium text-gray-900 mb-2">
              {allLeads.length === 0 ? "No leads yet" : "No leads match your filters"}
            </h3>
            <p className="text-sm text-gray-600">
              {allLeads.length === 0 
                ? "Create some lead magnets and start collecting leads" 
                : "Try adjusting your search or filter criteria"
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 text-sm">Email</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 text-sm">First Name</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 text-sm">Last Name</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 text-sm">Company</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 text-sm">Phone</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 text-sm">Last Interacted</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 text-sm">Magnets</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead._id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="font-medium text-gray-900 text-sm">{lead.email}</div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-gray-900 text-sm">{lead.firstName || "-"}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-gray-900 text-sm">{lead.lastName || "-"}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-gray-900 text-sm">{lead.company || "-"}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-gray-900 text-sm">{lead.phone || "-"}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-xs text-gray-600">
                        {new Date(lead._creationTime).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => setSelectedLeadEmail(lead.email)}
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                      >
                        View Magnets
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedLeadEmail && (
        <LeadMagnetsModal email={selectedLeadEmail} onClose={() => setSelectedLeadEmail(null)} />
      )}
    </div>
  );
}
