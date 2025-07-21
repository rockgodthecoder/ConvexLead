import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { LeadMagnetCard } from "./LeadMagnetCard";
import { LeadMagnetDetails } from "./LeadMagnetDetails";
import { Id } from "../../convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";

export function LeadMagnetDashboard() {
  const navigate = useNavigate();
  const [selectedMagnetId, setSelectedMagnetId] = useState<Id<"leadMagnets"> | null>(null);
  const leadMagnets = useQuery(api.leadMagnets.list);

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
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Magnets</h1>
          <p className="text-gray-600 mt-2">Create and manage your lead generation campaigns</p>
        </div>
        <button
          onClick={() => navigate("/create-lead-magnet")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Create Lead Magnet
        </button>
      </div>

      {leadMagnets.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-gray-400 text-6xl mb-4">📧</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No lead magnets yet</h3>
          <p className="text-gray-600 mb-6">Create your first lead magnet to start collecting leads</p>
          <button
            onClick={() => navigate("/create-lead-magnet")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Create Your First Lead Magnet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leadMagnets.map((magnet) => (
            <LeadMagnetCard
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
