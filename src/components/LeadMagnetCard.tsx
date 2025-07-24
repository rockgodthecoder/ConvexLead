import { Doc } from "../../convex/_generated/dataModel";

interface LeadMagnetCardProps {
  magnet: Doc<"leadMagnets"> & { leadsCount: number; fileUrl: string | null; lastUpdated?: number };
  onClick: () => void;
}

export function LeadMagnetCard({ magnet, onClick }: LeadMagnetCardProps) {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "scratch": return "From Scratch";
      case "pdf": return "PDF Upload";
      case "notion": return "Notion Link";
      case "html": return "HTML File";
      default: return type;
    }
  };

  return (
    <div
      onClick={onClick}
      className="relative bg-white rounded-xl border border-gray-200 p-6 hover:shadow transition cursor-pointer flex flex-col justify-between min-h-[120px]"
    >
      {/* Three-dot menu */}
      <button
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        onClick={e => { e.stopPropagation(); /* open menu */ }}
      >
        <span className="sr-only">Actions</span>
        &#x22EE;
      </button>
      {/* Title */}
      <div className="mb-2 font-semibold text-gray-900 text-lg line-clamp-2">{magnet.title}</div>
      {/* Type */}
      <div className="mb-4 text-xs text-gray-500">{getTypeLabel(magnet.type)}</div>
      {/* Number of leads */}
      <div className="text-sm text-gray-700">{magnet.leadsCount} {magnet.leadsCount === 1 ? "submission" : "submissions"}</div>
    </div>
  );
}
