import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { Sidebar } from "./components/Sidebar";
import { Home } from "./components/Home";
import { LeadMagnetDashboard } from "./components/LeadMagnetDashboard";
import { Leads } from "./components/Leads";
import { Analytics } from "./components/Analytics";
import { SharePage } from "./components/SharePage";
import { CreateLeadMagnet } from "./pages/CreateLeadMagnet";
import { MyPage } from "./components/MyPage";

export default function App() {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
              onClick={resetErrorBoundary}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    >
      <Router>
        <Routes>
          <Route path="/share/:shareId" element={<SharePage />} />
          <Route path="/create-lead-magnet" element={<CreateLeadMagnet />} />
          <Route path="/*" element={<MainApp />} />
        </Routes>
        <Toaster />
      </Router>
    </ErrorBoundary>
  );
}

function MainApp() {
  const [currentView, setCurrentView] = useState<"home" | "lead-magnets" | "leads" | "analytics" | "my-page">("home");

  return (
    <div className="h-screen flex bg-gray-50">
      <Authenticated>
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      </Authenticated>

      <div className="flex-1 flex flex-col h-screen">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-6">
          <h2 className="text-xl font-semibold text-blue-600">Lead Magnet Manager</h2>
          <Authenticated>
            <SignOutButton />
          </Authenticated>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          <Content currentView={currentView} />
        </main>
      </div>
    </div>
  );
}

function Content({ currentView }: { currentView: "home" | "lead-magnets" | "leads" | "analytics" | "my-page" }) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      <Authenticated>
        {currentView === "home" && <Home />}
        {currentView === "lead-magnets" && <LeadMagnetDashboard />}
        {currentView === "leads" && <Leads />}
        {currentView === "analytics" && <Analytics />}
        {currentView === "my-page" && <MyPage />}
      </Authenticated>
      
      <Unauthenticated>
        <div className="max-w-md mx-auto mt-20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-600 mb-4">Lead Magnet Manager</h1>
            <p className="text-xl text-gray-600">Create and manage your lead magnets</p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
