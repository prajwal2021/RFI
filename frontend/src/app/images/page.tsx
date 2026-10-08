"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImageIcon, ShieldAlert, Trash2, Upload } from "lucide-react";
import AppHeader from "@/components/app-header";
import { isAdmin } from "@/lib/auth";
import { deleteLibraryImage, fetchImages, LibraryImage, sortCategories, uploadLibraryImage } from "@/lib/images";

const CATEGORIES = ["Official Logos", "Logos", "Backgrounds", "Banners", "Badges", "Icons"];

export default function ImageLibraryPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Logos");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAllowed(isAdmin());
  }, []);

  const load = useCallback(async () => {
    try {
      setImages(await fetchImages(true));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load images");
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const grouped = useMemo(() => {
    const m = new Map<string, LibraryImage[]>();
    for (const i of images) (m.get(i.category) || m.set(i.category, []).get(i.category)!).push(i);
    const order = sortCategories(Array.from(m.keys()));
    return order.map((c) => [c, m.get(c)!] as [string, LibraryImage[]]);
  }, [images]);

  if (allowed === null) return null;
  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white border border-slate-200 rounded-xl shadow-sm p-10 max-w-sm">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Admin access required</h1>
          <p className="text-sm text-slate-500">Only administrators can manage the image library.</p>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await uploadLibraryImage(file, name.trim() || file.name.replace(/\.[^.]+$/, ""), category.trim() || "Logos");
      setFile(null);
      setName("");
      const fileInput = document.getElementById("img-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      setNotice("Image added to the library.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (img: LibraryImage) => {
    if (!confirm(`Delete "${img.name}"? Forms that already use it will lose the image.`)) return;
    try {
      await deleteLibraryImage(img.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const input =
    "w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader
        left={
          <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        }
      />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
            <ImageIcon className="h-5 w-5 text-indigo-500" /> Image library
          </h1>
          <p className="text-sm text-slate-500">
            Shared images that appear in the form designer&apos;s <b>Library</b> picker for logos, backgrounds and image elements.
            The built-in set is placeholder artwork — upload your official logos here.
          </p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm mb-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-4">
            <Upload className="h-4 w-4 text-indigo-500" /> Add an image
          </h2>
          <div className="grid md:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">File (PNG, JPEG, GIF, WebP or SVG, up to 2 MB)</label>
              <input
                id="img-file"
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
                }}
                className="block w-full text-sm text-slate-600 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="e.g. TTU Online logo" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} list="img-cats" className={input} />
              <datalist id="img-cats">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <button type="submit" disabled={busy || !file} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 disabled:opacity-50">
              {busy ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>

        {grouped.map(([cat, list]) => (
          <section key={cat} className="mb-8">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              {cat} <span className="text-slate-400 font-normal">({list.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {list.map((img) => (
                <div key={img.id} className="group relative rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="aspect-[4/3] flex items-center justify-center p-3 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.name}
                      loading="lazy"
                      className={`max-h-full max-w-full ${cat === "Backgrounds" ? "w-full h-full object-cover rounded" : "object-contain"}`}
                    />
                  </div>
                  <div className="px-3 py-2.5 border-t border-slate-100">
                    <div className="text-sm font-medium text-slate-800 truncate" title={img.name}>{img.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {img.builtin ? "Built-in" : "Uploaded"} · {(img.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  {!img.builtin && (
                    <button
                      onClick={() => remove(img)}
                      className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-white/90 border border-slate-200 text-slate-400 hover:text-red-600 hidden group-hover:flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
