import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

const AVATAR_PLACEHOLDER = "https://ui-avatars.com/api/?name=User&background=E0E7EF&color=374151&size=96";
const THUMBNAIL_PLACEHOLDER = "https://placehold.co/400x225/1e293b/fff?text=Content";

const SORT_OPTIONS = [
  { key: "latest", label: "Latest" },
  { key: "popular", label: "Popular" },
  { key: "oldest", label: "Oldest" },
] as const;
type SortKey = typeof SORT_OPTIONS[number]["key"];

export function MyPage() {
  const user = useQuery(api.auth.loggedInUser);
  const leadMagnets = useQuery(api.leadMagnets.list);
  const [sort, setSort] = useState<SortKey>("latest");
  const [activeTab, setActiveTab] = useState<"share" | "preview">("preview");

  const avatarUrl = user?.name
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=E0E7EF&color=374151&size=192`
    : AVATAR_PLACEHOLDER;



  return (
    <div className="max-w-5xl mx-auto space-y-10 py-12">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("share")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "share"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            🔗 Share
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "preview"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            👁️ Preview
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "share" && <ShareTab user={user} leadMagnets={leadMagnets} />}
        {activeTab === "preview" && <PreviewTab user={user} leadMagnets={leadMagnets} sort={sort} setSort={setSort} />}
      </div>
    </div>
  );
}

function ShareTab({ user, leadMagnets }: { user: any; leadMagnets: any[] | undefined }) {
  return (
    <div className="space-y-6">
      {/* Share Link Section - Using same style as LeadMagnetDetails */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="font-medium mb-3 text-blue-900">📤 Share Link</h3>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value="https://yourdomain.com/share/your-unique-link"
            readOnly
            className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm font-mono"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText("https://yourdomain.com/share/your-unique-link");
              // You can add toast notification here
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 whitespace-nowrap"
          >
            Copy Link
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              // Regenerate link functionality
            }}
            className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
          >
            Regenerate Link
          </button>
          <span className="text-xs text-blue-700">
            Share this link to collect leads publicly
          </span>
        </div>
      </div>


    </div>
  );
}

function PreviewTab({ user, leadMagnets, sort, setSort }: { user: any; leadMagnets: any[] | undefined; sort: SortKey; setSort: (sort: SortKey) => void }) {
  let sortedMagnets = leadMagnets ?? [];
  if (sort === "latest") {
    sortedMagnets = sortedMagnets.slice().sort((a, b) => b._creationTime - a._creationTime);
  } else if (sort === "oldest") {
    sortedMagnets = sortedMagnets.slice().sort((a, b) => a._creationTime - b._creationTime);
  } else if (sort === "popular") {
    sortedMagnets = sortedMagnets.slice().sort((a, b) => (b.leadsCount ?? 0) - (a.leadsCount ?? 0));
  }

  const avatarUrl = user?.name
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=E0E7EF&color=374151&size=192`
    : "https://ui-avatars.com/api/?name=User&background=E0E7EF&color=374151&size=96";

  return (
    <div className="space-y-6">
      {/* Channel Header Style */}
      <div className="flex flex-col md:flex-row items-start bg-[#18181b] rounded-2xl shadow-lg p-8 md:p-12 mb-8 gap-8">
        {/* Avatar top left */}
        <div className="flex-shrink-0 flex justify-center md:justify-start w-full md:w-auto">
          <img
            src={avatarUrl}
            alt="User avatar"
            className="w-36 h-36 rounded-full border-4 border-blue-900 shadow object-cover"
          />
        </div>
        {/* Info */}
        <div className="flex-1 flex flex-col items-center md:items-start">
          <div className="flex flex-col md:flex-row md:items-end gap-2 w-full">
            {user?.name && (
              <span className="text-4xl md:text-5xl font-extrabold text-white leading-tight">{user.name}</span>
            )}
            {user?.email && (
              <span className="text-lg font-semibold text-gray-300 md:ml-4">@{user.email.split("@")[0]}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-gray-400 text-base font-medium">
            <span>{leadMagnets ? `${leadMagnets.length} content piece${leadMagnets.length === 1 ? '' : 's'}` : ''}</span>
          </div>
        </div>
      </div>

      {/* Book a Call Section */}
      <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center text-center max-w-2xl mx-auto">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to grow your audience?</h3>
        <p className="text-gray-600 mb-6">Book a free strategy call to get personalized advice and actionable tips for your content journey.</p>
        <a
          href="https://calendly.com/your-link"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-600 text-white font-bold text-lg px-8 py-3 rounded-full shadow hover:bg-blue-700 transition"
        >
          Book a Call
        </a>
      </div>

      {/* Content Section */}
      <div className="bg-transparent">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-xl text-blue-700 flex items-center gap-2 mr-4">
            <span>🧲</span> Content
          </h2>
          <div className="flex gap-2">
            {SORT_OPTIONS.map(option => (
              <button
                key={option.key}
                onClick={() => setSort(option.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition border focus:outline-none ${
                  sort === option.key
                    ? "bg-white text-blue-700 border-blue-500 shadow"
                    : "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {sortedMagnets.length ? (
            sortedMagnets.map(magnet => (
              <div key={magnet._id} className="bg-[#18181b] rounded-2xl shadow-lg overflow-hidden flex flex-col relative group">
                {/* Thumbnail */}
                <div className="relative">
                  <img
                    src={THUMBNAIL_PLACEHOLDER}
                    alt="Content Thumbnail"
                    className="w-full h-40 object-cover bg-gray-900"
                  />
                  {/* 3-dot menu */}
                  <button className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition">
                    <span className="sr-only">Actions</span>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>
                  </button>
                </div>
                {/* Content */}
                <div className="flex-1 flex flex-col p-4">
                  <div className="font-bold text-white text-lg leading-tight line-clamp-2 mb-1">{magnet.title}</div>
                  <div className="text-gray-400 text-sm line-clamp-2 mb-2 min-h-[2.5em]">{magnet.description || <span className="italic">No description</span>}</div>
                  <div className="flex items-center gap-2 mt-auto">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Views</span>
                    <span className="text-base font-bold text-white">{magnet.leadsCount ?? 0}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-gray-400 italic">No content yet.</div>
          )}
        </div>
      </div>
    </div>
  );
} 