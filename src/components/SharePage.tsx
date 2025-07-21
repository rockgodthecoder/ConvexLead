import { useParams } from "react-router-dom";
import { PublicLeadForm } from "./PublicLeadForm";
import { ErrorBoundary } from "react-error-boundary";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-4">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

export function SharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  
  // Test Convex query
  const magnet = useQuery(api.leadMagnets.getByShareId, { shareId: shareId || "" });

  if (!shareId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600">The share link is invalid or malformed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <PublicLeadForm shareId={shareId} />
    </div>
  );
}
