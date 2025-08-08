import { useState, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { SimpleEditor } from "../components/tiptap-templates/simple/simple-editor";
import { TipTapContentViewer } from "../components/TipTapContentViewer";

interface FieldConfig {
  firstName: boolean;
  lastName: boolean;
  email: boolean;
  phone: boolean;
  company: boolean;
}

export function CreateLeadMagnet() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"type" | "fields" | "details" | "cta">("type");
  const [type, setType] = useState<"scratch" | "pdf" | "notion" | "html" | null>(null);
  const [fields, setFields] = useState<FieldConfig>({
    firstName: true,
    lastName: true,
    email: true, // Always required
    phone: false,
    company: false,
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [notionUrl, setNotionUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // CTA state
  const [includeCta, setIncludeCta] = useState(false);
  const [ctaMainText, setCtaMainText] = useState("");
  const [ctaDescription, setCtaDescription] = useState("");
  const [ctaButtonText, setCtaButtonText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createLeadMagnet = useMutation(api.leadMagnets.create);
  const generateUploadUrl = useMutation(api.leadMagnets.generateUploadUrl);
  const getShareId = useMutation(api.leadMagnets.getShareId);
  const captureShareLinkScreenshot = useAction(api.screenshot.captureShareLinkScreenshot);


  const handleTypeSelect = (selectedType: "scratch" | "pdf" | "notion" | "html") => {
    setType(selectedType);
    setStep("fields");
  };

  const handleFieldToggle = (fieldName: keyof FieldConfig) => {
    if (fieldName === "email") return; // Email is always required
    setFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const handleFieldsNext = () => {
    setStep("details");
  };

  const handleDetailsNext = () => {
    setStep("cta");
  };

  const handleCtaNext = () => {
    // This will trigger the form submission
    const form = document.createElement('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (type === "pdf" && file.type !== "application/pdf") {
        toast.error("Please select a PDF file");
        return;
      }
      if (type === "html" && !file.name.endsWith(".html")) {
        toast.error("Please select an HTML file");
        return;
      }
      setSelectedFile(file);
    }
  };

    // Capture screenshot using action directly
  const captureScreenshot = async (leadMagnetId: string, shareId: string) => {
    try {
      console.log('📸 Capturing share link screenshot...');
      console.log('🌐 Calling action with:', { documentId: leadMagnetId, shareId });
      
      const fileId = await captureShareLinkScreenshot({ 
        documentId: leadMagnetId as any, 
        shareId: shareId 
      });
      
      console.log('✅ Screenshot captured and saved successfully:', fileId);
    } catch (error) {
      console.error('❌ Error capturing screenshot:', error);
      // Don't throw error - screenshot is optional
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !title.trim()) return;

    setIsUploading(true);
    try {
      let fileId = undefined;
      let finalContent = content;

      // Handle file upload for PDF and HTML
      if ((type === "pdf" || type === "html") && selectedFile) {
        const uploadUrl = await generateUploadUrl();
        console.log("Upload URL:", uploadUrl);
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        if (!result.ok) {
          const errorText = await result.text();
          console.error("Failed to upload file:", result.status, errorText);
          if (result.status === 412) {
            toast.error("Upload failed: The upload URL expired or was used twice. Please try again.");
          } else if (result.status === 413) {
            toast.error("Upload failed: File is too large.");
          } else {
            toast.error("Failed to upload file: " + result.status);
          }
          setIsUploading(false);
          return;
        }

        const { storageId } = await result.json();
        fileId = storageId;

        // For HTML files, also read the content
        if (type === "html") {
          finalContent = await selectedFile.text();
        }
      }

      console.log('Content to save:', finalContent);
      
      // Prepare CTA data
      const ctaData = includeCta ? {
        mainText: ctaMainText.trim(),
        description: ctaDescription.trim() || undefined,
        buttonText: ctaButtonText.trim(),
        link: ctaLink.trim(),
      } : undefined;

      const result = await createLeadMagnet({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        content: finalContent || undefined,
        fileId,
        notionUrl: notionUrl.trim() || undefined,
        fields,
        cta: ctaData,
      });

      // Capture screenshot after successful creation
      console.log('📄 Result:', result);
      
      // Handle both old format (just ID) and new format ({ id, shareId })
      let leadMagnetId, shareId;
      
      if (typeof result === 'string') {
        // Old format - just the ID
        leadMagnetId = result;
        console.log('📄 Using old format, need to get shareId');
        // Get the shareId from the created lead magnet
        try {
          const shareId = await getShareId({ id: leadMagnetId as any });
          if (shareId) {
            console.log('✅ ShareId retrieved:', shareId);
            console.log('📸 Lead magnet created, capturing screenshot...');
            // Capture screenshot in background (don't wait for it)
            captureScreenshot(leadMagnetId, shareId);
          } else {
            console.log('⚠️ Could not get shareId from lead magnet');
          }
        } catch (error) {
          console.log('⚠️ Error getting shareId:', error);
        }
      } else if (result?.id && result?.shareId) {
        // New format - object with id and shareId
        leadMagnetId = result.id;
        shareId = result.shareId;
        console.log('✅ ShareId available:', shareId);
        console.log('📸 Lead magnet created, capturing screenshot...');
        // Capture screenshot in background (don't wait for it)
        captureScreenshot(leadMagnetId, shareId);
      } else {
        console.log('❌ Unexpected result format:', result);
      }

      toast.success("Lead magnet created successfully!");
      navigate("/lead-magnets");
    } catch (error) {
      console.error("Error creating lead magnet:", error);
      toast.error("Failed to create lead magnet");
    } finally {
      setIsUploading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "type": return "Choose Creation Method";
      case "fields": return "Select Form Fields";
      case "details": return "Lead Magnet Details";
      case "cta": return "Call-to-Action (Optional)";
      default: return "Create Lead Magnet";
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case "type": return 1;
      case "fields": return 2;
      case "details": return 3;
      case "cta": return 4;
      default: return 1;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate("/lead-magnets")}
                className="text-gray-400 hover:text-gray-600 mr-4"
              >
                ← Back to Lead Magnets
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Create Lead Magnet</h1>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  getStepNumber() >= 1 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  1
                </div>
                <span className={`text-sm ${getStepNumber() >= 1 ? "text-blue-600" : "text-gray-500"}`}>
                  Setup
                </span>
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  getStepNumber() >= 2 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  2
                </div>
                <span className={`text-sm ${getStepNumber() >= 2 ? "text-blue-600" : "text-gray-500"}`}>
                  Fields
                </span>
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  getStepNumber() >= 3 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  3
                </div>
                <span className={`text-sm ${getStepNumber() >= 3 ? "text-blue-600" : "text-gray-500"}`}>
                  Content
                </span>
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  getStepNumber() >= 4 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  4
                </div>
                <span className={`text-sm ${getStepNumber() >= 4 ? "text-blue-600" : "text-gray-500"}`}>
                  CTA
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Step Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">{getStepTitle()}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === "type" && "Choose how you want to create your lead magnet"}
              {step === "fields" && "Select which information to collect from your leads"}
              {step === "details" && "Add your lead magnet details and content"}
              {step === "cta" && "Add an optional call-to-action to your lead magnet"}
            </p>
          </div>

          {/* Step Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {step === "type" && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => handleTypeSelect("scratch")}
                    className="p-8 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
                  >
                    <div className="text-4xl mb-4">✏️</div>
                    <h4 className="font-semibold mb-2 text-lg">From Scratch</h4>
                    <p className="text-gray-600">Create content directly in our rich text editor with advanced formatting options</p>
                    <div className="mt-4 text-sm text-blue-600 group-hover:text-blue-700">
                      Perfect for guides, checklists, templates →
                    </div>
                  </button>

                  <button
                    onClick={() => handleTypeSelect("pdf")}
                    className="p-8 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
                  >
                    <div className="text-4xl mb-4">📄</div>
                    <h4 className="font-semibold mb-2 text-lg">Upload PDF</h4>
                    <p className="text-gray-600">Upload an existing PDF document that you want to offer as a lead magnet</p>
                    <div className="mt-4 text-sm text-blue-600 group-hover:text-blue-700">
                      Great for reports, whitepapers, ebooks →
                    </div>
                  </button>

                  <button
                    disabled
                    className="p-8 border-2 border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed text-left opacity-60"
                  >
                    <div className="text-4xl mb-4 opacity-50">📝</div>
                    <h4 className="font-semibold mb-2 text-lg text-gray-500">Notion Link</h4>
                    <p className="text-gray-400">Link to a public Notion page that contains your lead magnet content</p>
                    <div className="mt-4 text-sm text-gray-400">
                      Coming soon →
                    </div>
                  </button>

                  <button
                    disabled
                    className="p-8 border-2 border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed text-left opacity-60"
                  >
                    <div className="text-4xl mb-4 opacity-50">🌐</div>
                    <h4 className="font-semibold mb-2 text-lg text-gray-500">HTML File</h4>
                    <p className="text-gray-400">Upload a custom HTML file for complete control over styling and layout</p>
                    <div className="mt-4 text-sm text-gray-400">
                      Coming soon →
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === "fields" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-6 pb-6">
                  <div className="flex items-center justify-between p-6 border border-gray-200 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">📧</span>
                      <div>
                        <h4 className="font-medium text-lg">Email Address</h4>
                        <p className="text-gray-600">Required for all lead magnets</p>
                      </div>
                    </div>
                    <div className="w-6 h-6 bg-blue-500 rounded border-2 border-blue-500 flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  </div>

                  {[
                    { key: "firstName" as const, icon: "👤", label: "First Name", desc: "Collect the lead's first name for personalization" },
                    { key: "lastName" as const, icon: "👤", label: "Last Name", desc: "Collect the lead's last name for personalization" },
                    { key: "phone" as const, icon: "📱", label: "Phone Number", desc: "Collect phone number for follow-up calls" },
                    { key: "company" as const, icon: "🏢", label: "Company Name", desc: "Collect company information for B2B targeting" },
                  ].map((field) => (
                    <div key={field.key} className="flex items-center justify-between p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{field.icon}</span>
                        <div>
                          <h4 className="font-medium text-lg">{field.label}</h4>
                          <p className="text-gray-600">{field.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFieldToggle(field.key)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          fields[field.key]
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {fields[field.key] && <span className="text-white text-sm">✓</span>}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 pt-6 bg-white py-4 border-t border-gray-200">
                  <button
                    onClick={() => setStep("type")}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleFieldsNext}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {step === "details" && (
              <div className="flex flex-col h-full">
                <form className="flex-1 overflow-y-auto space-y-8 pb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter a compelling title for your lead magnet"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe what users will get from this lead magnet"
                    />
                  </div>

                  {type === "scratch" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        Content
                      </label>
                      <div className="border border-gray-300 rounded-lg overflow-hidden simple-editor-container">
                        <SimpleEditor initialContent={content} onChange={(val) => { console.log('Editor onChange:', val); setContent(val); }} />
                      </div>
                    </div>
                  )}

                  {type === "notion" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notion URL *
                      </label>
                      <input
                        type="url"
                        value={notionUrl}
                        onChange={(e) => setNotionUrl(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://notion.so/your-page"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Make sure your Notion page is publicly accessible
                      </p>
                    </div>
                  )}

                  {(type === "pdf" || type === "html") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {type === "pdf" ? "PDF File" : "HTML File"} *
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={type === "pdf" ? ".pdf" : ".html"}
                        onChange={handleFileSelect}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {selectedFile && (
                        <p className="text-sm text-green-600 mt-2">
                          ✓ Selected: {selectedFile.name}
                        </p>
                      )}
                    </div>
                  )}
                </form>

                <div className="flex gap-4 pt-6 bg-white py-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setStep("fields")}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleDetailsNext}
                    disabled={!title.trim()}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {step === "cta" && (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">🎯</span>
                      <div>
                        <h4 className="font-medium text-lg">Include Call-to-Action</h4>
                        <p className="text-gray-600">Add a compelling CTA to encourage further engagement</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIncludeCta(!includeCta)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        includeCta
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {includeCta && <span className="text-white text-sm">✓</span>}
                    </button>
                  </div>

                  {includeCta && (
                    <div className="space-y-6 p-6 border border-gray-200 rounded-lg bg-blue-50">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CTA Main Text *
                        </label>
                        <input
                          type="text"
                          value={ctaMainText}
                          onChange={(e) => setCtaMainText(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., 'Book a Free Consultation' or 'Download More Resources'"
                          required={includeCta}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CTA Description
                        </label>
                        <textarea
                          value={ctaDescription}
                          onChange={(e) => setCtaDescription(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Brief description of what happens when they click the CTA"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Button Text *
                        </label>
                        <input
                          type="text"
                          value={ctaButtonText}
                          onChange={(e) => setCtaButtonText(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., 'Book Now', 'Download', 'Get Started'"
                          required={includeCta}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CTA Link *
                        </label>
                        <input
                          type="url"
                          value={ctaLink}
                          onChange={(e) => setCtaLink(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://calendly.com/your-link or https://your-website.com/page"
                          required={includeCta}
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          This is where users will be directed when they click the CTA
                        </p>
                      </div>

                      {/* CTA Preview */}
                      <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-3">Preview:</h5>
                        <div className="flex justify-center">
                          <div className="bg-blue-600 text-white p-4 rounded-lg text-center max-w-sm">
                            <h4 className="font-semibold text-lg mb-2">{ctaMainText || "Your CTA Text"}</h4>
                            {ctaDescription && (
                              <p className="text-blue-100 mb-3">{ctaDescription}</p>
                            )}
                                                      <a 
                            href={ctaLink || "#"} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-gray-100 transition-colors"
                          >
                            {ctaButtonText || "Click Here"}
                          </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-6 sticky bottom-0 bg-white py-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setStep("details")}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || (includeCta && (!ctaMainText.trim() || !ctaButtonText.trim() || !ctaLink.trim()))}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {isUploading ? "Creating..." : "Create Lead Magnet"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 