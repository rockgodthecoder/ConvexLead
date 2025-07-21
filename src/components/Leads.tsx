import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

export function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMagnet, setSelectedMagnet] = useState<string>("all");
  
  const leadMagnets = useQuery(api.leadMagnets.list);
  const allLeads = useQuery(api.leads.listAll);
  const deleteLead = useMutation(api.leads.remove);

  if (leadMagnets === undefined || allLeads === undefined) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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

  const downloadAllLeadsCSV = () => {
    if (!allLeads || allLeads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    const headers = ["Email", "First Name", "Last Name", "Phone", "Company", "Lead Magnet", "Notes", "Created At"];
    const csvContent = [
      headers.join(","),
      ...allLeads.map(lead => [
        lead.email,
        lead.firstName || "",
        lead.lastName || "",
        lead.phone || "",
        lead.company || "",
        lead.leadMagnetTitle,
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

  // Filter leads based on search term and selected magnet
  const filteredLeads = allLeads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.leadMagnetTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMagnet = selectedMagnet === "all" || lead.leadMagnetId === selectedMagnet;
    
    return matchesSearch && matchesMagnet;
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
          <h1 className="text-3xl font-bold text-gray-900">All Leads</h1>
          <p className="text-gray-600 mt-2">Manage all leads across your lead magnets</p>
        </div>
        {allLeads.length > 0 && (
          <button
            onClick={downloadAllLeadsCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Export All Leads
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-3xl font-bold text-gray-900">{allLeads.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Lead Magnets</p>
              <p className="text-3xl font-bold text-gray-900">{leadMagnets.filter(m => m.isActive).length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl">🧲</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Leads per Magnet</p>
              <p className="text-3xl font-bold text-gray-900">
                {leadMagnets.length > 0 ? Math.round(allLeads.length / leadMagnets.length) : 0}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Leads
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by email, name, company, or lead magnet..."
            />
          </div>
          <div className="md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Lead Magnet
            </label>
            <select
              value={selectedMagnet}
              onChange={(e) => setSelectedMagnet(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            Leads ({filteredLeads.length})
          </h2>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {allLeads.length === 0 ? "No leads yet" : "No leads match your filters"}
            </h3>
            <p className="text-gray-600">
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
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Phone</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Lead Magnet</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{lead.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        {lead.firstName || lead.lastName ? (
                          <span className="text-gray-900">
                            {[lead.firstName, lead.lastName].filter(Boolean).join(" ")}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-900">{lead.company || "-"}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-900">{lead.phone || "-"}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTypeIcon(lead.leadMagnetType)}</span>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {lead.leadMagnetTitle}
                          </div>
                          <div className="text-xs text-gray-500">
                            {lead.leadMagnetType === "scratch" ? "From Scratch" :
                             lead.leadMagnetType === "pdf" ? "PDF Upload" :
                             lead.leadMagnetType === "notion" ? "Notion Link" : "HTML File"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {new Date(lead._creationTime).toLocaleDateString()}
                      </span>
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
  );
}
