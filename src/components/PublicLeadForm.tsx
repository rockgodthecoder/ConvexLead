import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { PDFViewer } from "./PDFViewer";
import { TipTapContentViewer } from "./TipTapContentViewer";

interface PublicLeadFormProps {
  shareId: string;
}

export function PublicLeadForm({ shareId }: PublicLeadFormProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const magnet = useQuery(api.leadMagnets.getByShareId, { shareId });
  const createLead = useMutation(api.leads.createFromShare);

  // Debug logging
  console.log("ShareId:", shareId);
  console.log("Magnet query result:", magnet);

  // Add error handling for the query
  if (magnet === undefined) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!magnet) {
    return (
      <div className="text-center py-20">
        <div className="text-gray-400 text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Lead magnet not found</h3>
        <p className="text-gray-600">This lead magnet may have been deactivated or removed.</p>
        <p className="text-sm text-gray-500 mt-4">Share ID: {shareId}</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await createLead({
        shareId,
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
      });

      setIsSubmitted(true);
      toast.success("Thank you! Your information has been submitted.");
    } catch (error: any) {
      console.error("Error submitting lead:", error);
      const errorMessage = error?.message || error?.toString() || "Failed to submit information";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
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

  const fields = magnet?.fields || { firstName: true, lastName: true, email: true, phone: false, company: false };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Content Section - now appears first and more prominent */}
          {magnet?.type === "pdf" && magnet?.fileUrl && (
            <div className="mb-8">
              <PDFViewer 
                fileUrl={magnet.fileUrl} 
                title={magnet.title}
                className="w-full"
              />
            </div>
          )}

          {magnet?.type === "notion" && magnet?.notionUrl && (
            <a
              href={magnet.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mb-8"
            >
              📝 View Notion Page
            </a>
          )}

          {magnet?.type === "scratch" && magnet?.content && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg text-left border border-blue-200 shadow-sm">
              <h3 className="font-semibold mb-3 text-lg text-blue-700">Your Lead Magnet Content:</h3>
              <div className="text-gray-800 text-base leading-relaxed flex justify-center">
                <TipTapContentViewer content={magnet.content} />
              </div>
            </div>
          )}

          {magnet?.type === "html" && magnet?.content && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg text-left border border-blue-200 shadow-sm">
              <h3 className="font-semibold mb-3 text-lg text-blue-700">Your Lead Magnet Content:</h3>
              <div 
                className="text-gray-800 text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: magnet.content }}
              />
            </div>
          )}

          {/* Thank You Message - now below and less prominent */}
          <div className="mt-2 text-center">
            <div className="text-3xl mb-2">✅</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-500 mb-2 text-sm">
              Your information has been submitted successfully.
            </p>
            <p className="text-gray-400 text-xs">
              You can now access your lead magnet above.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white text-center">
          <div className="text-4xl mb-4">{getTypeIcon(magnet?.type || "pdf")}</div>
          <h1 className="text-3xl font-bold mb-2">{magnet?.title || "Lead Magnet"}</h1>
          {magnet?.description && (
            <p className="text-blue-100 text-lg">{magnet.description}</p>
          )}
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Get Your Free Lead Magnet
              </h2>
              <p className="text-gray-600">
                Fill out the form below to access your content
              </p>
            </div>

            {/* Email - Always shown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email address"
                required
              />
            </div>

            {/* First Name - Conditional */}
            {fields.firstName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your first name"
                />
              </div>
            )}

            {/* Last Name - Conditional */}
            {fields.lastName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your last name"
                />
              </div>
            )}

            {/* Phone - Conditional */}
            {fields.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>
            )}

            {/* Company - Conditional */}
            {fields.company && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your company name"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Get My Lead Magnet"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
