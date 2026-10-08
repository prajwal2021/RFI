"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  getNode, getLoc, setLocDefault, itemsToLines, linesToItems, linesToNamedItems,
  imagesToLines, linesToImages, typeLabel, Selection,
} from "./model";
import { parseAppearance, stringifyAppearance, Appearance } from "./appearance";
import { FONTS } from "./theme";
import ImageLibraryModal from "@/components/image-library-modal";
import ImageEditorModal from "@/components/image-editor-modal";
import { isLibraryUrl } from "@/lib/images";

const inputCls =
  "w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#19b394] focus:ring-1 focus:ring-[#19b394] bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
      >
        {title}
        <span className="text-gray-400 text-xs">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-4 pb-3 pt-1">{children}</div>}
    </div>
  );
}

function Text({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: any; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </Field>
  );
}

function Area({
  label, value, onChange, rows = 3, placeholder, mono,
}: {
  label: string; value: any; onChange: (v: string) => void; rows?: number; placeholder?: string; mono?: boolean;
}) {
  return (
    <Field label={label}>
      <textarea
        rows={rows}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} resize-y ${mono ? "font-mono text-xs" : ""}`}
      />
    </Field>
  );
}

function LinesArea({
  label, initial, onLines, hint,
}: {
  label: string; initial: string; onLines: (text: string) => void; hint?: string;
}) {
  const [text, setText] = useState(initial);
  return (
    <Field label={label}>
      <textarea
        rows={5}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onLines(e.target.value);
        }}
        className={`${inputCls} resize-y`}
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </Field>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#19b394]"
      />
    </label>
  );
}

function Select({
  label, value, options, onChange,
}: {
  label: string; value: any; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={value ?? options[0]} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ColorField({
  label, value, onChange,
}: {
  label: string; value?: string; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value || "") ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 p-0 border border-gray-300 rounded cursor-pointer shrink-0"
        />
        <input
          value={value || ""}
          placeholder="default"
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
        {value && (
          <button onClick={() => onChange("")} className="text-xs text-gray-400 hover:text-red-500 shrink-0">
            Clear
          </button>
        )}
      </div>
    </Field>
  );
}

export function ImageField({
  label, value, onChange, category,
}: {
  label: string; value?: string; onChange: (v: string) => void; category?: string;
}) {
  const [showLib, setShowLib] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const upload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 750 * 1024) {
      alert("Image is larger than 750 KB. Use a smaller image or paste a URL.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };
  const isData = (value || "").startsWith("data:");
  const isLib = isLibraryUrl(value);
  return (
    <Field label={label}>
      <input
        value={isData ? "(uploaded image)" : isLib ? "(library image)" : value || ""}
        readOnly={isData || isLib}
        placeholder="Image URL"
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
      <div className="flex items-center gap-3 mt-1.5">
        <button type="button" onClick={() => setShowLib(true)} className="text-xs font-semibold" style={{ color: "#19b394" }}>
          Library…
        </button>
        <label className="text-xs font-medium cursor-pointer" style={{ color: "#19b394" }}>
          Upload…
          <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {value && (
          <button type="button" onClick={() => setShowEdit(true)} className="text-xs font-semibold" style={{ color: "#19b394" }}>
            Edit…
          </button>
        )}
        {value && (
          <button onClick={() => onChange("")} className="text-xs text-gray-400 hover:text-red-500">
            Remove
          </button>
        )}
      </div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 max-h-20 rounded border border-gray-200" />
      )}
      {showLib && <ImageLibraryModal initialCategory={category} onPick={onChange} onClose={() => setShowLib(false)} />}
      {showEdit && value && <ImageEditorModal src={value} onApply={onChange} onClose={() => setShowEdit(false)} />}
    </Field>
  );
}

function AppearanceEditor({
  raw, onChange,
}: {
  raw: any; onChange: (json: string | undefined) => void;
}) {
  const a: Appearance = parseAppearance(raw) || {};
  const upd = (patch: Partial<Appearance>) => onChange(stringifyAppearance({ ...a, ...patch }));
  return (
    <div>
      <ColorField label="Title color" value={a.titleColor} onChange={(v) => upd({ titleColor: v })} />
      <Text label="Title font size (px)" type="number" value={a.titleSize} onChange={(v) => upd({ titleSize: v === "" ? undefined : Number(v) })} />
      <Check label="Bold title" checked={!!a.titleBold} onChange={(v) => upd({ titleBold: v })} />
      <ColorField label="Text color" value={a.textColor} onChange={(v) => upd({ textColor: v })} />
      <ColorField label="Background color" value={a.backgroundColor} onChange={(v) => upd({ backgroundColor: v })} />
      <ColorField label="Border color" value={a.borderColor} onChange={(v) => upd({ borderColor: v })} />
      <Text label="Corner radius (px)" type="number" value={a.borderRadius} onChange={(v) => upd({ borderRadius: v === "" ? undefined : Number(v) })} />
      <Field label="Font">
        <select value={a.fontFamily || ""} onChange={(e) => upd({ fontFamily: e.target.value })} className={inputCls}>
          {FONTS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>
      <ImageField label="Background image" category="Backgrounds" value={a.backgroundImage} onChange={(v) => upd({ backgroundImage: v })} />
    </div>
  );
}

// ── Validators ──

type VField = { key: string; label: string; kind: "text" | "number" | "bool" };
const VALIDATORS: Record<string, { label: string; fields: VField[] }> = {
  numeric: {
    label: "Numeric range",
    fields: [
      { key: "minValue", label: "Minimum value", kind: "number" },
      { key: "maxValue", label: "Maximum value", kind: "number" },
      { key: "text", label: "Error message", kind: "text" },
    ],
  },
  text: {
    label: "Text length",
    fields: [
      { key: "minLength", label: "Minimum length", kind: "number" },
      { key: "maxLength", label: "Maximum length", kind: "number" },
      { key: "allowDigits", label: "Allow digits", kind: "bool" },
      { key: "text", label: "Error message", kind: "text" },
    ],
  },
  regex: {
    label: "Regular expression",
    fields: [
      { key: "regex", label: "Pattern", kind: "text" },
      { key: "text", label: "Error message", kind: "text" },
    ],
  },
  email: { label: "Email address", fields: [{ key: "text", label: "Error message", kind: "text" }] },
  expression: {
    label: "Custom expression",
    fields: [
      { key: "expression", label: "Valid when (expression)", kind: "text" },
      { key: "text", label: "Error message", kind: "text" },
    ],
  },
  answercount: {
    label: "Answer count",
    fields: [
      { key: "minCount", label: "Minimum answers", kind: "number" },
      { key: "maxCount", label: "Maximum answers", kind: "number" },
      { key: "text", label: "Error message", kind: "text" },
    ],
  },
};

function allowedValidators(type: string): string[] {
  switch (type) {
    case "text":
      return ["numeric", "text", "regex", "email", "expression"];
    case "comment":
      return ["text", "regex", "expression"];
    case "checkbox":
    case "ranking":
    case "imagepicker":
      return ["answercount", "expression"];
    default:
      return ["expression"];
  }
}

function ValidatorsEditor({ q, onPatch }: { q: any; onPatch: (p: Record<string, any>, k?: string) => void }) {
  const list: any[] = Array.isArray(q.validators) ? q.validators : [];
  const allowed = allowedValidators(q.type);
  const [addType, setAddType] = useState(allowed[0]);
  const save = (next: any[]) => onPatch({ validators: next.length ? next : undefined }, "validators");

  return (
    <div>
      {list.map((v, i) => {
        const def = VALIDATORS[v.type];
        if (!def) return null;
        return (
          <div key={i} className="mb-3 p-3 border border-gray-200 rounded bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">{def.label}</span>
              <button onClick={() => save(list.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {def.fields.map((f) =>
              f.kind === "bool" ? (
                <Check
                  key={f.key}
                  label={f.label}
                  checked={v[f.key] !== false}
                  onChange={(b) => save(list.map((x, j) => (j === i ? { ...x, [f.key]: b } : x)))}
                />
              ) : (
                <Text
                  key={f.key}
                  label={f.label}
                  type={f.kind === "number" ? "number" : "text"}
                  value={v[f.key]}
                  onChange={(val) =>
                    save(
                      list.map((x, j) => {
                        if (j !== i) return x;
                        const n = { ...x };
                        if (val === "") delete n[f.key];
                        else n[f.key] = f.kind === "number" ? Number(val) : val;
                        return n;
                      })
                    )
                  }
                />
              )
            )}
          </div>
        );
      })}
      <div className="flex gap-2">
        <select value={addType} onChange={(e) => setAddType(e.target.value)} className={inputCls}>
          {allowed.map((t) => (
            <option key={t} value={t}>
              {VALIDATORS[t].label}
            </option>
          ))}
        </select>
        <button
          onClick={() => save([...list, { type: addType }])}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white rounded shrink-0"
          style={{ backgroundColor: "#19b394" }}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  );
}

// ── Grid ──

type Patch = Record<string, any>;

export default function PropertyGrid({
  json,
  sel,
  onPatch,
}: {
  json: any;
  sel: Selection;
  onPatch: (patch: Patch, coalesceKey?: string) => void;
}) {
  const set = (k: string) => (v: any) => onPatch({ [k]: v === "" || v === false ? undefined : v }, k);
  const setNum = (k: string) => (v: string) => onPatch({ [k]: v === "" ? undefined : Number(v) }, k);
  const loc = (holder: any, k: string) => (v: string) => onPatch({ [k]: setLocDefault(holder[k], v) }, k);

  if (sel.kind === "survey") {
    return (
      <div>
        <PanelTitle title={getLoc(json.title) || "Survey"} subtitle="Survey" />
        <Section title="General">
          <Text label="Title" value={getLoc(json.title)} onChange={loc(json, "title")} />
          <Area label="Description" value={getLoc(json.description)} onChange={loc(json, "description")} rows={2} />
        </Section>
        <Section title="Navigation">
          <Select
            label="Question numbers"
            value={json.showQuestionNumbers || "off"}
            options={["off", "on", "onPage"]}
            onChange={(v) => onPatch({ showQuestionNumbers: v === "off" ? undefined : v })}
          />
          <Select
            label="Progress bar"
            value={json.showProgressBar || "off"}
            options={["off", "top", "bottom", "both"]}
            onChange={(v) => onPatch({ showProgressBar: v === "off" ? undefined : v })}
          />
          <Select
            label="Page mode"
            value={json.questionsOnPageMode || "standard"}
            options={["standard", "singlePage", "questionPerPage"]}
            onChange={(v) => onPatch({ questionsOnPageMode: v === "standard" ? undefined : v })}
          />
          <Text label="Next button text" value={getLoc(json.pageNextText)} onChange={loc(json, "pageNextText")} />
          <Text label="Previous button text" value={getLoc(json.pagePrevText)} onChange={loc(json, "pagePrevText")} />
          <Text label="Complete button text" value={getLoc(json.completeText)} onChange={loc(json, "completeText")} />
        </Section>
        <Section title="Logo">
          <ImageField label="Logo" category="Official Logos" value={json.logo} onChange={(v) => onPatch({ logo: v || undefined })} />
          <Select
            label="Logo position"
            value={json.logoPosition || "left"}
            options={["left", "right", "top", "bottom", "none"]}
            onChange={(v) => onPatch({ logoPosition: v === "left" ? undefined : v })}
          />
          <Text label="Logo width (px)" type="number" value={json.logoWidth} onChange={setNum("logoWidth")} />
          <Text label="Logo height (px)" type="number" value={json.logoHeight} onChange={setNum("logoHeight")} />
          <Select
            label="Logo fit"
            value={json.logoFit || "contain"}
            options={["contain", "cover", "fill", "none"]}
            onChange={(v) => onPatch({ logoFit: v === "contain" ? undefined : v })}
          />
        </Section>
        <Section title="Completion">
          <Area label="Completed page HTML" value={getLoc(json.completedHtml)} onChange={loc(json, "completedHtml")} rows={3} mono />
        </Section>
        <Section title="Required">
          <Text label="Required mark" value={json.requiredMark} onChange={set("requiredMark")} placeholder="*" />
          <Text label="Question title pattern" value={json.questionTitlePattern} onChange={set("questionTitlePattern")} />
        </Section>
      </div>
    );
  }

  if (sel.kind === "page") {
    const page = json.pages[sel.p];
    return (
      <div>
        <PanelTitle title={page.name} subtitle="Page" />
        <Section title="General">
          <Text label="Name" value={page.name} onChange={(v) => onPatch({ name: v }, "name")} />
          <Text label="Title" value={getLoc(page.title)} onChange={loc(page, "title")} />
          <Area label="Description" value={getLoc(page.description)} onChange={loc(page, "description")} rows={2} />
        </Section>
        <Section title="Appearance">
          <AppearanceEditor raw={page.appearance} onChange={(v) => onPatch({ appearance: v }, "appearance")} />
        </Section>
        <Section title="Logic">
          <Area label="Visible if" value={page.visibleIf} onChange={set("visibleIf")} rows={2} mono placeholder="{question1} = 'Item 1'" />
        </Section>
      </div>
    );
  }

  const q = getNode(json, sel.path);
  if (!q) return null;
  const t: string = q.type;
  const hasChoices = ["radiogroup", "checkbox", "dropdown", "ranking"].includes(t);
  const selKey = sel.path.join("-") + "-" + t;
  const isStatic = t === "html" || t === "panel" || t === "image";

  return (
    <div>
      <PanelTitle title={q.name} subtitle={typeLabel(t)} />
      <Section title="General">
        <Text label="Name" value={q.name} onChange={(v) => onPatch({ name: v }, "name")} />
        <Text label="Title" value={getLoc(q.title)} onChange={loc(q, "title")} placeholder={q.name} />
        <Area label="Description" value={getLoc(q.description)} onChange={loc(q, "description")} rows={2} />
        {!isStatic && <Check label="Required" checked={!!q.isRequired} onChange={(v) => onPatch({ isRequired: v ? true : undefined })} />}
        <Check label="Visible" checked={q.visible !== false} onChange={(v) => onPatch({ visible: v ? undefined : false })} />
        {!isStatic && <Check label="Read-only" checked={!!q.readOnly} onChange={(v) => onPatch({ readOnly: v ? true : undefined })} />}
      </Section>

      {t === "text" && (
        <Section title="Input">
          <Select
            label="Input type"
            value={q.inputType || "text"}
            options={["text", "number", "email", "tel", "url", "password", "date", "datetime-local", "time", "color"]}
            onChange={(v) => onPatch({ inputType: v === "text" ? undefined : v })}
          />
          <Text label="Placeholder" value={getLoc(q.placeholder)} onChange={loc(q, "placeholder")} />
          {["number", "date", "datetime-local", "time"].includes(q.inputType) && (
            <>
              <Text label="Min" value={q.min} onChange={set("min")} />
              <Text label="Max" value={q.max} onChange={set("max")} />
            </>
          )}
          {(!q.inputType || q.inputType === "text") && (
            <Text label="Max length" type="number" value={q.maxLength} onChange={setNum("maxLength")} />
          )}
        </Section>
      )}

      {t === "comment" && (
        <Section title="Input">
          <Text label="Rows" type="number" value={q.rows} onChange={setNum("rows")} />
          <Text label="Placeholder" value={getLoc(q.placeholder)} onChange={loc(q, "placeholder")} />
          <Text label="Max length" type="number" value={q.maxLength} onChange={setNum("maxLength")} />
        </Section>
      )}

      {hasChoices && (
        <Section title="Choices">
          <LinesArea
            key={selKey}
            label="Choices"
            initial={itemsToLines(q.choices)}
            onLines={(text) => onPatch({ choices: linesToItems(text, q.choices) }, "choices")}
            hint="One per line. Use value|text to show different text."
          />
          <Select
            label="Order"
            value={q.choicesOrder || "none"}
            options={["none", "asc", "desc", "random"]}
            onChange={(v) => onPatch({ choicesOrder: v === "none" ? undefined : v })}
          />
          {t !== "ranking" && (
            <>
              <Check label='Add "Other" item' checked={!!q.showOtherItem} onChange={(v) => onPatch({ showOtherItem: v ? true : undefined })} />
              <Check label='Add "None" item' checked={!!q.showNoneItem} onChange={(v) => onPatch({ showNoneItem: v ? true : undefined })} />
            </>
          )}
          {t === "checkbox" && (
            <Check label='Add "Select All" item' checked={!!q.showSelectAllItem} onChange={(v) => onPatch({ showSelectAllItem: v ? true : undefined })} />
          )}
          {(t === "radiogroup" || t === "checkbox") && (
            <Text label="Columns" type="number" value={q.colCount} onChange={setNum("colCount")} />
          )}
        </Section>
      )}

      {t === "imagepicker" && (
        <Section title="Images">
          <LinesArea
            key={selKey}
            label="Images"
            initial={imagesToLines(q.choices)}
            onLines={(text) => onPatch({ choices: linesToImages(text, q.choices) }, "choices")}
            hint="One per line: value|image URL|label (label optional)."
          />
          <Check label="Allow multiple selection" checked={!!q.multiSelect} onChange={(v) => onPatch({ multiSelect: v ? true : undefined })} />
          <Check label="Show labels" checked={q.showLabel !== false} onChange={(v) => onPatch({ showLabel: v ? undefined : false })} />
          <Select
            label="Image fit"
            value={q.imageFit || "contain"}
            options={["contain", "cover", "fill", "none"]}
            onChange={(v) => onPatch({ imageFit: v })}
          />
          <Text label="Image height" type="number" value={q.imageHeight} onChange={setNum("imageHeight")} />
          <Text label="Image width" type="number" value={q.imageWidth} onChange={setNum("imageWidth")} />
        </Section>
      )}

      {t === "boolean" && (
        <Section title="Labels">
          <Text label="Label for Yes" value={getLoc(q.labelTrue)} onChange={loc(q, "labelTrue")} />
          <Text label="Label for No" value={getLoc(q.labelFalse)} onChange={loc(q, "labelFalse")} />
        </Section>
      )}

      {t === "rating" && (
        <Section title="Rating">
          <Select
            label="Rating type"
            value={q.rateType || "labels"}
            options={["labels", "stars", "smileys"]}
            onChange={(v) => onPatch({ rateType: v === "labels" ? undefined : v })}
          />
          <Text label="Rate count" type="number" value={q.rateCount} onChange={setNum("rateCount")} />
          <Text label="Rate max" type="number" value={q.rateMax} onChange={setNum("rateMax")} />
          <Text label="Min label" value={getLoc(q.minRateDescription)} onChange={loc(q, "minRateDescription")} />
          <Text label="Max label" value={getLoc(q.maxRateDescription)} onChange={loc(q, "maxRateDescription")} />
        </Section>
      )}

      {t === "matrix" && (
        <Section title="Matrix">
          <LinesArea
            key={`${selKey}-rows`}
            label="Rows"
            initial={itemsToLines(q.rows)}
            onLines={(text) => onPatch({ rows: linesToItems(text, q.rows) }, "rows")}
          />
          <LinesArea
            key={`${selKey}-cols`}
            label="Columns"
            initial={itemsToLines(q.columns)}
            onLines={(text) => onPatch({ columns: linesToItems(text, q.columns) }, "columns")}
          />
          <Check label="All rows required" checked={!!q.isAllRowRequired} onChange={(v) => onPatch({ isAllRowRequired: v ? true : undefined })} />
        </Section>
      )}

      {t === "multipletext" && (
        <Section title="Items">
          <LinesArea
            key={selKey}
            label="Text boxes"
            initial={itemsToLines(q.items, "name")}
            onLines={(text) => onPatch({ items: linesToNamedItems(text) }, "items")}
            hint="One per line. Use name|title to set a title."
          />
          <Text label="Columns" type="number" value={q.colCount} onChange={setNum("colCount")} />
        </Section>
      )}

      {t === "signaturepad" && (
        <Section title="Signature">
          <Text label="Width (px)" type="number" value={q.signatureWidth} onChange={setNum("signatureWidth")} />
          <Text label="Height (px)" type="number" value={q.signatureHeight} onChange={setNum("signatureHeight")} />
          <Field label="Pen color">
            <input
              type="color"
              value={q.penColor || "#000000"}
              onChange={(e) => onPatch({ penColor: e.target.value }, "penColor")}
              className="h-8 w-16 p-0 border border-gray-300 rounded"
            />
          </Field>
          <Field label="Background color">
            <input
              type="color"
              value={q.backgroundColor || "#ffffff"}
              onChange={(e) => onPatch({ backgroundColor: e.target.value }, "backgroundColor")}
              className="h-8 w-16 p-0 border border-gray-300 rounded"
            />
          </Field>
          <Check label="Show clear button" checked={q.allowClear !== false} onChange={(v) => onPatch({ allowClear: v ? undefined : false })} />
          <Select
            label="Data format"
            value={q.dataFormat || "png"}
            options={["png", "jpeg", "svg"]}
            onChange={(v) => onPatch({ dataFormat: v === "png" ? undefined : v })}
          />
        </Section>
      )}

      {t === "file" && (
        <Section title="File">
          <Check label="Allow multiple files" checked={!!q.allowMultiple} onChange={(v) => onPatch({ allowMultiple: v ? true : undefined })} />
          <Text label="Max size (bytes)" type="number" value={q.maxSize} onChange={setNum("maxSize")} />
        </Section>
      )}

      {t === "html" && (
        <Section title="Content">
          <Area label="HTML" value={q.html} onChange={set("html")} rows={6} mono />
        </Section>
      )}

      {t === "image" && (
        <Section title="Image">
          <ImageField label="Image" value={q.imageLink} onChange={(v) => onPatch({ imageLink: v || undefined })} />
          <Select
            label="Image fit"
            value={q.imageFit || "contain"}
            options={["contain", "cover", "fill", "none"]}
            onChange={(v) => onPatch({ imageFit: v })}
          />
          <Text label="Width (px)" type="number" value={q.imageWidth} onChange={setNum("imageWidth")} />
          <Text label="Height (px)" type="number" value={q.imageHeight} onChange={setNum("imageHeight")} />
          <Text label="Alt text" value={q.altText} onChange={set("altText")} />
        </Section>
      )}

      {t === "panel" && (
        <Section title="Panel">
          <Select
            label="Initial state"
            value={q.state || "default"}
            options={["default", "collapsed", "expanded"]}
            onChange={(v) => onPatch({ state: v === "default" ? undefined : v })}
          />
          <Text label="Inner indent" type="number" value={q.innerIndent} onChange={setNum("innerIndent")} />
        </Section>
      )}

      {t === "paneldynamic" && (
        <Section title="Dynamic panel">
          <Text label="Initial panel count" type="number" value={q.panelCount} onChange={setNum("panelCount")} />
          <Text label="Min panels" type="number" value={q.minPanelCount} onChange={setNum("minPanelCount")} />
          <Text label="Max panels" type="number" value={q.maxPanelCount} onChange={setNum("maxPanelCount")} />
          <Text label="Panel title template" value={getLoc(q.templateTitle)} onChange={loc(q, "templateTitle")} placeholder="Item {panelIndex}" />
          <Text label="Add button text" value={getLoc(q.panelAddText)} onChange={loc(q, "panelAddText")} />
          <Text label="Remove button text" value={getLoc(q.panelRemoveText)} onChange={loc(q, "panelRemoveText")} />
          <Select
            label="Render mode"
            value={q.renderMode || "list"}
            options={["list", "progressTop", "progressBottom", "tab"]}
            onChange={(v) => onPatch({ renderMode: v === "list" ? undefined : v })}
          />
          <Check label="Confirm before delete" checked={!!q.confirmDelete} onChange={(v) => onPatch({ confirmDelete: v ? true : undefined })} />
        </Section>
      )}

      <Section title="Appearance">
        <AppearanceEditor raw={q.appearance} onChange={(v) => onPatch({ appearance: v }, "appearance")} />
      </Section>

      <Section title="Conditions">
        <Area label="Visible if" value={q.visibleIf} onChange={set("visibleIf")} rows={2} mono placeholder="{question1} = 'Item 1'" />
        {!isStatic && (
          <>
            <Area label="Enable if" value={q.enableIf} onChange={set("enableIf")} rows={2} mono />
            <Area label="Required if" value={q.requiredIf} onChange={set("requiredIf")} rows={2} mono />
          </>
        )}
      </Section>

      {!isStatic && (
        <Section title="Validation">
          <Text label="Required error message" value={getLoc(q.requiredErrorText)} onChange={loc(q, "requiredErrorText")} />
          <ValidatorsEditor q={q} onPatch={onPatch} />
        </Section>
      )}
    </div>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{subtitle}</div>
      <div className="text-base font-semibold text-gray-900 truncate">{title}</div>
    </div>
  );
}
