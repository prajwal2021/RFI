import { Serializer, Model } from "survey-core";

export interface Appearance {
  titleColor?: string;
  titleSize?: number;
  titleBold?: boolean;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  fontFamily?: string;
  backgroundImage?: string;
}

let registered = false;

/** Adds a string property `appearance` (JSON) to questions, panels and pages so it survives load/serialize. */
export function registerAppearance() {
  if (registered) return;
  registered = true;
  for (const cls of ["question", "panel", "page"]) {
    if (!Serializer.findProperty(cls, "appearance")) {
      Serializer.addProperty(cls, { name: "appearance", type: "text", visible: false });
    }
  }
}

registerAppearance();

export function parseAppearance(raw: any): Appearance | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function stringifyAppearance(a: Appearance): string | undefined {
  const clean: any = {};
  for (const [k, v] of Object.entries(a)) {
    if (v !== undefined && v !== "" && v !== false && !(typeof v === "number" && isNaN(v))) clean[k] = v;
  }
  return Object.keys(clean).length ? JSON.stringify(clean) : undefined;
}

function apply(el: HTMLElement | undefined | null, raw: any) {
  const a = parseAppearance(raw);
  if (!el || !a) return;
  const s = el.style;
  if (a.backgroundColor) s.setProperty("background-color", a.backgroundColor, "important");
  if (a.borderColor) {
    s.setProperty("border", `1px solid ${a.borderColor}`, "important");
  }
  if (typeof a.borderRadius === "number") s.setProperty("border-radius", `${a.borderRadius}px`, "important");
  if (a.textColor) s.setProperty("color", a.textColor, "important");
  if (a.fontFamily) s.setProperty("font-family", a.fontFamily, "important");
  if (a.backgroundImage) {
    s.setProperty("background-image", `url("${a.backgroundImage.replace(/"/g, "%22")}")`, "important");
    s.setProperty("background-size", "cover", "important");
    s.setProperty("background-position", "center", "important");
  }
  if (a.titleColor || a.titleSize || a.titleBold) {
    const titles = el.querySelectorAll<HTMLElement>(
      '[class*="sd-element__title"], [class*="sd-question__title"], .sd-page__title'
    );
    titles.forEach((t) => {
      if (a.titleColor) t.style.setProperty("color", a.titleColor, "important");
      if (a.titleSize) t.style.setProperty("font-size", `${a.titleSize}px`, "important");
      if (a.titleBold) t.style.setProperty("font-weight", "700", "important");
      t.querySelectorAll<HTMLElement>("span, h5, h4, h3").forEach((c) => {
        if (a.titleColor) c.style.setProperty("color", a.titleColor, "important");
        if (a.titleSize) c.style.setProperty("font-size", `${a.titleSize}px`, "important");
        if (a.titleBold) c.style.setProperty("font-weight", "700", "important");
      });
    });
  }
}

export function attachAppearance(model: Model) {
  model.onAfterRenderQuestion.add((_s, opt: any) => apply(opt.htmlElement, opt.question?.appearance));
  model.onAfterRenderPanel.add((_s, opt: any) => apply(opt.htmlElement, opt.panel?.appearance));
  model.onAfterRenderPage.add((_s, opt: any) => apply(opt.htmlElement, opt.page?.appearance));
}
