import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function Home() {
  const leadMagnets = useQuery(api.leadMagnets.list);
  const user = useQuery(api.auth.loggedInUser);

  if (leadMagnets === undefined || user === undefined) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalLeads = leadMagnets?.reduce((sum, magnet) => sum + magnet.leadsCount, 0) || 0;
  const activeMagnets = leadMagnets?.filter(magnet => magnet.isActive).length || 0;
  const recentMagnets = leadMagnets?.slice(0, 3) || [];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name || 'User'}! 👋
        </h1>
        <p className="text-blue-100 text-lg">
          Here's an overview of your lead generation performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Lead Magnets</p>
              <p className="text-3xl font-bold text-gray-900">{leadMagnets?.length || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-2xl">🧲</span>
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
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-3xl font-bold text-gray-900">{totalLeads}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <span className="text-2xl">📧</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Lead Magnets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Lead Magnets</h2>
          <span className="text-sm text-gray-500">Last 3 created</span>
        </div>

        {recentMagnets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">🧲</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No lead magnets yet</h3>
            <p className="text-gray-600">Create your first lead magnet to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentMagnets.map((magnet) => (
              <div key={magnet._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {magnet.type === "scratch" ? "✏️" : 
                     magnet.type === "pdf" ? "📄" : 
                     magnet.type === "notion" ? "📝" : "🌐"}
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900">{magnet.title}</h3>
                    <p className="text-sm text-gray-600">
                      {magnet.leadsCount} leads • Created {new Date(magnet._creationTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    magnet.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {magnet.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">➕</span>
              <h3 className="font-medium text-gray-900">Create New Lead Magnet</h3>
            </div>
            <p className="text-sm text-gray-600">Start a new lead generation campaign</p>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📊</span>
              <h3 className="font-medium text-gray-900">View Analytics</h3>
            </div>
            <p className="text-sm text-gray-600">Check your performance metrics</p>
          </div>
        </div>
      </div>
    </div>
  );
}
