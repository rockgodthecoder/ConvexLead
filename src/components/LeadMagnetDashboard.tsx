import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { LeadMagnetCard } from "./LeadMagnetCard";
import { LeadMagnetDetails } from "./LeadMagnetDetails";
import { Id } from "../../convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";

function GridIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  );
}
function ListIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="4" cy="18" r="2"/></svg>
  );
}

function LeadMagnetListItem({ magnet, onClick }: { magnet: any; onClick: () => void }) {
  const lastUpdated = magnet.lastUpdated ?? magnet._creationTime;
  return (
    <div
      className="flex items-center px-3 py-2 hover:bg-gray-50 transition cursor-pointer border-b"
      onClick={onClick}
    >
      {/* Icon/avatar */}
      <div className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 mr-3">
        <span className="text-lg">🧲</span>
      </div>
      {/* Title */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate text-sm">{magnet.title}</div>
      </div>
      {/* Responses */}
      <div className="w-20 text-center text-gray-700 text-xs">{magnet.leadsCount ?? "-"}</div>
      {/* Updated */}
      <div className="w-28 text-center text-gray-700 text-xs">{new Date(lastUpdated).toLocaleDateString()}</div>
      {/* Actions */}
      <div className="w-8 flex justify-center">
        <button className="text-gray-400 hover:text-gray-600 text-sm">
          <span className="sr-only">Actions</span>
          &#x22EE;
        </button>
      </div>
    </div>
  );
}

interface LeadMagnetDashboardProps {
  onCollapseSidebar?: () => void;
}

export function LeadMagnetDashboard({ onCollapseSidebar }: LeadMagnetDashboardProps) {
  const navigate = useNavigate();
  const [selectedMagnetId, setSelectedMagnetId] = useState<Id<"leadMagnets"> | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const leadMagnets = useQuery(api.leadMagnets.list);

  const sortedLeadMagnets = (leadMagnets ?? []).slice().sort((a, b) => {
    if (dateSort === "newest") {
      return b._creationTime - a._creationTime;
    } else {
      return a._creationTime - b._creationTime;
    }
  });

  if (leadMagnets === undefined) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (selectedMagnetId) {
    return (
      <LeadMagnetDetails
        magnetId={selectedMagnetId}
        onBack={() => setSelectedMagnetId(null)}
        onCollapseSidebar={onCollapseSidebar}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Magnets</h1>
          <p className="text-gray-600 mt-1 text-sm">Create and manage your lead generation campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date filter dropdown */}
          <select
            value={dateSort}
            onChange={e => setDateSort(e.target.value as "newest" | "oldest")}
            className="border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Date created (newest)</option>
            <option value="oldest">Date created (oldest)</option>
          </select>
          <button
            className={`p-1.5 rounded ${view === "grid" ? "bg-blue-100" : ""}`}
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <GridIcon className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 rounded ${view === "list" ? "bg-blue-100" : ""}`}
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <ListIcon className="w-4 h-4" />
          </button>
        <button
            onClick={() => navigate("/create-lead-magnet")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors ml-3 text-sm"
        >
          Create Lead Magnet
        </button>
        </div>
      </div>

      {leadMagnets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-3">📧</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No lead magnets yet</h3>
          <p className="text-gray-600 mb-4 text-sm">Create your first lead magnet to start collecting leads</p>
          <button
            onClick={() => navigate("/create-lead-magnet")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
          >
            Create Your First Lead Magnet
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedLeadMagnets.map((magnet) => (
            <LeadMagnetCard
              key={magnet._id}
              magnet={magnet}
              onClick={() => setSelectedMagnetId(magnet._id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          {/* Header */}
          <div className="flex items-center px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-b">
            <div className="w-8 mr-3"></div>
            <div className="flex-1 min-w-0">Title</div>
            <div className="w-20 text-center">Responses</div>
            <div className="w-28 text-center">Updated</div>
            <div className="w-8"></div>
          </div>
          {/* Rows */}
          {sortedLeadMagnets.map((magnet) => (
            <LeadMagnetListItem
              key={magnet._id}
              magnet={magnet}
              onClick={() => setSelectedMagnetId(magnet._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
