import { useState } from "react";

export function Email() {
  const [activeTab, setActiveTab] = useState<"flow" | "custom">("flow");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Campaigns</h1>
          <p className="text-gray-600 mt-1">Manage your email flows and custom campaigns</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("flow")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "flow"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            📊 Trigger
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "custom"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            ✉️ Custom
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "flow" && <FlowTab />}
        {activeTab === "custom" && <CustomTab />}
      </div>
    </div>
  );
}

function FlowTab() {
  const [flows, setFlows] = useState([
    {
      id: 1,
      name: "Book Call",
      icon: "📞",
      color: "green",
      status: "active",
      subscribers: 2100,
      conditions: [
        { id: 1, type: "cta_click", enabled: true, value: "" },
        { id: 2, type: "read_time", enabled: false, value: "30" }
      ],
      logic: "AND"
    }
  ]);
  const [isFlowActive, setIsFlowActive] = useState(false);
  const [bookCallLink, setBookCallLink] = useState("");

  const handleConditionToggle = (flowId: number, conditionId: number) => {
    setFlows(flows.map(flow => 
      flow.id === flowId 
        ? {
            ...flow,
            conditions: flow.conditions.map(condition =>
              condition.id === conditionId
                ? { ...condition, enabled: !condition.enabled }
                : condition
            )
          }
        : flow
    ));
  };

  const handleLogicChange = (flowId: number, logic: "AND" | "OR") => {
    setFlows(flows.map(flow => 
      flow.id === flowId ? { ...flow, logic } : flow
    ));
  };

  const handleCreateFlow = () => {
    if (!bookCallLink.trim()) {
      alert("Please enter a booking link before creating a trigger!");
      return;
    }
    // Keep the button unchanged, just show a success message
    alert("Trigger created!");
  };

  const getConditionLabel = (type: string) => {
    switch (type) {
      case "cta_click": return "Clicked CTA";
      case "read_time": return "Read for X seconds";
      default: return type;
    }
  };

  const getConditionInput = (condition: any) => {
    if (condition.type === "cta_click") {
      return null; // No value needed for CTA click
    }
    if (condition.type === "read_time") {
      return (
        <input
          type="number"
          value={condition.value}
          onChange={(e) => {
            setFlows(flows.map(flow => 
              flow.id === condition.flowId 
                ? {
                    ...flow,
                    conditions: flow.conditions.map(c =>
                      c.id === condition.id ? { ...c, value: e.target.value } : c
                    )
                  }
                : flow
            ));
          }}
          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded ml-2"
          placeholder="0"
        />
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Email Triggers</h2>
          <button 
            onClick={handleCreateFlow}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Create Trigger
          </button>
        </div>

        {/* Book Call Link Input */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-medium text-gray-700">📞 Book Call Link:</span>
          </div>
          <input
            type="url"
            value={bookCallLink}
            onChange={(e) => setBookCallLink(e.target.value)}
            placeholder="https://calendly.com/your-link"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the link where users can book a call (e.g., Calendly, Acuity, etc.)
          </p>
        </div>
        
        <div className="space-y-6">
          {flows.map((flow) => (
            <div key={flow.id} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 bg-${flow.color}-100 rounded-lg flex items-center justify-center`}>
                  <span className={`text-${flow.color}-600 text-xl`}>{flow.icon}</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{flow.name}</h3>
                </div>
              </div>

              {/* Conditions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-gray-700">Conditions:</span>
                  <select
                    value={flow.logic}
                    onChange={(e) => handleLogicChange(flow.id, e.target.value as "AND" | "OR")}
                    className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  {flow.conditions.map((condition, index) => (
                    <div key={condition.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={condition.enabled}
                        onChange={() => handleConditionToggle(flow.id, condition.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 min-w-[120px]">
                        {getConditionLabel(condition.type)}
                      </span>
                                             {condition.type === "read_time" && (
                         <div className="flex items-center">
                           {getConditionInput({ ...condition, flowId: flow.id })}
                           <span className="text-sm text-gray-500 ml-1">sec</span>
                         </div>
                       )}
                      {index < flow.conditions.length - 1 && (
                        <span className="text-sm text-gray-400 font-medium">
                          {flow.logic}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Flow Summary */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                 <p className="text-sm text-gray-600">
                   <strong>Summary:</strong> Email people who {
                     flow.conditions
                       .filter(c => c.enabled)
                       .map((condition, index) => {
                         const label = getConditionLabel(condition.type);
                         const value = condition.value ? ` ${condition.value} seconds` : "";
                         const isLast = index === flow.conditions.filter(c => c.enabled).length - 1;
                         return `${label}${value}${!isLast ? ` ${flow.logic.toLowerCase()} ` : ""}`;
                       })
                       .join("")
                   }
                 </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Triggers Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-green-600 text-lg">✅</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Active Triggers</h3>
            <p className="text-sm text-gray-600">Currently running email triggers</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-sm">📞</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Book Call</h4>
                <p className="text-sm text-gray-600">Email people who clicked CTA AND read for 30 seconds</p>
                {bookCallLink && (
                  <p className="text-xs text-blue-600 mt-1">
                    📞 <a href={bookCallLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">
                      {bookCallLink}
                    </a>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function CustomTab() {
  const [sortField, setSortField] = useState<"email" | "firstName" | "lastName" | "sessions" | "date" | "score">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [flows, setFlows] = useState([
    {
      id: 1,
      name: "Book Call",
      icon: "📞",
      color: "green",
      status: "active",
      subscribers: 2100,
      conditions: [
        { id: 1, type: "cta_click", enabled: true, value: "" },
        { id: 2, type: "read_time", enabled: false, value: "30" }
      ],
      logic: "AND"
    }
  ]);

  // Mock data - replace with real data from your leads
  const leads = [
    {
      id: 1,
      email: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
      sessions: 5,
      date: "2024-01-15",
      score: 85
    },
    {
      id: 2,
      email: "jane.smith@example.com",
      firstName: "Jane",
      lastName: "Smith",
      sessions: 12,
      date: "2024-01-14",
      score: 92
    },
    {
      id: 3,
      email: "mike.johnson@example.com",
      firstName: "Mike",
      lastName: "Johnson",
      sessions: 3,
      date: "2024-01-13",
      score: 67
    },
    {
      id: 4,
      email: "sarah.wilson@example.com",
      firstName: "Sarah",
      lastName: "Wilson",
      sessions: 8,
      date: "2024-01-12",
      score: 78
    },
    {
      id: 5,
      email: "david.brown@example.com",
      firstName: "David",
      lastName: "Brown",
      sessions: 15,
      date: "2024-01-11",
      score: 95
    },
    {
      id: 6,
      email: "emma.davis@example.com",
      firstName: "Emma",
      lastName: "Davis",
      sessions: 7,
      date: "2024-01-10",
      score: 81
    },
    {
      id: 7,
      email: "alex.taylor@example.com",
      firstName: "Alex",
      lastName: "Taylor",
      sessions: 4,
      date: "2024-01-09",
      score: 73
    },
    {
      id: 8,
      email: "lisa.anderson@example.com",
      firstName: "Lisa",
      lastName: "Anderson",
      sessions: 10,
      date: "2024-01-08",
      score: 88
    }
  ];

  // Sort leads based on current sort field and direction
  const sortedLeads = [...leads].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    // Handle string comparison
    if (typeof aValue === "string" && typeof bValue === "string") {
      const aLower = aValue.toLowerCase();
      const bLower = bValue.toLowerCase();
      if (aLower < bLower) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aLower > bLower) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    }
    
    // Handle number comparison
    if (typeof aValue === "number" && typeof bValue === "number") {
      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    }
    
    return 0;
  });

  const handleSort = (field: "email" | "firstName" | "lastName" | "sessions" | "date" | "score") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: "email" | "firstName" | "lastName" | "sessions" | "date" | "score") => {
    if (sortField !== field) {
      return "↕️";
    }
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const handleSelectLead = (leadId: number) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedLeads.size === sortedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(sortedLeads.map(lead => lead.id)));
    }
  };

  const handleEmailAll = () => {
    if (selectedLeads.size === 0) {
      alert("Please select at least one lead to email.");
      return;
    }
    setShowEmailModal(true);
  };

  const handleSendEmail = () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert("Please fill in both subject and body.");
      return;
    }
    const selectedEmails = sortedLeads
      .filter(lead => selectedLeads.has(lead.id))
      .map(lead => lead.email);
    console.log("Emailing to:", selectedEmails);
    console.log("Subject:", emailSubject);
    console.log("Body:", emailBody);
    alert(`Email sent to ${selectedLeads.size} leads!`);
    setShowEmailModal(false);
    setEmailSubject("");
    setEmailBody("");
  };

  const handleCloseModal = () => {
    setShowEmailModal(false);
    setEmailSubject("");
    setEmailBody("");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Leads Database</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">
              {selectedLeads.size} of {sortedLeads.length} leads selected
            </span>
            <button 
              onClick={handleEmailAll}
              disabled={selectedLeads.size === 0}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                selectedLeads.size === 0 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Email All ({selectedLeads.size})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === sortedLeads.length && sortedLeads.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                  />
                </th>
                <th 
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center gap-1">
                    Email {getSortIcon("email")}
                  </div>
                </th>
                <th 
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("firstName")}
                >
                  <div className="flex items-center gap-1">
                    First Name {getSortIcon("firstName")}
                  </div>
                </th>
                <th 
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("lastName")}
                >
                  <div className="flex items-center gap-1">
                    Last Name {getSortIcon("lastName")}
                  </div>
                </th>
                <th 
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("sessions")}
                >
                  <div className="flex items-center gap-1">
                    Sessions {getSortIcon("sessions")}
                  </div>
                </th>
                <th 
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center gap-1">
                    Date {getSortIcon("date")}
                  </div>
                </th>
                <th 
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("score")}
                >
                  <div className="flex items-center gap-1">
                    Score {getSortIcon("score")}
                  </div>
                </th>

              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => handleSelectLead(lead.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                    {lead.email}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {lead.firstName}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {lead.lastName}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {lead.sessions}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {lead.date}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                      lead.score >= 90 ? 'bg-green-100 text-green-800' :
                      lead.score >= 80 ? 'bg-blue-100 text-blue-800' :
                      lead.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {lead.score}
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedLeads.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600">Try adjusting your filters to see more results.</p>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Email</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipients ({selectedLeads.size} leads selected)
                </label>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                  {sortedLeads
                    .filter(lead => selectedLeads.has(lead.id))
                    .map(lead => lead.email)
                    .join(", ")}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Line *
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body *
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Enter your email content..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 