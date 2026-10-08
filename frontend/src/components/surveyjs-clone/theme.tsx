"use client";

import React from "react";

export interface SurveyTheme {
  preset?: string;
  primary?: string;
  text?: string;
  pageBg?: string;
  cardBg?: string;
  fontFamily?: string;
  cornerRadius?: number;
  backgroundImage?: string;
  headingColor?: string;
  questionTitleColor?: string;
  inputBg?: string;
  borderColor?: string;
}

export const FONTS: { label: string; value: string }[] = [
  { label: "System default", value: "" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

export const THEME_PRESETS: { name: string; theme: SurveyTheme }[] = [
  { name: "Default", theme: { preset: "Default", primary: "#19b394", text: "#161616", pageBg: "#f3f3f3", cardBg: "#ffffff", cornerRadius: 4 } },
  { name: "Ocean", theme: { preset: "Ocean", primary: "#2563eb", text: "#0f172a", pageBg: "#eff6ff", cardBg: "#ffffff", cornerRadius: 8 } },
  { name: "Sunset", theme: { preset: "Sunset", primary: "#ea580c", text: "#1c1917", pageBg: "#fff7ed", cardBg: "#ffffff", cornerRadius: 12 } },
  { name: "Violet", theme: { preset: "Violet", primary: "#7c3aed", text: "#1e1b4b", pageBg: "#f5f3ff", cardBg: "#ffffff", cornerRadius: 10 } },
  { name: "Dark", theme: { preset: "Dark", primary: "#34d399", text: "#e5e7eb", pageBg: "#111827", cardBg: "#1f2937", cornerRadius: 6 } },
  { name: "High Contrast", theme: { preset: "High Contrast", primary: "#000000", text: "#000000", pageBg: "#ffffff", cardBg: "#ffffff", cornerRadius: 0 } },
];

const HEX = /^#([0-9a-f]{6})$/i;

function rgb(hex: string): [number, number, number] | null {
  const m = HEX.exec(hex || "");
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function shade(hex: string, amt: number): string {
  const c = rgb(hex);
  if (!c) return hex;
  return toHex(c.map((v) => (amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)) as [number, number, number]);
}

function alpha(hex: string, a: number): string {
  const c = rgb(hex);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : hex;
}

function contrast(hex: string): string {
  const c = rgb(hex);
  if (!c) return "#ffffff";
  const lum = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  return lum > 0.6 ? "#000000" : "#ffffff";
}

/** Baseline rules so author-written HTML blocks look right inside SurveyJS (its CSS resets lists and headings). */
const BASE_CSS = `
.sjs-themed .sd-html ul { list-style: disc; padding-left: 1.4em; margin: .5em 0; }
.sjs-themed .sd-html ol { list-style: decimal; padding-left: 1.4em; margin: .5em 0; }
.sjs-themed .sd-html li { margin: .2em 0; }
.sjs-themed .sd-html h1, .sjs-themed .sd-html h2, .sjs-themed .sd-html h3 { font-weight: 600; line-height: 1.25; margin: .3em 0 .4em; }
.sjs-themed .sd-html h1 { font-size: 1.6em; } .sjs-themed .sd-html h2 { font-size: 1.35em; } .sjs-themed .sd-html h3 { font-size: 1.15em; }
.sjs-themed .sd-html a { color: var(--sjs-primary-backcolor, #19b394); text-decoration: underline; }
.sjs-themed .sd-html p { margin: .5em 0; }
`;

export function themeCss(t?: SurveyTheme): string {
  if (!t) return "";
  const v: string[] = [];
  if (t.primary && rgb(t.primary)) {
    v.push(`--sjs-primary-backcolor:${t.primary}`);
    v.push(`--sjs-primary-backcolor-light:${alpha(t.primary, 0.1)}`);
    v.push(`--sjs-primary-backcolor-dark:${shade(t.primary, -0.15)}`);
    v.push(`--sjs-primary-forecolor:${contrast(t.primary)}`);
    v.push(`--sjs-primary-forecolor-light:${alpha(contrast(t.primary), 0.25)}`);
    v.push(`--sjs-secondary-backcolor:${t.primary}`);
  }
  if (t.pageBg && rgb(t.pageBg)) {
    v.push(`--sjs-general-backcolor-dim:${t.pageBg}`);
    v.push(`--sjs-general-backcolor-dim-dark:${shade(t.pageBg, -0.06)}`);
  }
  if (t.cardBg && rgb(t.cardBg)) {
    v.push(`--sjs-general-backcolor:${t.cardBg}`);
    v.push(`--sjs-general-backcolor-dim-light:${t.cardBg}`);
  }
  if (t.text && rgb(t.text)) {
    v.push(`--sjs-general-forecolor:${t.text}`);
    v.push(`--sjs-general-forecolor-light:${alpha(t.text, 0.55)}`);
    v.push(`--sjs-general-dim-forecolor:${t.text}`);
    v.push(`--sjs-general-dim-forecolor-light:${alpha(t.text, 0.55)}`);
  }
  if (t.inputBg && rgb(t.inputBg)) {
    v.push(`--sjs-editor-background:${t.inputBg}`);
    v.push(`--sjs-question-background:${t.inputBg}`);
  }
  if (t.borderColor && rgb(t.borderColor)) {
    v.push(`--sjs-border-default:${t.borderColor}`);
    v.push(`--sjs-border-light:${t.borderColor}`);
  }
  if (typeof t.cornerRadius === "number") v.push(`--sjs-corner-radius:${t.cornerRadius}px`);

  let css = `.sjs-themed, .sjs-themed .sd-root-modern { ${v.join(";")} }`;
  if (t.fontFamily) css += `.sjs-themed, .sjs-themed [class*="sd-"], .sjs-themed .sd-html * { font-family: ${t.fontFamily}; }`;
  if (t.backgroundImage) css += `.sjs-themed .sd-root-modern { background-color: transparent; }`;
  if (t.text && rgb(t.text)) css += `.sjs-themed { color: ${t.text}; }`;
  if (t.headingColor && rgb(t.headingColor)) {
    css += `.sjs-themed .sd-title, .sjs-themed .sd-page__title, .sjs-themed .sd-description { color: ${t.headingColor} !important; }`;
  }
  if (t.questionTitleColor && rgb(t.questionTitleColor)) {
    css += `.sjs-themed .sd-element__title, .sjs-themed .sd-question__title, .sjs-themed .sd-element__title span { color: ${t.questionTitleColor} !important; }`;
  }
  return css;
}

export function Themed({
  theme,
  className = "",
  children,
}: {
  theme?: SurveyTheme;
  className?: string;
  children: React.ReactNode;
}) {
  const style: React.CSSProperties = {};
  if (theme?.pageBg && rgb(theme.pageBg)) style.backgroundColor = theme.pageBg;
  if (theme?.backgroundImage) {
    style.backgroundImage = `url("${theme.backgroundImage.replace(/"/g, "%22")}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  return (
    <div className={`sjs-themed ${className}`} style={style}>
      <style dangerouslySetInnerHTML={{ __html: BASE_CSS + themeCss(theme) }} />
      {children}
    </div>
  );
}
