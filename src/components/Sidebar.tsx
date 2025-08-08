import { useState } from "react";

interface SidebarProps {
  currentView: "home" | "lead-magnets" | "leads" | "analytics" | "my-page" | "email";
  onViewChange: (view: "home" | "lead-magnets" | "leads" | "analytics" | "my-page" | "email") => void;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({ currentView, onViewChange, isCollapsed: externalIsCollapsed, onCollapseChange }: SidebarProps) {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const [showExpandTooltip, setShowExpandTooltip] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = onCollapseChange || setInternalIsCollapsed;

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
    // Email functionality temporarily disabled
    // {
    //   id: "email" as const,
    //   label: "Email",
    //   icon: "📧",
    //   description: "Email campaigns & flows"
    // },
    {
      id: "my-page" as const,
      label: "My Page",
      icon: "👤",
      description: "Share & preview content"
    }
  ];

  return (
    <div
      className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-48'
      } flex flex-col min-h-screen relative`}
      // Remove tooltip logic
    >
      <div className="p-1.5 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1.5">
          {!isCollapsed && (
            <h2 className="text-sm font-semibold text-gray-900">Navigation</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-0.5 rounded-md hover:bg-gray-100 text-gray-500 text-xs"
          >
            {isCollapsed ? "→" : "←"}
          </button>
        </div>
        {isCollapsed ? (
          <div className="flex justify-center mb-1.5">
            <button
              onClick={() => window.location.href = '/create-lead-magnet'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center shadow transition-colors text-xs"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => window.location.href = '/create-lead-magnet'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 rounded-md text-xs flex items-center justify-center gap-1 shadow transition-colors"
          >
            <span className="text-xs font-bold">+</span> Create Lead Magnet
          </button>
        )}
      </div>

      <nav className="flex-1 p-1 overflow-y-auto">
        <ul className="space-y-0.5">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-1.5'} px-1.5 py-1 rounded-md text-left transition-colors text-xs ${
                  currentView === item.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-base flex items-center justify-center w-6 h-6">{item.icon}</span>
                {!isCollapsed && (
                  <div>
                    <div className="font-medium text-xs">{item.label}</div>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {/* User profile section at bottom left */}
      <div className="mt-auto p-1.5">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-1.5'}`}>
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
            M
          </div>
          {!isCollapsed && (
            <div>
              <div className="font-semibold text-gray-900 text-xs">Marcus Yap</div>
              <div className="text-xs text-gray-500 leading-tight">yap.engkean@gmail.com</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
