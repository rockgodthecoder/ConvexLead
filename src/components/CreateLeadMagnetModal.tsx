import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { SimpleEditor } from "./tiptap-templates/simple/simple-editor";

interface CreateLeadMagnetModalProps {
  onClose: () => void;
}

interface FieldConfig {
  firstName: boolean;
  lastName: boolean;
  email: boolean;
  phone: boolean;
  company: boolean;
}

export function CreateLeadMagnetModal({ onClose }: CreateLeadMagnetModalProps) {
  const [step, setStep] = useState<"type" | "fields" | "details">("type");
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createLeadMagnet = useMutation(api.leadMagnets.create);
  const generateUploadUrl = useMutation(api.leadMagnets.generateUploadUrl);

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
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        if (!result.ok) {
          throw new Error("Failed to upload file");
        }

        const { storageId } = await result.json();
        fileId = storageId;

        // For HTML files, also read the content
        if (type === "html") {
          finalContent = await selectedFile.text();
        }
      }

      await createLeadMagnet({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        content: finalContent || undefined,
        fileId,
        notionUrl: notionUrl.trim() || undefined,
        fields,
      });

      toast.success("Lead magnet created successfully!");
      onClose();
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
      default: return "Create Lead Magnet";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{getStepTitle()}</h2>
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${step === "type" ? "bg-blue-500" : "bg-gray-300"}`} />
                <div className={`w-2 h-2 rounded-full ${step === "fields" ? "bg-blue-500" : "bg-gray-300"}`} />
                <div className={`w-2 h-2 rounded-full ${step === "details" ? "bg-blue-500" : "bg-gray-300"}`} />
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === "type" && (
            <div>
              <h3 className="text-lg font-medium mb-4">Choose how to create your lead magnet</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleTypeSelect("scratch")}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="text-3xl mb-2">✏️</div>
                  <h4 className="font-semibold mb-1">From Scratch</h4>
                  <p className="text-sm text-gray-600">Create content directly in the editor</p>
                </button>

                <button
                  onClick={() => handleTypeSelect("pdf")}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="text-3xl mb-2">📄</div>
                  <h4 className="font-semibold mb-1">Upload PDF</h4>
                  <p className="text-sm text-gray-600">Upload an existing PDF document</p>
                </button>

                <button
                  onClick={() => handleTypeSelect("notion")}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="text-3xl mb-2">📝</div>
                  <h4 className="font-semibold mb-1">Notion Link</h4>
                  <p className="text-sm text-gray-600">Link to a public Notion page</p>
                </button>

                <button
                  onClick={() => handleTypeSelect("html")}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="text-3xl mb-2">🌐</div>
                  <h4 className="font-semibold mb-1">HTML File</h4>
                  <p className="text-sm text-gray-600">Upload a custom HTML file</p>
                </button>
              </div>
            </div>
          )}

          {step === "fields" && (
            <div>
              <h3 className="text-lg font-medium mb-4">Select which fields to include in your opt-in form</h3>
              <p className="text-sm text-gray-600 mb-6">Choose the information you want to collect from your leads</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📧</span>
                    <div>
                      <h4 className="font-medium">Email Address</h4>
                      <p className="text-sm text-gray-600">Required for all lead magnets</p>
                    </div>
                  </div>
                  <div className="w-5 h-5 bg-blue-500 rounded border-2 border-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>

                {[
                  { key: "firstName" as const, icon: "👤", label: "First Name", desc: "Collect the lead's first name" },
                  { key: "lastName" as const, icon: "👤", label: "Last Name", desc: "Collect the lead's last name" },
                  { key: "phone" as const, icon: "📱", label: "Phone Number", desc: "Collect phone number for follow-up" },
                  { key: "company" as const, icon: "🏢", label: "Company Name", desc: "Collect company information" },
                ].map((field) => (
                  <div key={field.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{field.icon}</span>
                      <div>
                        <h4 className="font-medium">{field.label}</h4>
                        <p className="text-sm text-gray-600">{field.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleFieldToggle(field.key)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        fields[field.key]
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {fields[field.key] && <span className="text-white text-xs">✓</span>}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => setStep("type")}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFieldsNext}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "details" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter lead magnet title"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your lead magnet"
                />
              </div>

              {type === "scratch" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <div className="simple-editor-container">
                    <SimpleEditor
                      initialContent={content}
                      onChange={setContent}
                    />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://notion.so/your-page"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {selectedFile && (
                    <p className="text-sm text-green-600 mt-1">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep("fields")}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !title.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-semibold transition-colors"
                >
                  {isUploading ? "Creating..." : "Create Lead Magnet"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
