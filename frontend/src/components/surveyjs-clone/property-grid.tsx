"use client";

import { useState } from "react";
import { itemsToLines, linesToItems, linesToNamedItems, typeLabel, Selection } from "./model";

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
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
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
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  mono,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
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
  label,
  initial,
  onLines,
  hint,
}: {
  label: string;
  initial: string;
  onLines: (text: string) => void;
  hint?: string;
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

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
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
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: any;
  options: string[];
  onChange: (v: string) => void;
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

  if (sel.kind === "survey") {
    return (
      <div>
        <PanelTitle title="Survey" subtitle="Settings" />
        <Section title="General">
          <Text label="Title" value={json.title} onChange={set("title")} />
          <Area label="Description" value={json.description} onChange={set("description")} rows={2} />
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
          <Text label="Next button text" value={json.pageNextText} onChange={set("pageNextText")} />
          <Text label="Previous button text" value={json.pagePrevText} onChange={set("pagePrevText")} />
          <Text label="Complete button text" value={json.completeText} onChange={set("completeText")} />
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
          <Text label="Title" value={page.title} onChange={set("title")} />
          <Area label="Description" value={page.description} onChange={set("description")} rows={2} />
        </Section>
        <Section title="Logic">
          <Area label="Visible if" value={page.visibleIf} onChange={set("visibleIf")} rows={2} mono placeholder="{question1} = 'Item 1'" />
        </Section>
      </div>
    );
  }

  const q = json.pages[sel.p].elements[sel.e];
  const t: string = q.type;
  const hasChoices = ["radiogroup", "checkbox", "dropdown", "ranking"].includes(t);
  const selKey = `${sel.p}-${sel.e}-${t}`;

  return (
    <div>
      <PanelTitle title={q.name} subtitle={typeLabel(t)} />
      <Section title="General">
        <Text label="Name" value={q.name} onChange={(v) => onPatch({ name: v }, "name")} />
        <Text label="Title" value={q.title} onChange={set("title")} placeholder={q.name} />
        <Area label="Description" value={q.description} onChange={set("description")} rows={2} />
        {t !== "html" && <Check label="Required" checked={!!q.isRequired} onChange={(v) => onPatch({ isRequired: v ? true : undefined })} />}
        <Check label="Visible" checked={q.visible !== false} onChange={(v) => onPatch({ visible: v ? undefined : false })} />
        {t !== "html" && <Check label="Read-only" checked={!!q.readOnly} onChange={(v) => onPatch({ readOnly: v ? true : undefined })} />}
      </Section>

      {t === "text" && (
        <Section title="Input">
          <Select
            label="Input type"
            value={q.inputType || "text"}
            options={["text", "number", "email", "tel", "url", "password", "date", "datetime-local", "time", "color"]}
            onChange={(v) => onPatch({ inputType: v === "text" ? undefined : v })}
          />
          <Text label="Placeholder" value={q.placeholder} onChange={set("placeholder")} />
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
          <Text label="Placeholder" value={q.placeholder} onChange={set("placeholder")} />
          <Text label="Max length" type="number" value={q.maxLength} onChange={setNum("maxLength")} />
        </Section>
      )}

      {hasChoices && (
        <Section title="Choices">
          <LinesArea
            key={selKey}
            label="Choices"
            initial={itemsToLines(q.choices)}
            onLines={(text) => onPatch({ choices: linesToItems(text) }, "choices")}
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

      {t === "boolean" && (
        <Section title="Labels">
          <Text label="Label for Yes" value={q.labelTrue} onChange={set("labelTrue")} />
          <Text label="Label for No" value={q.labelFalse} onChange={set("labelFalse")} />
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
          <Text label="Min label" value={q.minRateDescription} onChange={set("minRateDescription")} />
          <Text label="Max label" value={q.maxRateDescription} onChange={set("maxRateDescription")} />
        </Section>
      )}

      {t === "matrix" && (
        <Section title="Matrix">
          <LinesArea
            key={`${selKey}-rows`}
            label="Rows"
            initial={itemsToLines(q.rows)}
            onLines={(text) => onPatch({ rows: linesToItems(text) }, "rows")}
          />
          <LinesArea
            key={`${selKey}-cols`}
            label="Columns"
            initial={itemsToLines(q.columns)}
            onLines={(text) => onPatch({ columns: linesToItems(text) }, "columns")}
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

      <Section title="Conditions">
        <Area label="Visible if" value={q.visibleIf} onChange={set("visibleIf")} rows={2} mono placeholder="{question1} = 'Item 1'" />
        {t !== "html" && (
          <>
            <Area label="Enable if" value={q.enableIf} onChange={set("enableIf")} rows={2} mono />
            <Area label="Required if" value={q.requiredIf} onChange={set("requiredIf")} rows={2} mono />
          </>
        )}
      </Section>

      {t !== "html" && (
        <Section title="Validation">
          <Text label="Required error message" value={q.requiredErrorText} onChange={set("requiredErrorText")} />
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
