"use client";

import React, { useMemo } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import {
  Copy, Trash2, ArrowUp, ArrowDown, GripVertical,
  Type, AlignLeft, CircleDot, CheckSquare, List, ToggleLeft, Star, ListOrdered, Table,
  LayoutList, Upload, Code, Image as ImageIcon, Images, PenLine, Square, Layers,
} from "lucide-react";
import { childrenOf, getLoc, isContainer, pathEq, Path, Selection, typeLabel } from "./model";
import { Themed, SurveyTheme } from "./theme";
import { attachAppearance, parseAppearance } from "./appearance";

export const ACCENT = "#19b394";

export const ICONS: Record<string, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  comment: <AlignLeft className="h-4 w-4" />,
  radiogroup: <CircleDot className="h-4 w-4" />,
  checkbox: <CheckSquare className="h-4 w-4" />,
  dropdown: <List className="h-4 w-4" />,
  boolean: <ToggleLeft className="h-4 w-4" />,
  rating: <Star className="h-4 w-4" />,
  ranking: <ListOrdered className="h-4 w-4" />,
  imagepicker: <Images className="h-4 w-4" />,
  matrix: <Table className="h-4 w-4" />,
  multipletext: <LayoutList className="h-4 w-4" />,
  signaturepad: <PenLine className="h-4 w-4" />,
  file: <Upload className="h-4 w-4" />,
  html: <Code className="h-4 w-4" />,
  image: <ImageIcon className="h-4 w-4" />,
  panel: <Square className="h-4 w-4" />,
  paneldynamic: <Layers className="h-4 w-4" />,
};

export type DragSrc = { kind: "toolbox"; type: string } | { kind: "question"; path: Path };
export interface Over {
  c: Path;
  i: number;
}

export interface SurfaceCtx {
  sel: Selection;
  over: Over | null;
  theme: SurveyTheme;
  drag: React.MutableRefObject<DragSrc | null>;
  setOver: (o: Over | null) => void;
  select: (s: Selection) => void;
  drop: () => void;
  move: (path: Path, dir: -1 | 1) => void;
  duplicate: (path: Path) => void;
  remove: (path: Path) => void;
}

function QuestionPreview({ q, theme }: { q: any; theme: SurveyTheme }) {
  const key = JSON.stringify(q);
  const model = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visibleIf, enableIf, requiredIf, visible, readOnly, ...rest } = q;
    const m = new Model({
      showTitle: false,
      showPageTitles: false,
      showNavigationButtons: "none",
      showQuestionNumbers: "off",
      mode: "display",
      elements: [{ ...rest, titleLocation: "top" }],
    });
    attachAppearance(m);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <div className="pointer-events-none select-none">
      <Themed theme={theme}>
        <Survey model={model} />
      </Themed>
    </div>
  );
}

function panelStyle(node: any): React.CSSProperties {
  const a = parseAppearance(node.appearance);
  if (!a) return {};
  const s: React.CSSProperties = {};
  if (a.backgroundColor) s.backgroundColor = a.backgroundColor;
  if (a.borderColor) s.border = `1px solid ${a.borderColor}`;
  if (typeof a.borderRadius === "number") s.borderRadius = a.borderRadius;
  if (a.textColor) s.color = a.textColor;
  if (a.fontFamily) s.fontFamily = a.fontFamily;
  if (a.backgroundImage) {
    s.backgroundImage = `url("${a.backgroundImage}")`;
    s.backgroundSize = "cover";
    s.backgroundPosition = "center";
  }
  return s;
}

function ElementCard({
  ctx, node, path, container, index, count,
}: {
  ctx: SurfaceCtx; node: any; path: Path; container: Path; index: number; count: number;
}) {
  const selected = ctx.sel.kind === "question" && pathEq(ctx.sel.path, path);
  const container_ = isContainer(node.type);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        ctx.drag.current = { kind: "question", path };
        e.dataTransfer.setData("text/plain", node.name || "");
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        ctx.drag.current = null;
        ctx.setOver(null);
      }}
      onDragOver={(e) => {
        if (!ctx.drag.current) return;
        e.preventDefault();
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        ctx.setOver({ c: container, i: e.clientY < r.top + r.height / 2 ? index : index + 1 });
      }}
      onClick={(e) => {
        e.stopPropagation();
        ctx.select({ kind: "question", path });
      }}
      className={`group relative my-2 rounded border bg-white cursor-pointer ${selected ? "shadow-md" : "border-gray-200 hover:border-gray-300"}`}
      style={selected ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-gray-50 text-xs text-gray-500 rounded-t">
        <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
        <span style={{ color: ACCENT }}>{ICONS[node.type]}</span>
        <span className="font-medium text-gray-700">{node.name}</span>
        <span className="text-gray-400">· {typeLabel(node.type)}</span>
        {(node.visibleIf || node.enableIf || node.requiredIf) && (
          <span className="text-[10px] px-1.5 rounded bg-amber-100 text-amber-700">logic</span>
        )}
        {node.validators?.length > 0 && (
          <span className="text-[10px] px-1.5 rounded bg-sky-100 text-sky-700">validation</span>
        )}
        <div className={`ml-auto flex items-center gap-0.5 ${selected ? "" : "opacity-0 group-hover:opacity-100"}`}>
          <button onClick={(e) => { e.stopPropagation(); ctx.move(path, -1); }} disabled={index === 0} className="p-1 hover:text-gray-800 disabled:opacity-30" title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); ctx.move(path, 1); }} disabled={index === count - 1} className="p-1 hover:text-gray-800 disabled:opacity-30" title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); ctx.duplicate(path); }} className="p-1 hover:text-gray-800" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); ctx.remove(path); }} className="p-1 hover:text-red-500" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {container_ ? (
        <div className="p-3" style={panelStyle(node)}>
          {(getLoc(node.title) || node.type === "paneldynamic") && (
            <div className="text-sm font-semibold text-gray-800 mb-1">
              {getLoc(node.title) || node.name}
              {node.type === "paneldynamic" && (
                <span className="ml-2 text-xs font-normal text-gray-400">repeats per respondent · template below</span>
              )}
            </div>
          )}
          <ElementList ctx={ctx} container={path} nodes={childrenOf(node)} nested />
        </div>
      ) : (
        <div className="p-4">
          <QuestionPreview q={node} theme={ctx.theme} />
        </div>
      )}
    </div>
  );
}

export function ElementList({
  ctx, container, nodes, nested,
}: {
  ctx: SurfaceCtx; container: Path; nodes: any[]; nested?: boolean;
}) {
  const marker = (i: number) =>
    ctx.over && pathEq(ctx.over.c, container) && ctx.over.i === i ? (
      <div className="h-1 rounded my-1" style={{ backgroundColor: ACCENT }} />
    ) : null;

  return (
    <div
      className={nested ? "min-h-[56px] rounded border border-dashed border-gray-300 p-2" : "min-h-[60px]"}
      onDragOver={(e) => {
        if (!ctx.drag.current) return;
        e.preventDefault();
        e.stopPropagation();
        ctx.setOver({ c: container, i: nodes.length });
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        ctx.drop();
      }}
    >
      {nodes.length === 0 && (
        <div
          className={`rounded py-5 text-center text-sm ${nested ? "text-gray-400" : "border-2 border-dashed py-8 text-gray-400"}`}
          style={ctx.over && pathEq(ctx.over.c, container) ? { color: ACCENT } : undefined}
        >
          {marker(0)}
          Drag a question here from the Toolbox, or click one to add it.
        </div>
      )}
      {nodes.map((n, i) => (
        <div key={`${n.name}-${i}`}>
          {marker(i)}
          <ElementCard ctx={ctx} node={n} path={[...container, i]} container={container} index={i} count={nodes.length} />
        </div>
      ))}
      {nodes.length > 0 && marker(nodes.length)}
    </div>
  );
}
