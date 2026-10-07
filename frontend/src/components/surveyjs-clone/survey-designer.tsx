"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import {
  ArrowLeft, Save, Undo2, Redo2, Copy, Trash2, Plus, ArrowUp, ArrowDown, GripVertical,
  Type, AlignLeft, CircleDot, CheckSquare, List, ToggleLeft, Star, ListOrdered, Table,
  LayoutList, Upload, Code, Monitor, Tablet, Smartphone, RotateCcw,
} from "lucide-react";
import { createRFI, updateRFI } from "@/lib/api";
import {
  QUESTION_TYPES, clone, normalizeSurvey, emptySurvey, createQuestion, allQuestionNames,
  allQuestions, uniqueName, uniquePageName, selectionValid, typeLabel, Selection,
} from "./model";
import PropertyGrid from "./property-grid";
import "survey-core/defaultV2.min.css";

const ACCENT = "#19b394";

const ICONS: Record<string, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  comment: <AlignLeft className="h-4 w-4" />,
  radiogroup: <CircleDot className="h-4 w-4" />,
  checkbox: <CheckSquare className="h-4 w-4" />,
  dropdown: <List className="h-4 w-4" />,
  boolean: <ToggleLeft className="h-4 w-4" />,
  rating: <Star className="h-4 w-4" />,
  ranking: <ListOrdered className="h-4 w-4" />,
  matrix: <Table className="h-4 w-4" />,
  multipletext: <LayoutList className="h-4 w-4" />,
  file: <Upload className="h-4 w-4" />,
  html: <Code className="h-4 w-4" />,
};

const PLACEHOLDER_HTML =
  '<div style="padding:24px;color:#64748b;font-size:14px;">This form is built with the SurveyJS-style designer and is rendered by the SurveyJS runtime on the public page.</div>';

type Tab = "designer" | "preview" | "logic" | "json";
type DragSrc = { kind: "toolbox"; type: string } | { kind: "question"; p: number; e: number };

// ── Design-time preview of a single question, rendered by the runtime in display mode ──

function QuestionPreview({ q }: { q: any }) {
  const key = JSON.stringify(q);
  const model = useMemo(() => {
    const { visibleIf, enableIf, requiredIf, visible, readOnly, ...rest } = q;
    return new Model({
      showTitle: false,
      showPageTitles: false,
      showNavigationButtons: "none",
      showQuestionNumbers: "off",
      mode: "display",
      elements: [{ ...rest, titleLocation: "top" }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <div className="pointer-events-none select-none">
      <Survey model={model} />
    </div>
  );
}

// ── Preview tab ──

function PreviewTab({ json }: { json: any }) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "phone">("desktop");
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<any>(null);
  const model = useMemo(() => {
    const m = new Model(json);
    m.showCompletedPage = false;
    m.onComplete.add((s) => setResult(s.data));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(json), run]);
  const width = device === "desktop" ? "100%" : device === "tablet" ? "768px" : "375px";

  return (
    <div className="flex-1 overflow-y-auto bg-[#f3f3f3]">
      <div className="flex items-center justify-center gap-2 py-3 border-b bg-white">
        {([["desktop", <Monitor key="d" className="h-4 w-4" />], ["tablet", <Tablet key="t" className="h-4 w-4" />], ["phone", <Smartphone key="p" className="h-4 w-4" />]] as const).map(
          ([d, icon]) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`p-2 rounded border ${device === d ? "text-white border-transparent" : "text-gray-600 border-gray-300 bg-white hover:bg-gray-50"}`}
              style={device === d ? { backgroundColor: ACCENT } : undefined}
              title={d}
            >
              {icon}
            </button>
          )
        )}
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
      <div className="mx-auto my-6 bg-white shadow rounded" style={{ width, maxWidth: "100%" }}>
        {result ? (
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Survey Result</h3>
            <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        ) : (
          <Survey model={model} />
        )}
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
              const parsed = JSON.parse(text);
              onApply(normalizeSurvey(parsed));
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

// ── Logic tab ──

const OPERATORS = ["=", "!=", ">", "<", ">=", "<=", "contains", "notempty", "empty"];
const ACTIONS: { key: "visibleIf" | "enableIf" | "requiredIf"; label: string }[] = [
  { key: "visibleIf", label: "Make question visible" },
  { key: "enableIf", label: "Make question enabled" },
  { key: "requiredIf", label: "Make question required" },
];

function LogicTab({ json, onChange }: { json: any; onChange: (next: any) => void }) {
  const qs = allQuestions(json);
  const [source, setSource] = useState("");
  const [op, setOp] = useState("=");
  const [value, setValue] = useState("");
  const [target, setTarget] = useState("");
  const [action, setAction] = useState<"visibleIf" | "enableIf" | "requiredIf">("visibleIf");

  const rules: { p: number; e: number; name: string; key: string; expr: string }[] = [];
  qs.forEach(({ q, p, e }) => {
    for (const a of ACTIONS) if (q[a.key]) rules.push({ p, e, name: q.name, key: a.key, expr: q[a.key] });
  });

  const buildExpr = () => {
    const left = `{${source}}`;
    if (op === "empty" || op === "notempty") return `${left} ${op}`;
    const v = value.trim();
    const lit = v !== "" && !isNaN(Number(v)) ? v : `'${v.replace(/'/g, "\\'")}'`;
    return `${left} ${op} ${lit}`;
  };

  const addRule = () => {
    if (!source || !target || source === target) return;
    const next = clone(json);
    const hit = allQuestions(next).find((x) => x.q.name === target);
    if (!hit) return;
    const expr = buildExpr();
    hit.q[action] = hit.q[action] ? `(${hit.q[action]}) and (${expr})` : expr;
    onChange(next);
  };

  const removeRule = (p: number, e: number, key: string) => {
    const next = clone(json);
    delete next.pages[p].elements[e][key];
    onChange(next);
  };

  const sel = "px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-[#19b394]";

  return (
    <div className="flex-1 overflow-y-auto bg-[#f3f3f3] p-6">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Survey Logic</h3>
        <p className="text-sm text-gray-500 mb-5">Show, enable or require questions based on answers to other questions.</p>

        <div className="flex flex-wrap items-center gap-2 mb-6 p-4 border rounded bg-gray-50">
          <span className="text-sm font-medium text-gray-700">If</span>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={sel}>
            <option value="">select question…</option>
            {qs.map(({ q }) => (
              <option key={q.name} value={q.name}>{q.title || q.name}</option>
            ))}
          </select>
          <select value={op} onChange={(e) => setOp(e.target.value)} className={sel}>
            {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {op !== "empty" && op !== "notempty" && (
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="value" className={`${sel} w-32`} />
          )}
          <span className="text-sm font-medium text-gray-700">then</span>
          <select value={action} onChange={(e) => setAction(e.target.value as any)} className={sel}>
            {ACTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className={sel}>
            <option value="">select question…</option>
            {qs.map(({ q }) => (
              <option key={q.name} value={q.name}>{q.title || q.name}</option>
            ))}
          </select>
          <button
            onClick={addRule}
            disabled={!source || !target || source === target}
            className="px-4 py-1.5 text-sm font-semibold text-white rounded disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            Add rule
          </button>
        </div>

        {rules.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No logic rules yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-400 border-b">
                <th className="py-2 pr-3">Question</th>
                <th className="py-2 pr-3">Rule</th>
                <th className="py-2 pr-3">Expression</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={`${r.name}-${r.key}`} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium text-gray-800">{r.name}</td>
                  <td className="py-2 pr-3 text-gray-600">{r.key}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-gray-700">{r.expr}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => removeRule(r.p, r.e, r.key)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main designer ──

export default function SurveyDesigner({
  initialJson,
  initialTitle,
  rfiId,
  workspaceId,
}: {
  initialJson?: any;
  initialTitle?: string;
  rfiId?: string;
  workspaceId?: string;
}) {
  const router = useRouter();
  const [json, setJson] = useState<any>(() =>
    normalizeSurvey(initialJson || emptySurvey(initialTitle || "Untitled Survey"))
  );
  const [sel, setSel] = useState<Selection>({ kind: "survey" });
  const [tab, setTab] = useState<Tab>("designer");
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [over, setOver] = useState<{ p: number; i: number } | null>(null);

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
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        latest.current.undo();
      } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
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
    else target = next.pages[sel.p].elements[sel.e];
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) delete target[k];
      else target[k] = v;
    }
    const selKey = sel.kind === "question" ? `${sel.p}.${sel.e}` : sel.kind;
    commit(next, key ? `${selKey}:${key}` : undefined);
  };

  const insertQuestion = (type: string, p: number, i: number) => {
    const next = clone(json);
    const q = createQuestion(next, type);
    next.pages[p].elements.splice(i, 0, q);
    commit(next);
    setSel({ kind: "question", p, e: i });
  };

  const addFromToolbox = (type: string) => {
    if (sel.kind === "question") insertQuestion(type, sel.p, sel.e + 1);
    else if (sel.kind === "page") insertQuestion(type, sel.p, json.pages[sel.p].elements.length);
    else {
      const p = json.pages.length - 1;
      insertQuestion(type, p, json.pages[p].elements.length);
    }
  };

  const dropHere = () => {
    const d = drag.current;
    const target = over;
    drag.current = null;
    setOver(null);
    if (!d || !target) return;
    if (d.kind === "toolbox") {
      insertQuestion(d.type, target.p, target.i);
      return;
    }
    const next = clone(json);
    const [moved] = next.pages[d.p].elements.splice(d.e, 1);
    let idx = target.i;
    if (target.p === d.p && d.e < idx) idx -= 1;
    next.pages[target.p].elements.splice(idx, 0, moved);
    commit(next);
    setSel({ kind: "question", p: target.p, e: idx });
  };

  const duplicateQuestion = (p: number, e: number) => {
    const next = clone(json);
    const copy = clone(next.pages[p].elements[e]);
    copy.name = uniqueName(allQuestionNames(next), "question");
    next.pages[p].elements.splice(e + 1, 0, copy);
    commit(next);
    setSel({ kind: "question", p, e: e + 1 });
  };

  const deleteQuestion = (p: number, e: number) => {
    const next = clone(json);
    next.pages[p].elements.splice(e, 1);
    commit(next);
    setSel({ kind: "survey" });
  };

  const moveQuestion = (p: number, e: number, dir: -1 | 1) => {
    const j = e + dir;
    const els = json.pages[p].elements;
    if (j < 0 || j >= els.length) return;
    const next = clone(json);
    const arr = next.pages[p].elements;
    [arr[e], arr[j]] = [arr[j], arr[e]];
    commit(next);
    setSel({ kind: "question", p, e: j });
  };

  const addPage = () => {
    const next = clone(json);
    next.pages.push({ name: uniquePageName(next), elements: [] });
    commit(next);
    setSel({ kind: "page", p: next.pages.length - 1 });
  };

  const deletePage = (p: number) => {
    if (json.pages.length <= 1) return;
    if (json.pages[p].elements.length > 0 && !confirm("Delete this page and all of its questions?")) return;
    const next = clone(json);
    next.pages.splice(p, 1);
    commit(next);
    setSel({ kind: "survey" });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const subject = json.title || initialTitle || "Untitled Survey";
      const content = {
        surveyDefinition: json,
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

  // ── Render ──

  const tabs: { key: Tab; label: string }[] = [
    { key: "designer", label: "Designer" },
    { key: "preview", label: "Preview" },
    { key: "logic", label: "Logic" },
    { key: "json", label: "JSON Editor" },
  ];

  const selectedKey = `${sel.kind}-${"p" in sel ? sel.p : ""}-${"e" in sel ? sel.e : ""}-${version}`;

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
              className={`px-5 text-sm h-full border-b-4 ${tab === t.key ? "border-white font-semibold bg-white/10" : "border-transparent hover:bg-white/10"}`}
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
          {/* Toolbox */}
          <aside className="w-60 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Toolbox</div>
            {QUESTION_TYPES.map((t) => (
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
          </aside>

          {/* Design surface */}
          <main
            className="flex-1 overflow-y-auto bg-[#f3f3f3] p-6"
            onClick={() => setSel({ kind: "survey" })}
          >
            <div className="max-w-[820px] mx-auto bg-white shadow rounded" onClick={(e) => e.stopPropagation()}>
              <div
                className={`px-8 pt-8 pb-4 border-b cursor-pointer ${sel.kind === "survey" ? "ring-2 ring-inset" : ""}`}
                style={sel.kind === "survey" ? ({ ["--tw-ring-color" as any]: ACCENT } as React.CSSProperties) : undefined}
                onClick={() => setSel({ kind: "survey" })}
              >
                <input
                  value={json.title || ""}
                  onChange={(e) => {
                    const next = clone(json);
                    if (e.target.value) next.title = e.target.value;
                    else delete next.title;
                    commit(next, "survey:title");
                  }}
                  placeholder="Survey title"
                  className="w-full text-2xl font-bold outline-none bg-transparent"
                />
                <input
                  value={json.description || ""}
                  onChange={(e) => {
                    const next = clone(json);
                    if (e.target.value) next.description = e.target.value;
                    else delete next.description;
                    commit(next, "survey:description");
                  }}
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
                    <span>{page.title || page.name}</span>
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

                  <div
                    className="px-8 py-4 min-h-[90px]"
                    onDragOver={(e) => {
                      if (!drag.current) return;
                      e.preventDefault();
                      if (page.elements.length === 0) setOver({ p: pi, i: 0 });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      dropHere();
                    }}
                  >
                    {page.elements.length === 0 && (
                      <div
                        className={`border-2 border-dashed rounded py-8 text-center text-sm ${over?.p === pi ? "text-gray-700" : "text-gray-400"}`}
                        style={over?.p === pi ? { borderColor: ACCENT } : undefined}
                      >
                        Drag a question here from the Toolbox, or click one to add it.
                      </div>
                    )}

                    {page.elements.map((q: any, ei: number) => {
                      const selected = sel.kind === "question" && sel.p === pi && sel.e === ei;
                      return (
                        <div key={`${q.name}-${ei}`}>
                          {over?.p === pi && over.i === ei && <div className="h-1 rounded my-1" style={{ backgroundColor: ACCENT }} />}
                          <div
                            draggable
                            onDragStart={(e) => {
                              drag.current = { kind: "question", p: pi, e: ei };
                              e.dataTransfer.setData("text/plain", q.name);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => {
                              drag.current = null;
                              setOver(null);
                            }}
                            onDragOver={(e) => {
                              if (!drag.current) return;
                              e.preventDefault();
                              e.stopPropagation();
                              const r = e.currentTarget.getBoundingClientRect();
                              setOver({ p: pi, i: e.clientY < r.top + r.height / 2 ? ei : ei + 1 });
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSel({ kind: "question", p: pi, e: ei });
                            }}
                            className={`group relative my-2 rounded border bg-white cursor-pointer ${selected ? "shadow-md" : "border-gray-200 hover:border-gray-300"}`}
                            style={selected ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
                          >
                            <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-gray-50 text-xs text-gray-500 rounded-t">
                              <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                              <span style={{ color: ACCENT }}>{ICONS[q.type]}</span>
                              <span className="font-medium text-gray-700">{q.name}</span>
                              <span className="text-gray-400">· {typeLabel(q.type)}</span>
                              {q.visibleIf && <span className="text-[10px] px-1.5 rounded bg-amber-100 text-amber-700">logic</span>}
                              <div className={`ml-auto flex items-center gap-0.5 ${selected ? "" : "opacity-0 group-hover:opacity-100"}`}>
                                <button onClick={(e) => { e.stopPropagation(); moveQuestion(pi, ei, -1); }} disabled={ei === 0} className="p-1 hover:text-gray-800 disabled:opacity-30" title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); moveQuestion(pi, ei, 1); }} disabled={ei === page.elements.length - 1} className="p-1 hover:text-gray-800 disabled:opacity-30" title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); duplicateQuestion(pi, ei); }} className="p-1 hover:text-gray-800" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteQuestion(pi, ei); }} className="p-1 hover:text-red-500" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </div>
                            <div className="p-4">
                              <QuestionPreview q={q} />
                            </div>
                          </div>
                          {over?.p === pi && over.i === ei + 1 && ei === page.elements.length - 1 && (
                            <div className="h-1 rounded my-1" style={{ backgroundColor: ACCENT }} />
                          )}
                        </div>
                      );
                    })}
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

          {/* Property grid */}
          <aside className="w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            <PropertyGrid key={selectedKey} json={json} sel={sel} onPatch={applyPatch} />
          </aside>
        </div>
      )}

      {tab === "preview" && <PreviewTab json={json} />}
      {tab === "logic" && <LogicTab json={json} onChange={(next) => commit(next)} />}
      {tab === "json" && (
        <JsonTab
          key={`${version}-${past.current.length}`}
          json={json}
          onApply={(next) => commit(next)}
        />
      )}
    </div>
  );
}
