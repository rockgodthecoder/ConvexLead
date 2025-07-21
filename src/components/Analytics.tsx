import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function Analytics() {
  const leadMagnets = useQuery(api.leadMagnets.list);

  if (leadMagnets === undefined) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalLeads = leadMagnets.reduce((sum, magnet) => sum + magnet.leadsCount, 0);
  const activeMagnets = leadMagnets.filter(magnet => magnet.isActive).length;
  const inactiveMagnets = leadMagnets.length - activeMagnets;
  
  // Calculate performance metrics
  const avgLeadsPerMagnet = leadMagnets.length > 0 ? Math.round(totalLeads / leadMagnets.length) : 0;
  const topPerformer = leadMagnets.length > 0 
    ? leadMagnets.reduce((top, magnet) => 
        magnet.leadsCount > top.leadsCount ? magnet : top)
    : null;

  // Group by type
  const typeStats = leadMagnets.reduce((acc, magnet) => {
    acc[magnet.type] = (acc[magnet.type] || 0) + magnet.leadsCount;
    return acc;
  }, {} as Record<string, number>);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "scratch": return "From Scratch";
      case "pdf": return "PDF Upload";
      case "notion": return "Notion Link";
      case "html": return "HTML File";
      default: return type;
    }
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">Track your lead generation performance</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-3xl font-bold text-gray-900">{totalLeads}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-2xl">📧</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Magnets</p>
              <p className="text-3xl font-bold text-gray-900">{activeMagnets}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactive Magnets</p>
              <p className="text-3xl font-bold text-gray-900">{inactiveMagnets}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-full">
              <span className="text-2xl">⏸️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Leads/Magnet</p>
              <p className="text-3xl font-bold text-gray-900">{avgLeadsPerMagnet}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance by Type */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance by Type</h2>
        
        {Object.keys(typeStats).length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
            <p className="text-gray-600">Create some lead magnets to see analytics</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(typeStats).map(([type, leads]) => (
              <div key={type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTypeIcon(type)}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{getTypeLabel(type)}</h3>
                    <p className="text-sm text-gray-600">{leads} total leads</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">{leads}</div>
                  <div className="text-sm text-gray-500">
                    {totalLeads > 0 ? Math.round((leads / totalLeads) * 100) : 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Performer */}
      {topPerformer && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Performer</h2>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-4 rounded-full">
                <span className="text-3xl">🏆</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{topPerformer.title}</h3>
                <p className="text-gray-600 mb-2">{topPerformer.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                    {topPerformer.leadsCount} leads
                  </span>
                  <span className="text-gray-500">
                    {getTypeLabel(topPerformer.type)}
                  </span>
                  <span className="text-gray-500">
                    Created {new Date(topPerformer._creationTime).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Lead Magnets Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">All Lead Magnets</h2>
        
        {leadMagnets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">🧲</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No lead magnets yet</h3>
            <p className="text-gray-600">Create your first lead magnet to see detailed analytics</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Lead Magnet</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Leads</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody>
                {leadMagnets
                  .sort((a, b) => b.leadsCount - a.leadsCount)
                  .map((magnet) => (
                    <tr key={magnet._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{magnet.title}</div>
                          {magnet.description && (
                            <div className="text-sm text-gray-600 truncate max-w-xs">
                              {magnet.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getTypeIcon(magnet.type)}</span>
                          <span className="text-sm text-gray-600">
                            {getTypeLabel(magnet.type)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          magnet.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {magnet.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900">{magnet.leadsCount}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(magnet._creationTime).toLocaleDateString()}
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
