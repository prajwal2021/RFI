export interface FieldInfo {
  name: string;
  label: string;
}

export interface FieldRow {
  label: string;
  value: string;
}

export function extractFormFields(html: string): FieldInfo[] {
  if (typeof window === "undefined" || !html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const fields: FieldInfo[] = [];
  const seen = new Set<string>();

  doc.querySelectorAll("input, textarea, select").forEach((el) => {
    const input = el as HTMLInputElement;
    const name = input.name || input.id || "";
    if (!name || seen.has(name)) return;
    seen.add(name);

    let label = "";
    const wrapper = el.closest("label");
    if (wrapper) {
      const clone = wrapper.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("input, textarea, select, span").forEach((c) => c.remove());
      label = clone.textContent?.trim() || "";
    }
    if (!label) {
      const parent = el.closest("div, section, fieldset");
      if (parent) {
        const lbl = parent.querySelector("label");
        if (lbl && !lbl.querySelector("input, textarea, select")) {
          label = lbl.textContent?.trim().replace(/\s*\*\s*$/, "") || "";
        }
      }
    }
    if (!label) {
      label = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }

    fields.push({ name, label });
  });

  return fields;
}

export function extractSurveyFields(json: any): FieldInfo[] {
  const out: FieldInfo[] = [];
  const walk = (elements: any[] | undefined) => {
    for (const el of elements || []) {
      if (el.type === "panel") {
        walk(el.elements);
      } else if (el.type !== "html" && el.type !== "image" && el.name) {
        const title = typeof el.title === "string" ? el.title : el.title?.default;
        out.push({ name: el.name, label: title || el.name });
      }
    }
  };
  if (json?.pages) {
    for (const p of json.pages) walk(p.elements);
  }
  walk(json?.elements);
  return out;
}

export function fieldsForContent(content: { html?: string; surveyDefinition?: any } | null | undefined): FieldInfo[] {
  if (!content) return [];
  return content.surveyDefinition
    ? extractSurveyFields(content.surveyDefinition)
    : extractFormFields(content.html || "");
}

export function formatKey(key: string): string {
  if (/[a-z]_[a-z]/.test(key)) {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return key;
}

export function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value) && value.length > 0 && value.every((v) => v && typeof v === "object" && "name" in v && "content" in v)) {
    return value.map((v) => v.name).join(", ");
  }
  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ")
      : "—";
  }
  if (typeof value === "object") return JSON.stringify(value);
  const str = String(value);
  return str.trim() === "" ? "—" : str;
}

/** One row per form field (even if unanswered), followed by any extra submitted keys. */
export function buildRows(fields: FieldInfo[], data: Record<string, any>): FieldRow[] {
  if (fields.length === 0) {
    return Object.entries(data).map(([key, value]) => ({ label: formatKey(key), value: formatValue(value) }));
  }
  const rows: FieldRow[] = [];
  const matched = new Set<string>();
  for (const field of fields) {
    const val = data[field.name] ?? data[field.label] ?? undefined;
    rows.push({ label: field.label, value: formatValue(val) });
    matched.add(field.name);
    matched.add(field.label);
  }
  for (const [key, value] of Object.entries(data)) {
    if (!matched.has(key)) rows.push({ label: formatKey(key), value: formatValue(value) });
  }
  return rows;
}
