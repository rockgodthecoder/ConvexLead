import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useState } from "react";

export function Home() {
  const [trendsFilter, setTrendsFilter] = useState<'all' | '7' | '30' | '90'>('all');
  const leadMagnets = useQuery(api.leadMagnets.list);
  const user = useQuery(api.auth.loggedInUser);
  const allLeads = useQuery(api.leads.listAll);
  const allSessions = useQuery(api.analytics.getSessionsForAllLeadMagnets);

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

  // Generate analytics data from all lead magnets
  const generateAnalytics = () => {
    if (!allLeads || !allSessions || !leadMagnets) return {
      trends: []
    };

    // Generate trends data by aggregating leads, sessions, and views by date across all magnets
    const leadsByDate = new Map<string, number>();
    const sessionsByDate = new Map<string, number>();
    const viewsByDate = new Map<string, number>();
    
    // Aggregate leads by date
    allLeads.forEach(lead => {
      const date = new Date(lead._creationTime).toISOString().split('T')[0]; // YYYY-MM-DD format
      leadsByDate.set(date, (leadsByDate.get(date) || 0) + 1);
    });

    // Aggregate sessions by date
    allSessions.forEach(session => {
      const date = new Date(session.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD format
      sessionsByDate.set(date, (sessionsByDate.get(date) || 0) + 1);
    });

    // Aggregate views by date from lead magnets
    leadMagnets.forEach(magnet => {
      if (magnet.formViews && magnet.formViews > 0) {
        // For simplicity, we'll distribute views across the creation date
        // In a real implementation, you might want to track actual view dates
        const date = new Date(magnet._creationTime).toISOString().split('T')[0];
        viewsByDate.set(date, (viewsByDate.get(date) || 0) + magnet.formViews);
      }
    });

    // Get all unique dates
    const allDates = new Set([...leadsByDate.keys(), ...sessionsByDate.keys(), ...viewsByDate.keys()]);
    
    // Convert to trends array and sort by date
    const trends = Array.from(allDates)
      .map(date => ({ 
        date, 
        leads: leadsByDate.get(date) || 0,
        sessions: sessionsByDate.get(date) || 0,
        views: viewsByDate.get(date) || 0
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      trends
    };
  };

  const analytics = generateAnalytics();

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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">
          Welcome back! 👋
        </h1>
        <p className="text-blue-100 text-sm">
          Here's an overview of your lead generation performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Lead Magnets</p>
              <p className="text-2xl font-bold text-gray-900">{leadMagnets?.length || 0}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-full">
              <span className="text-lg">🧲</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Active Magnets</p>
              <p className="text-2xl font-bold text-gray-900">{activeMagnets}</p>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <span className="text-lg">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{totalLeads}</p>
            </div>
            <div className="bg-purple-100 p-2 rounded-full">
              <span className="text-lg">📧</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Performance Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Overall Lead Generation Performance</h2>
            <span className="text-xs text-gray-500">All lead magnets combined</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="trendsFilter" className="text-xs font-medium text-gray-700">
              Filter:
            </label>
            <select
              id="trendsFilter"
              value={trendsFilter}
              onChange={(e) => setTrendsFilter(e.target.value as 'all' | '7' | '30' | '90')}
              className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
        </div>

        {filteredTrends.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-3xl mb-3">📊</div>
            <h3 className="text-base font-medium text-gray-900 mb-2">No data for selected period</h3>
            <p className="text-gray-600 text-sm">Try selecting a different time period or start collecting leads</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={filteredTrends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: any, name: any) => [`${value} ${name}`, name]} 
                  labelFormatter={label => `Date: ${label}`} 
                />
                <Line 
                  type="monotone" 
                  dataKey="leads" 
                  stroke="#2563eb" 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }} 
                  name="leads"
                />
                <Line 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }} 
                  name="sessions"
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }} 
                  name="views"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Lead Magnets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Lead Magnets</h2>
          <span className="text-xs text-gray-500">Last 3 created</span>
        </div>

        {recentMagnets.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-3xl mb-3">🧲</div>
            <h3 className="text-base font-medium text-gray-900 mb-2">No lead magnets yet</h3>
            <p className="text-gray-600 text-sm">Create your first lead magnet to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMagnets.map((magnet) => (
              <div key={magnet._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {magnet.type === "scratch" ? "✏️" : 
                     magnet.type === "pdf" ? "📄" : 
                     magnet.type === "notion" ? "📝" : "🌐"}
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{magnet.title}</h3>
                    <p className="text-xs text-gray-600">
                      {magnet.leadsCount} leads • Created {new Date(magnet._creationTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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


    </div>
  );
}
