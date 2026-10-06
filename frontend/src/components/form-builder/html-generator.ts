export interface FormFieldDef {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  required: boolean;
  hidden: boolean;
  defaultValue: string;
  options: string[];
  labelColor?: string;
  fieldBgColor?: string;
  fieldBorderColor?: string;
  width?: "full" | "half" | "third";
}

export interface FormDef {
  title: string;
  description: string;
  fields: FormFieldDef[];
  backgroundColor?: string;
  backgroundImage?: string;
  headerColor?: string;
  headerBgColor?: string;
  formBgColor?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "field";
}

function label(f: FormFieldDef): string {
  const color = f.labelColor || "#374151";
  const req = f.required ? '<span style="color:#ef4444;margin-left:2px;">*</span>' : "";
  return `<label style="display:block;font-size:14px;font-weight:500;color:${color};margin-bottom:6px;">${esc(f.title)}${req}</label>`;
}

function subtitle(f: FormFieldDef): string {
  if (!f.subtitle) return "";
  return `<p style="font-size:12px;color:#94a3b8;margin:0 0 6px;">${esc(f.subtitle)}</p>`;
}

function inputStyle(f: FormFieldDef): string {
  const bg = f.fieldBgColor || "#ffffff";
  const border = f.fieldBorderColor || "#d1d5db";
  return `width:100%;padding:10px 12px;border:1px solid ${border};border-radius:6px;font-size:14px;outline:none;font-family:inherit;background:${bg};`;
}

function widthPercent(w?: string): string {
  if (w === "half") return "48%";
  if (w === "third") return "31.33%";
  return "100%";
}

function fieldWrap(f: FormFieldDef, inner: string): string {
  const w = widthPercent(f.width);
  const display = f.width && f.width !== "full" ? "display:inline-block;vertical-align:top;" : "";
  const mr = f.width && f.width !== "full" ? "margin-right:2%;" : "";
  return `<div style="${display}width:${w};${mr}margin-bottom:20px;">${inner}</div>`;
}

function renderField(f: FormFieldDef): string {
  if (f.hidden) return "";
  const name = slug(f.title);
  const iStyle = inputStyle(f);

  switch (f.type) {
    case "heading":
      return fieldWrap(f, `<div style="margin:8px 0 0;"><h2 style="font-size:18px;font-weight:600;color:${f.labelColor || "#1e293b"};margin:0;">${esc(f.title)}</h2>${f.subtitle ? `<p style="font-size:13px;color:#64748b;margin:4px 0 0;">${esc(f.subtitle)}</p>` : ""}</div>`);

    case "divider":
      return `<hr style="border:none;border-top:1px solid ${f.fieldBorderColor || "#e2e8f0"};margin:20px 0;">`;

    case "text":
    case "email":
    case "phone":
    case "number":
    case "date": {
      const t = f.type === "phone" ? "tel" : f.type;
      const dv = f.defaultValue ? ` value="${esc(f.defaultValue)}"` : "";
      return fieldWrap(f, `${label(f)}${subtitle(f)}<input type="${t}" name="${name}"${dv} style="${iStyle}">`);
    }

    case "multiline":
      return fieldWrap(f, `${label(f)}${subtitle(f)}<textarea name="${name}" rows="4" style="${iStyle}resize:vertical;">${esc(f.defaultValue)}</textarea>`);

    case "dropdown":
      return fieldWrap(f, `${label(f)}${subtitle(f)}<select name="${name}" style="${iStyle}"><option value="">Select...</option>${f.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>`);

    case "checkbox":
      return fieldWrap(f, `${label(f)}${subtitle(f)}${f.options.map((o) => `<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:14px;color:#4b5563;cursor:pointer;"><input type="checkbox" name="${name}" value="${esc(o)}" style="width:16px;height:16px;"> ${esc(o)}</label>`).join("")}`);

    case "radio":
      return fieldWrap(f, `${label(f)}${subtitle(f)}${f.options.map((o) => `<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:14px;color:#4b5563;cursor:pointer;"><input type="radio" name="${name}" value="${esc(o)}" style="width:16px;height:16px;"> ${esc(o)}</label>`).join("")}`);

    case "file":
      return fieldWrap(f, `${label(f)}${subtitle(f)}<input type="file" name="${name}" style="width:100%;padding:8px;border:1px solid ${f.fieldBorderColor || "#d1d5db"};border-radius:6px;font-size:14px;background:${f.fieldBgColor || "#ffffff"};">`);

    default:
      return "";
  }
}

export function generateFormHTML(form: FormDef): { html: string; css: string } {
  const pageBg = form.backgroundColor || "#f8fafc";
  const bgImage = form.backgroundImage ? `background-image:url('${form.backgroundImage}');background-size:cover;background-position:center;background-attachment:fixed;` : "";
  const formBg = form.formBgColor || "#ffffff";
  const headerColor = form.headerColor || "#1e293b";

  const css = `* { box-sizing: border-box; } body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; background: ${pageBg}; ${bgImage} min-height: 100vh; }`;

  let html = `<div style="max-width:720px;margin:0 auto;padding:32px 20px;">`;
  html += `<div style="background:${formBg};border-radius:12px;padding:32px;${form.backgroundImage ? "box-shadow:0 4px 24px rgba(0,0,0,0.12);" : ""}">`;

  if (form.headerBgColor) {
    html += `<div style="background:${form.headerBgColor};margin:-32px -32px 24px;padding:28px 32px;border-radius:12px 12px 0 0;">`;
  }
  html += `<h1 style="font-size:24px;font-weight:700;color:${headerColor};margin:0 0 4px;">${esc(form.title)}</h1>`;
  if (form.description) {
    html += `<p style="font-size:14px;color:#64748b;margin:0 0 0;">${esc(form.description)}</p>`;
  }
  if (form.headerBgColor) {
    html += `</div>`;
  } else {
    html += `<div style="margin-bottom:24px;"></div>`;
  }

  for (const field of form.fields) {
    html += renderField(field);
  }

  html += `</div></div>`;
  return { html, css };
}
