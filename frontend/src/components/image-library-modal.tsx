"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { fetchImages, LibraryImage, sortCategories } from "@/lib/images";

export default function ImageLibraryModal({
  initialCategory,
  onPick,
  onClose,
}: {
  initialCategory?: string;
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [images, setImages] = useState<LibraryImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(initialCategory || "All");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchImages()
      .then(setImages)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load images"));
  }, []);

  const categories = useMemo(() => {
    const set = new Set((images || []).map((i) => i.category));
    return ["All", ...sortCategories(Array.from(set))];
  }, [images]);

  const shown = (images || []).filter(
    (i) => (category === "All" || i.category === category) && (!q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Image library</h2>
            <p className="text-xs text-gray-500">Pick a ready-made image. Admins can add more from the profile menu.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-2 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${category === c ? "bg-[#19b394] border-[#19b394] text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-8 w-44 pl-8 pr-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-[#19b394]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : !images ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : shown.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No images match.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {shown.map((img) => (
                <button
                  key={img.id}
                  onClick={() => {
                    onPick(img.url);
                    onClose();
                  }}
                  className="group text-left rounded-lg border border-gray-200 hover:border-[#19b394] hover:shadow-md overflow-hidden bg-white"
                >
                  <div
                    className="aspect-[4/3] flex items-center justify-center p-2"
                    style={{
                      backgroundColor: "#f3f4f6",
                      backgroundImage:
                        "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.name}
                      loading="lazy"
                      className={`max-h-full max-w-full ${img.category === "Backgrounds" ? "w-full h-full object-cover rounded" : "object-contain"}`}
                    />
                  </div>
                  <div className="px-2.5 py-2 border-t border-gray-100">
                    <div className="text-xs font-medium text-gray-800 truncate">{img.name}</div>
                    <div className="text-[11px] text-gray-400">{img.category}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
