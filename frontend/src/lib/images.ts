import { apiFetch } from "@/lib/auth";

const BASE = "/rfi-api/images";

export interface LibraryImage {
  id: string;
  name: string;
  category: string;
  mime: string;
  size: number;
  builtin: boolean;
  url: string;
}

async function parse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let detail = fallback;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // keep fallback
    }
    throw new Error(detail);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

let cache: LibraryImage[] | null = null;

export async function fetchImages(force = false): Promise<LibraryImage[]> {
  if (cache && !force) return cache;
  cache = await parse<LibraryImage[]>(await apiFetch(`${BASE}/`), "Failed to load image library");
  return cache;
}

export async function uploadLibraryImage(file: File, name: string, category: string): Promise<LibraryImage> {
  const form = new FormData();
  form.append("file", file);
  form.append("name", name);
  form.append("category", category);
  const img = await parse<LibraryImage>(await apiFetch(`${BASE}/`, { method: "POST", body: form }), "Upload failed");
  cache = null;
  return img;
}

export async function deleteLibraryImage(id: string): Promise<void> {
  await parse<void>(await apiFetch(`${BASE}/${id}`, { method: "DELETE" }), "Delete failed");
  cache = null;
}

export function isLibraryUrl(v?: string | null): boolean {
  return !!v && v.startsWith("/rfi-api/images/");
}

const CATEGORY_ORDER = ["Official Logos", "Logos", "Backgrounds", "Banners", "Badges", "Icons"];

export function sortCategories(cats: string[]): string[] {
  return [...cats].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
