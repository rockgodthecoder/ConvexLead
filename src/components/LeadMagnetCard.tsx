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
      className="relative bg-white rounded-lg border border-gray-200 p-4 hover:shadow transition cursor-pointer flex flex-col justify-between min-h-[100px]"
    >
      {/* Three-dot menu */}
      <button
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-sm"
        onClick={e => { e.stopPropagation(); /* open menu */ }}
      >
        <span className="sr-only">Actions</span>
        &#x22EE;
      </button>
      {/* Title */}
      <div className="mb-1 font-semibold text-gray-900 text-sm line-clamp-2">{magnet.title}</div>
      {/* Type */}
      <div className="mb-2 text-xs text-gray-500">{getTypeLabel(magnet.type)}</div>
      {/* Number of leads */}
      <div className="text-xs text-gray-700">{magnet.leadsCount} {magnet.leadsCount === 1 ? "submission" : "submissions"}</div>
    </div>
  );
}
