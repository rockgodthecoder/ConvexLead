import { useState } from "react";

interface SidebarProps {
  currentView: "home" | "lead-magnets" | "leads" | "analytics";
  onViewChange: (view: "home" | "lead-magnets" | "leads" | "analytics") => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      id: "home" as const,
      label: "Home",
      icon: "🏠",
      description: "Dashboard overview"
    },
    {
      id: "lead-magnets" as const,
      label: "Lead Magnets",
      icon: "🧲",
      description: "Manage your lead magnets"
    },
    {
      id: "leads" as const,
      label: "Leads",
      icon: "👥",
      description: "View all collected leads"
    },
    {
      id: "analytics" as const,
      label: "Analytics",
      icon: "📊",
      description: "View performance metrics"
    }
  ];

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } flex flex-col`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
          >
            {isCollapsed ? "→" : "←"}
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {!isCollapsed && (
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
