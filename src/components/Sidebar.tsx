import { useState } from "react";

interface SidebarProps {
  currentView: "home" | "lead-magnets" | "leads" | "analytics" | "my-page";
  onViewChange: (view: "home" | "lead-magnets" | "leads" | "analytics" | "my-page") => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showExpandTooltip, setShowExpandTooltip] = useState(false);

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
      id: "my-page" as const,
      label: "My Page",
      icon: "👤",
      description: "Your docs & profile"
    }
  ];

  return (
    <div
      className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } flex flex-col min-h-screen relative`}
      // Remove tooltip logic
    >
      <div className="p-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          {!isCollapsed && (
            <h2 className="text-base font-semibold text-gray-900">Navigation</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-0.5 rounded-md hover:bg-gray-100 text-gray-500 text-sm"
          >
            {isCollapsed ? "→" : "←"}
          </button>
        </div>
        {isCollapsed ? (
          <div className="flex justify-center mb-2">
            <button
              onClick={() => window.location.href = '/create-lead-magnet'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center shadow transition-colors text-base"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => window.location.href = '/create-lead-magnet'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm flex items-center justify-center gap-1 shadow transition-colors"
          >
            <span className="text-base font-bold">+</span> Create Lead Magnet
          </button>
        )}
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 py-1.5 rounded-lg text-left transition-colors text-sm ${
                  currentView === item.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg flex items-center justify-center w-7 h-7">{item.icon}</span>
                {!isCollapsed && (
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {/* User profile section at bottom left */}
      <div className="mt-auto p-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base font-semibold text-gray-600">
            M
          </div>
          {!isCollapsed && (
            <div>
              <div className="font-semibold text-gray-900 text-sm">Marcus Yap</div>
              <div className="text-xs text-gray-500">yap.engkean@gmail.com</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
