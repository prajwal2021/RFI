export const QUESTION_TYPES: { type: string; label: string }[] = [
  { type: "text", label: "Single-Line Input" },
  { type: "comment", label: "Long Text" },
  { type: "radiogroup", label: "Radio Button Group" },
  { type: "checkbox", label: "Checkboxes" },
  { type: "dropdown", label: "Dropdown" },
  { type: "boolean", label: "Yes / No" },
  { type: "rating", label: "Rating Scale" },
  { type: "ranking", label: "Ranking" },
  { type: "matrix", label: "Single-Select Matrix" },
  { type: "multipletext", label: "Multiple Textboxes" },
  { type: "file", label: "File Upload" },
  { type: "html", label: "HTML" },
];

export function typeLabel(type: string): string {
  return QUESTION_TYPES.find((t) => t.type === type)?.label || type;
}

export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

export function emptySurvey(title = "Untitled Survey") {
  return { title, pages: [{ name: "page1", elements: [] as any[] }] };
}

export function normalizeSurvey(json: any) {
  const s = clone(json || emptySurvey());
  if (!Array.isArray(s.pages)) {
    const elements = Array.isArray(s.elements) ? s.elements : [];
    delete s.elements;
    s.pages = [{ name: "page1", elements }];
  }
  if (s.pages.length === 0) s.pages.push({ name: "page1", elements: [] });
  for (const p of s.pages) if (!Array.isArray(p.elements)) p.elements = [];
  return s;
}

export function allQuestionNames(json: any): Set<string> {
  const names = new Set<string>();
  for (const p of json.pages) for (const q of p.elements) if (q.name) names.add(q.name);
  return names;
}

export function allQuestions(json: any): { q: any; p: number; e: number }[] {
  const out: { q: any; p: number; e: number }[] = [];
  json.pages.forEach((p: any, pi: number) =>
    p.elements.forEach((q: any, ei: number) => out.push({ q, p: pi, e: ei }))
  );
  return out;
}

export function uniqueName(existing: Set<string>, base: string): string {
  let n = 1;
  while (existing.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

export function uniquePageName(json: any): string {
  const names = new Set<string>(json.pages.map((p: any) => p.name));
  return uniqueName(names, "page");
}

export function createQuestion(json: any, type: string): any {
  const name = uniqueName(allQuestionNames(json), "question");
  const choices = () => ["Item 1", "Item 2", "Item 3"];
  switch (type) {
    case "comment":
      return { type, name, rows: 4 };
    case "radiogroup":
    case "checkbox":
    case "dropdown":
    case "ranking":
      return { type, name, choices: choices() };
    case "boolean":
      return { type, name, labelTrue: "Yes", labelFalse: "No" };
    case "rating":
      return { type, name, rateCount: 5, rateMax: 5 };
    case "matrix":
      return {
        type,
        name,
        columns: ["Column 1", "Column 2", "Column 3"],
        rows: ["Row 1", "Row 2"],
      };
    case "multipletext":
      return { type, name, items: [{ name: "text1" }, { name: "text2" }] };
    case "file":
      return { type, name, maxSize: 1048576 };
    case "html":
      return { type, name, html: "<p>Enter your HTML here</p>" };
    default:
      return { type: "text", name };
  }
}

export function itemsToLines(items: any[] | undefined, key = "value"): string {
  return (items || [])
    .map((i) => {
      if (i && typeof i === "object") {
        const k = i[key] ?? i.value ?? i.name ?? "";
        const t = i.text ?? i.title;
        return t && t !== k ? `${k}|${t}` : String(k);
      }
      return String(i);
    })
    .join("\n");
}

export function linesToItems(text: string): any[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [v, ...rest] = l.split("|");
      const t = rest.join("|").trim();
      return t ? { value: v.trim(), text: t } : v.trim();
    });
}

export function linesToNamedItems(text: string): any[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [n, ...rest] = l.split("|");
      const t = rest.join("|").trim();
      return t ? { name: n.trim(), title: t } : { name: n.trim() };
    });
}

export function selectionValid(json: any, sel: Selection): boolean {
  if (sel.kind === "survey") return true;
  if (sel.kind === "page") return !!json.pages[sel.p];
  return !!json.pages[sel.p]?.elements[sel.e];
}

export type Selection =
  | { kind: "survey" }
  | { kind: "page"; p: number }
  | { kind: "question"; p: number; e: number };
