"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FlipHorizontal, FlipVertical, RotateCw, RotateCcw, X } from "lucide-react";

const ACCENT = "#19b394";
const HEX_RE = /(?<!url\()#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const MAX_BYTES = 750 * 1024;

function normHex(h: string): string {
  let x = h.toLowerCase();
  if (x.length === 4) x = "#" + x[1] + x[1] + x[2] + x[2] + x[3] + x[3];
  return x;
}

function toBase64Utf8(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

function Slider({
  label, value, min, max, step = 1, unit = "", onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <label className="block mb-3">
      <span className="flex justify-between text-xs font-medium text-gray-600 mb-1">
        {label}
        <span className="text-gray-400 tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#19b394]" />
    </label>
  );
}

const CHECKER: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  backgroundImage:
    "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
};

// ── SVG editor ──

function SvgEditor({ source, onApply, onClose }: { source: string; onApply: (dataUrl: string) => void; onClose: () => void }) {
  const originals = useMemo(() => {
    const set = new Set<string>();
    Array.from(source.matchAll(HEX_RE)).forEach((m) => set.add(normHex(m[0])));
    return Array.from(set);
  }, [source]);

  const texts = useMemo(() => {
    if (typeof DOMParser === "undefined") return [] as string[];
    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    return Array.from(doc.querySelectorAll("text"))
      .filter((t) => t.children.length === 0)
      .map((t) => t.textContent || "");
  }, [source]);

  const [colors, setColors] = useState<Record<string, string>>({});
  const [editedTexts, setEditedTexts] = useState<string[]>(texts);
  const [bgOn, setBgOn] = useState(false);
  const [bg, setBg] = useState("#ffffff");
  const [rounded, setRounded] = useState(false);
  const [flip, setFlip] = useState(false);

  const output = useMemo(() => {
    let s = source.replace(HEX_RE, (m) => colors[normHex(m)] ?? m);
    const doc = new DOMParser().parseFromString(s, "image/svg+xml");
    const root = doc.documentElement;
    if (root.nodeName.toLowerCase() !== "svg") return source;

    const textNodes = Array.from(doc.querySelectorAll("text")).filter((t) => t.children.length === 0);
    textNodes.forEach((t, i) => {
      if (editedTexts[i] !== undefined) t.textContent = editedTexts[i];
    });

    const vb = (root.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
    const [vx, vy, vw, vh] = vb.length === 4 && vb.every((n) => !isNaN(n)) ? vb : [0, 0, Number(root.getAttribute("width")) || 256, Number(root.getAttribute("height")) || 256];

    if (flip) {
      const g = doc.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `translate(${vx * 2 + vw} 0) scale(-1 1)`);
      while (root.firstChild) g.appendChild(root.firstChild);
      root.appendChild(g);
    }
    if (bgOn) {
      const rect = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(vx));
      rect.setAttribute("y", String(vy));
      rect.setAttribute("width", String(vw));
      rect.setAttribute("height", String(vh));
      rect.setAttribute("fill", bg);
      if (rounded) rect.setAttribute("rx", String(Math.min(vw, vh) * 0.08));
      root.insertBefore(rect, root.firstChild);
    }
    return new XMLSerializer().serializeToString(doc);
  }, [source, colors, editedTexts, bgOn, bg, rounded, flip]);

  const preview = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(output)}`;
  const changed = output !== source;

  return (
    <>
      <div className="flex-1 min-h-0 grid md:grid-cols-[1fr_300px]">
        <div className="p-5 flex items-center justify-center" style={CHECKER}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="max-h-[52vh] max-w-full object-contain shadow-sm" />
        </div>
        <div className="border-l border-gray-100 overflow-y-auto p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Colours</div>
          {originals.length === 0 ? (
            <p className="text-xs text-gray-400 mb-3">No editable colours found in this image.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {originals.map((o) => (
                <div key={o} className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded border border-gray-200 shrink-0" style={{ background: o }} title={`Original ${o}`} />
                  <span className="text-gray-300 text-xs">→</span>
                  <input
                    type="color"
                    value={colors[o] ?? o}
                    onChange={(e) => setColors({ ...colors, [o]: e.target.value })}
                    className="h-8 w-10 p-0 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    value={colors[o] ?? o}
                    onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && setColors({ ...colors, [o]: e.target.value })}
                    className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                  />
                  {colors[o] && (
                    <button
                      onClick={() => {
                        const { [o]: _drop, ...rest } = colors;
                        setColors(rest);
                      }}
                      className="text-[11px] text-gray-400 hover:text-gray-700"
                    >
                      reset
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {texts.length > 0 && (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Text</div>
              <div className="space-y-2 mb-4">
                {texts.map((_, i) => (
                  <input
                    key={i}
                    value={editedTexts[i] ?? ""}
                    onChange={(e) => setEditedTexts(editedTexts.map((t, j) => (j === i ? e.target.value : t)))}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm"
                  />
                ))}
              </div>
            </>
          )}

          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Layout</div>
          <label className="flex items-center justify-between py-1 text-sm text-gray-700">
            Solid background
            <input type="checkbox" checked={bgOn} onChange={(e) => setBgOn(e.target.checked)} className="h-4 w-4 accent-[#19b394]" />
          </label>
          {bgOn && (
            <div className="flex items-center gap-2 pb-1 pl-1">
              <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-8 w-10 p-0 border border-gray-300 rounded cursor-pointer" />
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input type="checkbox" checked={rounded} onChange={(e) => setRounded(e.target.checked)} className="accent-[#19b394]" /> Rounded corners
              </label>
            </div>
          )}
          <label className="flex items-center justify-between py-1 text-sm text-gray-700">
            Flip horizontally
            <input type="checkbox" checked={flip} onChange={(e) => setFlip(e.target.checked)} className="h-4 w-4 accent-[#19b394]" />
          </label>
        </div>
      </div>
      <Footer
        canApply={changed}
        onReset={() => {
          setColors({});
          setEditedTexts(texts);
          setBgOn(false);
          setFlip(false);
        }}
        onApply={() => onApply(`data:image/svg+xml;base64,${toBase64Utf8(output)}`)}
        onClose={onClose}
      />
    </>
  );
}

// ── Raster editor ──

function RasterEditor({ source, mime, onApply, onClose }: { source: string; mime: string; onApply: (dataUrl: string) => void; onClose: () => void }) {
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(100);
  const [bright, setBright] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [gray, setGray] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [opacity, setOpacity] = useState(100);
  const [rotate, setRotate] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const filter = `hue-rotate(${hue}deg) saturate(${sat}%) brightness(${bright}%) contrast(${contrast}%) grayscale(${gray}%) sepia(${sepia}%) opacity(${opacity}%)`;
  const transform = `rotate(${rotate}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`;
  const changed = hue || sat !== 100 || bright !== 100 || contrast !== 100 || gray || sepia || opacity !== 100 || rotate || flipH || flipV;

  const apply = () => {
    const img = imgRef.current;
    if (!img) return;
    try {
      const swap = rotate % 180 !== 0;
      let w = swap ? img.naturalHeight : img.naturalWidth;
      let h = swap ? img.naturalWidth : img.naturalHeight;
      const outType = mime === "image/jpeg" ? "image/jpeg" : "image/png";
      for (let attempt = 0; attempt < 6; attempt++) {
        const longest = Math.max(w, h);
        const k = longest > 1600 ? 1600 / longest : 1;
        const cw = Math.max(1, Math.round(w * k));
        const ch = Math.max(1, Math.round(h * k));
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas is not available");
        if (!("filter" in ctx)) throw new Error("Colour adjustments are not supported by this browser");
        ctx.filter = filter;
        ctx.translate(cw / 2, ch / 2);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        const dw = swap ? ch : cw;
        const dh = swap ? cw : ch;
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        const url = canvas.toDataURL(outType, 0.9);
        if (url.length * 0.75 <= MAX_BYTES) {
          onApply(url);
          return;
        }
        w = Math.round(w * 0.75);
        h = Math.round(h * 0.75);
      }
      setErr("The edited image is too large. Try a smaller source image.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not apply the edits");
    }
  };

  return (
    <>
      <div className="flex-1 min-h-0 grid md:grid-cols-[1fr_300px]">
        <div className="p-5 flex items-center justify-center overflow-hidden" style={CHECKER}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={source} alt="Preview" crossOrigin="anonymous" style={{ filter, transform }} className="max-h-[52vh] max-w-full object-contain" />
        </div>
        <div className="border-l border-gray-100 overflow-y-auto p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Colour</div>
          <Slider label="Hue" value={hue} min={0} max={360} unit="°" onChange={setHue} />
          <Slider label="Saturation" value={sat} min={0} max={300} unit="%" onChange={setSat} />
          <Slider label="Brightness" value={bright} min={20} max={200} unit="%" onChange={setBright} />
          <Slider label="Contrast" value={contrast} min={20} max={200} unit="%" onChange={setContrast} />
          <Slider label="Grayscale" value={gray} min={0} max={100} unit="%" onChange={setGray} />
          <Slider label="Sepia" value={sepia} min={0} max={100} unit="%" onChange={setSepia} />
          <Slider label="Opacity" value={opacity} min={10} max={100} unit="%" onChange={setOpacity} />
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-4 mb-2">Orientation</div>
          <div className="flex gap-2">
            {[
              { i: <RotateCcw className="h-4 w-4" />, f: () => setRotate((rotate + 270) % 360), t: "Rotate left" },
              { i: <RotateCw className="h-4 w-4" />, f: () => setRotate((rotate + 90) % 360), t: "Rotate right" },
              { i: <FlipHorizontal className="h-4 w-4" />, f: () => setFlipH(!flipH), t: "Flip horizontally" },
              { i: <FlipVertical className="h-4 w-4" />, f: () => setFlipV(!flipV), t: "Flip vertically" },
            ].map((b) => (
              <button key={b.t} onClick={b.f} title={b.t} className="h-9 w-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                {b.i}
              </button>
            ))}
          </div>
          {err && <p className="mt-3 text-xs text-red-600">{err}</p>}
        </div>
      </div>
      <Footer
        canApply={!!changed}
        onReset={() => {
          setHue(0); setSat(100); setBright(100); setContrast(100); setGray(0); setSepia(0); setOpacity(100);
          setRotate(0); setFlipH(false); setFlipV(false); setErr(null);
        }}
        onApply={apply}
        onClose={onClose}
      />
    </>
  );
}

function Footer({ canApply, onReset, onApply, onClose }: { canApply: boolean; onReset: () => void; onApply: () => void; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
      <button onClick={onReset} className="text-sm text-gray-500 hover:text-gray-800">Reset</button>
      <div className="flex gap-2">
        <button onClick={onClose} className="h-9 px-4 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button
          onClick={onApply}
          disabled={!canApply}
          className="h-9 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: ACCENT }}
        >
          Use edited image
        </button>
      </div>
    </div>
  );
}

// ── Modal ──

export default function ImageEditorModal({
  src, onApply, onClose,
}: {
  src: string; onApply: (dataUrl: string) => void; onClose: () => void;
}) {
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "error"; message: string } | { kind: "svg"; text: string } | { kind: "raster"; url: string; mime: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error("not ok");
        const blob = await res.blob();
        const text = blob.type.includes("svg") || src.startsWith("data:image/svg") ? await blob.text() : null;
        if (cancelled) return;
        if (text !== null) {
          setState({ kind: "svg", text });
        } else {
          const url = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = () => reject(new Error("read"));
            r.readAsDataURL(blob);
          });
          if (!cancelled) setState({ kind: "raster", url, mime: blob.type });
        }
      } catch {
        if (!cancelled) {
          setState({
            kind: "error",
            message: "This image can't be edited here (it's an external link). Pick it from the library or upload the file instead.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit image</h2>
            <p className="text-xs text-gray-500">Changes are saved into this form only; the library original stays untouched.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {state.kind === "loading" && <div className="py-20 text-center text-sm text-gray-400">Loading image…</div>}
        {state.kind === "error" && (
          <div className="p-8 text-center">
            <p className="text-sm text-red-600 mb-4">{state.message}</p>
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-gray-300 text-sm">Close</button>
          </div>
        )}
        {state.kind === "svg" && <SvgEditor source={state.text} onApply={(u) => { onApply(u); onClose(); }} onClose={onClose} />}
        {state.kind === "raster" && <RasterEditor source={state.url} mime={state.mime} onApply={(u) => { onApply(u); onClose(); }} onClose={onClose} />}
      </div>
    </div>
  );
}
