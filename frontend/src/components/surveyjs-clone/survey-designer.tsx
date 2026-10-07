"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import {
  ArrowLeft, Save, Undo2, Redo2, Plus, Trash2, Monitor, Tablet, Smartphone, RotateCcw,
} from "lucide-react";
import { createRFI, updateRFI } from "@/lib/api";
import {
  QUESTION_TYPES, clone, normalizeSurvey, emptySurvey, createQuestion, allQuestionNames,
  uniqueName, uniquePageName, selectionValid, usedLocales, getNode, childrenOf, isContainer,
  findPath, pathStartsWith, getLoc, Path, Selection,
} from "./model";
import PropertyGrid from "./property-grid";
import LogicTab from "./logic-tab";
import ThemeTab from "./theme-tab";
import TranslationTab from "./translation-tab";
import { ElementList, ICONS, ACCENT, DragSrc, Over, SurfaceCtx } from "./design-surface";
import { Themed, SurveyTheme } from "./theme";
import { attachAppearance } from "./appearance";
import { LanguageSelect } from "@/components/surveyjs/survey-runner";
import "survey-core/defaultV2.min.css";

const PLACEHOLDER_HTML =
  '<div style="padding:24px;color:#64748b;font-size:14px;">This form is built with the SurveyJS-style designer and is rendered by the SurveyJS runtime on the public page.</div>';

type Tab = "designer" | "preview" | "logic" | "theme" | "translations" | "json";

// ── Preview tab ──

function PreviewTab({ json, theme }: { json: any; theme: SurveyTheme }) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "phone">("desktop");
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<any>(null);
  const model = useMemo(() => {
    const m = new Model(json);
    attachAppearance(m);
    m.showCompletedPage = false;
    m.onComplete.add((s) => setResult(s.data));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(json), run]);
  const width = device === "desktop" ? "100%" : device === "tablet" ? "768px" : "375px";

  return (
    <div className="flex-1 overflow-y-auto bg-[#e8e8e8]">
      <div className="flex items-center justify-center gap-2 py-3 border-b bg-white">
        {([["desktop", Monitor], ["tablet", Tablet], ["phone", Smartphone]] as const).map(([d, Icon]) => (
          <button
            key={d}
            onClick={() => setDevice(d)}
            className={`p-2 rounded border ${device === d ? "text-white border-transparent" : "text-gray-600 border-gray-300 bg-white hover:bg-gray-50"}`}
            style={device === d ? { backgroundColor: ACCENT } : undefined}
            title={d}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <button
          onClick={() => {
            setResult(null);
            setRun(run + 1);
          }}
          className="ml-3 flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Test Again
        </button>
      </div>
      <div className="mx-auto my-6 shadow rounded overflow-hidden" style={{ width, maxWidth: "100%" }}>
        <Themed theme={theme} className="min-h-[400px] bg-white">
          {result ? (
            <div className="p-6">
              <h3 className="font-semibold mb-2">Survey Result</h3>
              <pre className="text-xs bg-gray-50 text-gray-800 border rounded p-3 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          ) : (
            <>
              <LanguageSelect model={model} />
              <Survey model={model} />
            </>
          )}
        </Themed>
      </div>
    </div>
  );
}

// ── JSON tab ──

function JsonTab({ json, onApply }: { json: any; onApply: (next: any) => void }) {
  const [text, setText] = useState(() => JSON.stringify(json, null, 2));
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex-1 flex flex-col bg-[#f3f3f3] p-6 min-h-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Survey JSON</h3>
        <button
          onClick={() => {
            try {
              onApply(normalizeSurvey(JSON.parse(text)));
              setError(null);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Invalid JSON");
            }
          }}
          className="px-4 py-1.5 text-sm font-semibold text-white rounded"
          style={{ backgroundColor: ACCENT }}
        >
          Apply
        </button>
      </div>
      {error && <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className="flex-1 min-h-0 w-full font-mono text-xs p-4 border border-gray-300 rounded bg-white focus:outline-none focus:border-[#19b394]"
      />
    </div>
  );
}

// ── Main designer ──

export default function SurveyDesigner({
  initialJson,
  initialTheme,
  initialTitle,
  rfiId,
  workspaceId,
}: {
  initialJson?: any;
  initialTheme?: SurveyTheme;
  initialTitle?: string;
  rfiId?: string;
  workspaceId?: string;
}) {
  const router = useRouter();
  const [json, setJson] = useState<any>(() =>
    normalizeSurvey(initialJson || emptySurvey(initialTitle || "Untitled Survey"))
  );
  const [theme, setTheme] = useState<SurveyTheme>(initialTheme || {});
  const [locales, setLocales] = useState<string[]>(() => usedLocales(normalizeSurvey(initialJson || emptySurvey())));
  const [sel, setSel] = useState<Selection>({ kind: "survey" });
  const [tab, setTab] = useState<Tab>("designer");
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [over, setOver] = useState<Over | null>(null);

  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const lastKey = useRef<{ key: string; t: number } | null>(null);
  const drag = useRef<DragSrc | null>(null);

  const commit = (next: any, key?: string) => {
    const now = Date.now();
    const coalesce = !!key && !!lastKey.current && lastKey.current.key === key && now - lastKey.current.t < 1000;
    if (!coalesce) {
      past.current.push(JSON.stringify(json));
      if (past.current.length > 100) past.current.shift();
    }
    lastKey.current = key ? { key, t: now } : null;
    future.current = [];
    setJson(next);
  };

  const restore = (snapshot: string) => {
    const next = JSON.parse(snapshot);
    setJson(next);
    setVersion((v) => v + 1);
    lastKey.current = null;
    if (!selectionValid(next, sel)) setSel({ kind: "survey" });
  };

  const undo = () => {
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(JSON.stringify(json));
    restore(prev);
  };
  const redo = () => {
    const nxt = future.current.pop();
    if (nxt === undefined) return;
    past.current.push(JSON.stringify(json));
    restore(nxt);
  };

  const latest = useRef({ undo, redo });
  latest.current = { undo, redo };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        latest.current.undo();
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        latest.current.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Mutations ──

  const applyPatch = (patch: Record<string, any>, key?: string) => {
    const next = clone(json);
    let target: any;
    if (sel.kind === "survey") target = next;
    else if (sel.kind === "page") target = next.pages[sel.p];
    else target = getNode(next, sel.path);
    if (!target) return;
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) delete target[k];
      else target[k] = v;
    }
    const selKey = sel.kind === "question" ? sel.path.join(".") : sel.kind === "page" ? `page${sel.p}` : "survey";
    commit(next, key ? `${selKey}:${key}` : undefined);
  };

  const insertQuestion = (type: string, container: Path, index: number) => {
    const next = clone(json);
    const q = createQuestion(next, type);
    childrenOf(getNode(next, container)).splice(index, 0, q);
    commit(next);
    setSel({ kind: "question", path: [...container, index] });
  };

  const addFromToolbox = (type: string) => {
    if (sel.kind === "question") {
      const node = getNode(json, sel.path);
      if (node && isContainer(node.type)) insertQuestion(type, sel.path, childrenOf(node).length);
      else insertQuestion(type, sel.path.slice(0, -1), sel.path[sel.path.length - 1] + 1);
    } else if (sel.kind === "page") {
      insertQuestion(type, [sel.p], childrenOf(json.pages[sel.p]).length);
    } else {
      const p = json.pages.length - 1;
      insertQuestion(type, [p], childrenOf(json.pages[p]).length);
    }
  };

  const dropHere = () => {
    const d = drag.current;
    const target = over;
    drag.current = null;
    setOver(null);
    if (!d || !target) return;
    if (d.kind === "toolbox") {
      insertQuestion(d.type, target.c, target.i);
      return;
    }
    if (pathStartsWith(target.c, d.path)) return; // cannot drop a container into itself
    const next = clone(json);
    const targetArr = childrenOf(getNode(next, target.c));
    const srcArr = childrenOf(getNode(next, d.path.slice(0, -1)));
    const srcIdx = d.path[d.path.length - 1];
    const [moved] = srcArr.splice(srcIdx, 1);
    let idx = target.i;
    if (srcArr === targetArr && srcIdx < idx) idx -= 1;
    targetArr.splice(idx, 0, moved);
    commit(next);
    const np = findPath(next, moved);
    if (np) setSel({ kind: "question", path: np });
  };

  const moveQuestion = (path: Path, dir: -1 | 1) => {
    const idx = path[path.length - 1];
    const parent = path.slice(0, -1);
    const j = idx + dir;
    const next = clone(json);
    const arr = childrenOf(getNode(next, parent));
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    commit(next);
    setSel({ kind: "question", path: [...parent, j] });
  };

  const duplicateQuestion = (path: Path) => {
    const next = clone(json);
    const parent = path.slice(0, -1);
    const arr = childrenOf(getNode(next, parent));
    const idx = path[path.length - 1];
    const copy = clone(arr[idx]);
    const names = allQuestionNames(next);
    const rename = (n: any) => {
      const base = isContainer(n.type) ? "panel" : "question";
      n.name = uniqueName(names, base);
      names.add(n.name);
      if (isContainer(n.type)) childrenOf(n).forEach(rename);
    };
    rename(copy);
    arr.splice(idx + 1, 0, copy);
    commit(next);
    setSel({ kind: "question", path: [...parent, idx + 1] });
  };

  const deleteQuestion = (path: Path) => {
    const node = getNode(json, path);
    if (node && isContainer(node.type) && childrenOf(node).length > 0 && !confirm("Delete this container and everything inside it?")) return;
    const next = clone(json);
    childrenOf(getNode(next, path.slice(0, -1))).splice(path[path.length - 1], 1);
    commit(next);
    setSel({ kind: "survey" });
  };

  const addPage = () => {
    const next = clone(json);
    next.pages.push({ name: uniquePageName(next), elements: [] });
    commit(next);
    setSel({ kind: "page", p: next.pages.length - 1 });
  };

  const deletePage = (p: number) => {
    if (json.pages.length <= 1) return;
    if (childrenOf(json.pages[p]).length > 0 && !confirm("Delete this page and all of its questions?")) return;
    const next = clone(json);
    next.pages.splice(p, 1);
    commit(next);
    setSel({ kind: "survey" });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const subject = getLoc(json.title) || initialTitle || "Untitled Survey";
      const content = {
        surveyDefinition: json,
        surveyTheme: theme,
        surveyEditor: "clone",
        html: PLACEHOLDER_HTML,
        css: "",
        projectData: {},
      };
      if (rfiId) {
        await updateRFI(rfiId, { subject, content });
        alert("Survey saved!");
      } else {
        const rfi = await createRFI({ subject, created_by: "admin", content, workspace_id: workspaceId });
        router.push(`/rfi/${rfi.id}`);
      }
    } catch {
      alert("Failed to save survey");
    } finally {
      setSaving(false);
    }
  };

  const ctx: SurfaceCtx = {
    sel,
    over,
    theme,
    drag,
    setOver,
    select: setSel,
    drop: dropHere,
    move: moveQuestion,
    duplicate: duplicateQuestion,
    remove: deleteQuestion,
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "designer", label: "Designer" },
    { key: "preview", label: "Preview" },
    { key: "logic", label: "Logic" },
    { key: "theme", label: "Theme" },
    { key: "translations", label: "Translations" },
    { key: "json", label: "JSON Editor" },
  ];

  const selectedKey = `${sel.kind}-${sel.kind === "question" ? sel.path.join(".") : sel.kind === "page" ? sel.p : ""}-${version}`;

  const setSurveyText = (key: "title" | "description") => (value: string) => {
    const next = clone(json);
    const old = next[key];
    if (old && typeof old === "object") {
      if (value) old.default = value;
      else delete old.default;
    } else if (value) next[key] = value;
    else delete next[key];
    commit(next, `survey:${key}`);
  };

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900">
      <header className="h-12 shrink-0 flex items-center px-4 text-white" style={{ backgroundColor: ACCENT }}>
        <button onClick={() => router.push("/")} className="p-1 hover:bg-white/15 rounded mr-3" title="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold tracking-wide mr-8">SurveyJS Clone</span>
        <nav className="flex h-full">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 text-sm h-full border-b-4 ${tab === t.key ? "border-white font-semibold bg-white/10" : "border-transparent hover:bg-white/10"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="flex-1" />
        <button onClick={undo} disabled={past.current.length === 0} className="p-2 hover:bg-white/15 rounded disabled:opacity-40" title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={redo} disabled={future.current.length === 0} className="p-2 hover:bg-white/15 rounded disabled:opacity-40 mr-3" title="Redo (Ctrl+Y)">
          <Redo2 className="h-4 w-4" />
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-white rounded hover:bg-gray-100 disabled:opacity-60"
          style={{ color: ACCENT }}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save"}
        </button>
      </header>

      {tab === "designer" && (
        <div className="flex-1 flex min-h-0">
          <aside className="w-60 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
            {(["Questions", "Containers"] as const).map((group) => (
              <div key={group}>
                <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {group === "Questions" ? "Toolbox" : "Containers"}
                </div>
                {QUESTION_TYPES.filter((t) => t.group === group).map((t) => (
                  <div
                    key={t.type}
                    draggable
                    onDragStart={(e) => {
                      drag.current = { kind: "toolbox", type: t.type };
                      e.dataTransfer.setData("text/plain", t.type);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onDragEnd={() => {
                      drag.current = null;
                      setOver(null);
                    }}
                    onClick={() => addFromToolbox(t.type)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 cursor-grab hover:bg-gray-50 border-b border-gray-100"
                  >
                    <span style={{ color: ACCENT }}>{ICONS[t.type]}</span>
                    {t.label}
                  </div>
                ))}
              </div>
            ))}
          </aside>

          <main className="flex-1 overflow-y-auto bg-[#f3f3f3] p-6" onClick={() => setSel({ kind: "survey" })}>
            <div className="max-w-[860px] mx-auto bg-white shadow rounded" onClick={(e) => e.stopPropagation()}>
              <div
                className="px-8 pt-8 pb-4 border-b cursor-pointer"
                style={sel.kind === "survey" ? { boxShadow: `inset 0 0 0 2px ${ACCENT}` } : undefined}
                onClick={() => setSel({ kind: "survey" })}
              >
                {json.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={json.logo} alt="logo" style={{ height: json.logoHeight || 48, maxWidth: "100%", objectFit: json.logoFit || "contain" }} className="mb-3" />
                )}
                <input
                  value={getLoc(json.title)}
                  onChange={(e) => setSurveyText("title")(e.target.value)}
                  placeholder="Survey title"
                  className="w-full text-2xl font-bold outline-none bg-transparent"
                  style={theme.headingColor ? { color: theme.headingColor } : undefined}
                />
                <input
                  value={getLoc(json.description)}
                  onChange={(e) => setSurveyText("description")(e.target.value)}
                  placeholder="Survey description"
                  className="w-full mt-1 text-sm text-gray-500 outline-none bg-transparent"
                />
              </div>

              {json.pages.map((page: any, pi: number) => (
                <div key={pi} className="border-b last:border-b-0">
                  <div
                    onClick={() => setSel({ kind: "page", p: pi })}
                    className={`flex items-center justify-between px-8 py-2 text-xs font-semibold uppercase tracking-wide cursor-pointer ${sel.kind === "page" && sel.p === pi ? "text-white" : "bg-gray-50 text-gray-500"}`}
                    style={sel.kind === "page" && sel.p === pi ? { backgroundColor: ACCENT } : undefined}
                  >
                    <span>{getLoc(page.title) || page.name}</span>
                    {json.pages.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(pi);
                        }}
                        className="opacity-70 hover:opacity-100"
                        title="Delete page"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="px-8 py-4">
                    <ElementList ctx={ctx} container={[pi]} nodes={childrenOf(page)} />
                  </div>
                </div>
              ))}

              <div className="p-4 border-t">
                <button
                  onClick={addPage}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded hover:bg-gray-50"
                  style={{ color: ACCENT, borderColor: ACCENT }}
                >
                  <Plus className="h-4 w-4" /> Add page
                </button>
              </div>
            </div>
          </main>

          <aside className="w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            <PropertyGrid key={selectedKey} json={json} sel={sel} onPatch={applyPatch} />
          </aside>
        </div>
      )}

      {tab === "preview" && <PreviewTab json={json} theme={theme} />}
      {tab === "logic" && <LogicTab json={json} onChange={(next) => commit(next)} />}
      {tab === "theme" && <ThemeTab json={json} theme={theme} onChange={setTheme} />}
      {tab === "translations" && (
        <TranslationTab json={json} locales={locales} setLocales={setLocales} onChange={(next) => commit(next)} />
      )}
      {tab === "json" && (
        <JsonTab key={`${version}-${past.current.length}`} json={json} onApply={(next) => commit(next)} />
      )}
    </div>
  );
}
