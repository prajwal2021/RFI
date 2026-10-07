export const QUESTION_TYPES: { type: string; label: string; group: "Questions" | "Containers" }[] = [
  { type: "text", label: "Single-Line Input", group: "Questions" },
  { type: "comment", label: "Long Text", group: "Questions" },
  { type: "radiogroup", label: "Radio Button Group", group: "Questions" },
  { type: "checkbox", label: "Checkboxes", group: "Questions" },
  { type: "dropdown", label: "Dropdown", group: "Questions" },
  { type: "boolean", label: "Yes / No", group: "Questions" },
  { type: "rating", label: "Rating Scale", group: "Questions" },
  { type: "ranking", label: "Ranking", group: "Questions" },
  { type: "imagepicker", label: "Image Picker", group: "Questions" },
  { type: "matrix", label: "Single-Select Matrix", group: "Questions" },
  { type: "multipletext", label: "Multiple Textboxes", group: "Questions" },
  { type: "signaturepad", label: "Signature Pad", group: "Questions" },
  { type: "file", label: "File Upload", group: "Questions" },
  { type: "html", label: "HTML", group: "Questions" },
  { type: "image", label: "Image", group: "Questions" },
  { type: "panel", label: "Panel", group: "Containers" },
  { type: "paneldynamic", label: "Dynamic Panel", group: "Containers" },
];

export const LOCALES: { code: string; name: string }[] = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "ru", name: "Russian" },
  { code: "zh-cn", name: "Chinese (Simplified)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "tr", name: "Turkish" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
  { code: "en", name: "English" },
];

export function typeLabel(type: string): string {
  return QUESTION_TYPES.find((t) => t.type === type)?.label || type;
}

export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

// ── Paths: [pageIndex, childIndex, childIndex, ...] ──

export type Path = number[];
export type Selection =
  | { kind: "survey" }
  | { kind: "page"; p: number }
  | { kind: "question"; path: Path };

export function isContainer(type: string): boolean {
  return type === "panel" || type === "paneldynamic";
}

export function childKey(node: any): "elements" | "templateElements" {
  return node?.type === "paneldynamic" ? "templateElements" : "elements";
}

export function childrenOf(node: any): any[] {
  const k = childKey(node);
  if (!Array.isArray(node[k])) node[k] = [];
  return node[k];
}

export function getNode(json: any, path: Path): any {
  let node = json.pages[path[0]];
  for (let i = 1; i < path.length && node; i++) node = childrenOf(node)[path[i]];
  return node;
}

export function pathEq(a: Path | undefined, b: Path | undefined): boolean {
  return !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);
}

export function pathStartsWith(path: Path, prefix: Path): boolean {
  return path.length >= prefix.length && prefix.every((v, i) => v === path[i]);
}

export function walkElements(json: any, cb: (node: any, path: Path) => void) {
  const rec = (nodes: any[], base: Path) => {
    nodes.forEach((n, i) => {
      const path = [...base, i];
      cb(n, path);
      if (isContainer(n.type)) rec(childrenOf(n), path);
    });
  };
  json.pages.forEach((p: any, pi: number) => rec(childrenOf(p), [pi]));
}

export function findPath(json: any, target: any): Path | null {
  let found: Path | null = null;
  walkElements(json, (n, path) => {
    if (n === target) found = path;
  });
  return found;
}

export function allQuestionNames(json: any): Set<string> {
  const names = new Set<string>();
  walkElements(json, (n) => n.name && names.add(n.name));
  return names;
}

/** Questions that can be referenced from logic (no containers/static content). */
export function logicQuestions(json: any): { q: any; path: Path }[] {
  const out: { q: any; path: Path }[] = [];
  walkElements(json, (q, path) => {
    if (q.type !== "panel" && q.type !== "html" && q.type !== "image") out.push({ q, path });
  });
  return out;
}

export function uniqueName(existing: Set<string>, base: string): string {
  let n = 1;
  while (existing.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

export function uniquePageName(json: any): string {
  return uniqueName(new Set<string>(json.pages.map((p: any) => p.name)), "page");
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
  const fix = (node: any) => {
    const arr = childrenOf(node);
    for (const c of arr) if (isContainer(c.type)) fix(c);
  };
  for (const p of s.pages) fix(p);
  return s;
}

export function selectionValid(json: any, sel: Selection): boolean {
  if (sel.kind === "survey") return true;
  if (sel.kind === "page") return !!json.pages[sel.p];
  return !!getNode(json, sel.path);
}

// ── Question factory ──

function placeholderImage(n: number): string {
  const colors = ["#19b394", "#3b82f6", "#f59e0b", "#ef4444"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="${colors[(n - 1) % colors.length]}"/><text x="150" y="115" font-size="64" text-anchor="middle" fill="white" font-family="sans-serif">${n}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createQuestion(json: any, type: string): any {
  const names = allQuestionNames(json);
  const name = uniqueName(names, type === "panel" || type === "paneldynamic" ? "panel" : "question");
  const choices = () => ["Item 1", "Item 2", "Item 3"];
  switch (type) {
    case "comment":
      return { type, name, rows: 4 };
    case "radiogroup":
    case "checkbox":
    case "dropdown":
    case "ranking":
      return { type, name, choices: choices() };
    case "imagepicker":
      return {
        type,
        name,
        imageFit: "cover",
        choices: [1, 2, 3].map((n) => ({ value: `image${n}`, imageLink: placeholderImage(n), text: `Image ${n}` })),
      };
    case "boolean":
      return { type, name, labelTrue: "Yes", labelFalse: "No" };
    case "rating":
      return { type, name, rateCount: 5, rateMax: 5 };
    case "matrix":
      return { type, name, columns: ["Column 1", "Column 2", "Column 3"], rows: ["Row 1", "Row 2"] };
    case "multipletext":
      return { type, name, items: [{ name: "text1" }, { name: "text2" }] };
    case "signaturepad":
      return { type, name, signatureWidth: 300, signatureHeight: 200, penColor: "#000000", allowClear: true };
    case "file":
      return { type, name, maxSize: 1048576 };
    case "html":
      return { type, name, html: "<p>Enter your HTML here</p>" };
    case "image":
      return { type, name, imageLink: placeholderImage(1), imageFit: "contain", imageHeight: 200, imageWidth: 300 };
    case "panel":
      return { type, name, title: "Panel", elements: [] };
    case "paneldynamic": {
      names.add(name);
      const childName = uniqueName(names, "question");
      return {
        type,
        name,
        title: "Dynamic Panel",
        templateTitle: "Item {panelIndex}",
        panelCount: 1,
        panelAddText: "Add another",
        templateElements: [{ type: "text", name: childName }],
      };
    }
    default:
      return { type: "text", name };
  }
}

// ── Localized strings ──

export function getLoc(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v.default ?? v.en ?? "";
  return String(v);
}

export function setLocDefault(old: any, text: string): any {
  if (old && typeof old === "object") {
    const n = { ...old };
    if (text) n.default = text;
    else delete n.default;
    return Object.keys(n).length ? n : undefined;
  }
  return text || undefined;
}

// ── Choice-style item <-> text lines ──

export function itemsToLines(items: any[] | undefined, key = "value"): string {
  return (items || [])
    .map((i) => {
      if (i && typeof i === "object") {
        const k = i[key] ?? i.value ?? i.name ?? "";
        const t = getLoc(i.text ?? i.title);
        return t && t !== String(k) ? `${k}|${t}` : String(k);
      }
      return String(i);
    })
    .join("\n");
}

export function linesToItems(text: string, prev?: any[]): any[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [v, ...rest] = l.split("|");
      const value = v.trim();
      const t = rest.join("|").trim();
      const old = (prev || []).find((p) => p && typeof p === "object" && String(p.value) === value);
      if (t) {
        const oldText = old?.text;
        const text2 = oldText && typeof oldText === "object" ? { ...oldText, default: t } : t;
        return { ...(old && typeof old === "object" ? old : {}), value, text: text2 };
      }
      if (old && typeof old === "object" && old.text && typeof old.text === "object") {
        return { ...old, value };
      }
      return old && typeof old === "object" && old.imageLink ? { ...old, value } : value;
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

export function imagesToLines(items: any[] | undefined): string {
  return (items || [])
    .map((i) => {
      if (i && typeof i === "object") return [i.value ?? "", i.imageLink ?? "", getLoc(i.text)].join("|").replace(/\|+$/, "");
      return String(i);
    })
    .join("\n");
}

export function linesToImages(text: string, prev?: any[]): any[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [value, imageLink = "", ...rest] = l.split("|");
      const label = rest.join("|").trim();
      const old = (prev || []).find((p) => p && typeof p === "object" && String(p.value) === value.trim());
      const item: any = { ...(old || {}), value: value.trim(), imageLink: imageLink.trim() };
      if (label) item.text = old?.text && typeof old.text === "object" ? { ...old.text, default: label } : label;
      else delete item.text;
      return item;
    });
}

// ── Translation references ──

export interface LocRef {
  label: string;
  getDefault(): string;
  get(locale: string): string;
  set(locale: string, text: string): void;
}

function propRef(holder: any, key: string, label: string, fallback = ""): LocRef {
  return {
    label,
    getDefault: () => getLoc(holder[key]) || fallback,
    get: (l) => {
      const v = holder[key];
      return v && typeof v === "object" ? v[l] ?? "" : "";
    },
    set: (l, t) => {
      let v = holder[key];
      if (typeof v !== "object" || v === null) v = v ? { default: String(v) } : {};
      if (t) v[l] = t;
      else delete v[l];
      holder[key] = v;
    },
  };
}

function itemRef(arr: any[], i: number, label: string): LocRef {
  return {
    label,
    getDefault: () => {
      const it = arr[i];
      return it && typeof it === "object" ? getLoc(it.text) || String(it.value ?? it.name ?? "") : String(it);
    },
    get: (l) => {
      const it = arr[i];
      return it && typeof it === "object" && it.text && typeof it.text === "object" ? it.text[l] ?? "" : "";
    },
    set: (l, t) => {
      let it = arr[i];
      if (typeof it !== "object" || it === null) it = { value: it };
      let tx = it.text;
      if (typeof tx !== "object" || tx === null) tx = { default: tx ? String(tx) : String(it.value ?? "") };
      if (t) tx[l] = t;
      else delete tx[l];
      it.text = tx;
      arr[i] = it;
    },
  };
}

export function collectLocRefs(json: any): LocRef[] {
  const refs: LocRef[] = [];
  const add = (holder: any, key: string, label: string, always = false, fallback = "") => {
    if (always || holder[key]) refs.push(propRef(holder, key, label, fallback));
  };
  add(json, "title", "Survey title", true);
  add(json, "description", "Survey description");
  add(json, "completedHtml", "Completed page");
  add(json, "completeText", "Complete button");
  add(json, "pageNextText", "Next button");
  add(json, "pagePrevText", "Previous button");

  const items = (arr: any[] | undefined, label: string) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((_, i) => refs.push(itemRef(arr, i, label)));
  };

  const el = (node: any) => {
    const n = node.name;
    add(node, "title", `${n} · title`, true, n);
    add(node, "description", `${n} · description`);
    add(node, "placeholder", `${n} · placeholder`);
    add(node, "labelTrue", `${n} · "Yes" label`);
    add(node, "labelFalse", `${n} · "No" label`);
    add(node, "templateTitle", `${n} · panel title`);
    add(node, "panelAddText", `${n} · add-panel button`);
    items(node.choices, `${n} · choice`);
    items(node.rows, `${n} · row`);
    items(node.columns, `${n} · column`);
    if (Array.isArray(node.items)) {
      node.items.forEach((it: any) => add(it, "title", `${n} · ${it.name}`, true, it.name));
    }
    if (isContainer(node.type)) childrenOf(node).forEach(el);
  };

  json.pages.forEach((p: any) => {
    add(p, "title", `${p.name} · page title`);
    add(p, "description", `${p.name} · page description`);
    childrenOf(p).forEach(el);
  });
  return refs;
}

export function usedLocales(json: any): string[] {
  const set = new Set<string>();
  const scan = (v: any) => {
    if (v && typeof v === "object") {
      if (!Array.isArray(v) && ("default" in v || Object.keys(v).some((k) => LOCALES.some((l) => l.code === k)))) {
        Object.keys(v).forEach((k) => k !== "default" && set.add(k));
      }
      Object.values(v).forEach(scan);
    }
  };
  scan(json);
  return Array.from(set);
}
