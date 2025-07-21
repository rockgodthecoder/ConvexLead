import { Doc } from "../../convex/_generated/dataModel";

interface LeadMagnetCardProps {
  magnet: Doc<"leadMagnets"> & { leadsCount: number; fileUrl: string | null };
  onClick: () => void;
}

export function LeadMagnetCard({ magnet, onClick }: LeadMagnetCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "scratch": return "✏️";
      case "pdf": return "📄";
      case "notion": return "📝";
      case "html": return "🌐";
      default: return "📄";
    }
  };

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
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getTypeIcon(magnet.type)}</span>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {getTypeLabel(magnet.type)}
          </span>
        </div>
        <div className={`w-3 h-3 rounded-full ${magnet.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
        {magnet.title}
      </h3>

      {magnet.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {magnet.description}
        </p>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{magnet.leadsCount} leads</span>
        <span>{new Date(magnet._creationTime).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
