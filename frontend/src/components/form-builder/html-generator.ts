export interface FormFieldDef {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  required: boolean;
  hidden: boolean;
  defaultValue: string;
  options: string[];
}

export interface FormDef {
  title: string;
  description: string;
  fields: FormFieldDef[];
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "field";
}

function label(f: FormFieldDef): string {
  const req = f.required ? '<span style="color:#ef4444;margin-left:2px;">*</span>' : "";
  return `<label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">${esc(f.title)}${req}</label>`;
}

function subtitle(f: FormFieldDef): string {
  if (!f.subtitle) return "";
  return `<p style="font-size:12px;color:#94a3b8;margin:0 0 6px;">${esc(f.subtitle)}</p>`;
}

const inputStyle = "width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;outline:none;font-family:inherit;";

function renderField(f: FormFieldDef): string {
  if (f.hidden) return "";
  const name = slug(f.title);

  switch (f.type) {
    case "heading":
      return `<div style="margin:28px 0 12px;"><h2 style="font-size:18px;font-weight:600;color:#1e293b;margin:0;">${esc(f.title)}</h2>${f.subtitle ? `<p style="font-size:13px;color:#64748b;margin:4px 0 0;">${esc(f.subtitle)}</p>` : ""}</div>`;

    case "divider":
      return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">`;

    case "text":
    case "email":
    case "phone":
    case "number":
    case "date": {
      const t = f.type === "phone" ? "tel" : f.type;
      const dv = f.defaultValue ? ` value="${esc(f.defaultValue)}"` : "";
      return `<div style="margin-bottom:20px;">${label(f)}${subtitle(f)}<input type="${t}" name="${name}"${dv} style="${inputStyle}"></div>`;
    }

    case "multiline":
      return `<div style="margin-bottom:20px;">${label(f)}${subtitle(f)}<textarea name="${name}" rows="4" style="${inputStyle}resize:vertical;">${esc(f.defaultValue)}</textarea></div>`;

    case "dropdown":
      return `<div style="margin-bottom:20px;">${label(f)}${subtitle(f)}<select name="${name}" style="${inputStyle}background:white;"><option value="">Select...</option>${f.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select></div>`;

    case "checkbox":
      return `<div style="margin-bottom:20px;">${label(f)}${subtitle(f)}${f.options.map((o) => `<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:14px;color:#4b5563;cursor:pointer;"><input type="checkbox" name="${name}" value="${esc(o)}" style="width:16px;height:16px;"> ${esc(o)}</label>`).join("")}</div>`;

    case "radio":
      return `<div style="margin-bottom:20px;">${label(f)}${subtitle(f)}${f.options.map((o) => `<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:14px;color:#4b5563;cursor:pointer;"><input type="radio" name="${name}" value="${esc(o)}" style="width:16px;height:16px;"> ${esc(o)}</label>`).join("")}</div>`;

    case "file":
      return `<div style="margin-bottom:20px;">${label(f)}${subtitle(f)}<input type="file" name="${name}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;"></div>`;

    default:
      return "";
  }
}

export function generateFormHTML(form: FormDef): { html: string; css: string } {
  const css = `* { box-sizing: border-box; } body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; background: #f8fafc; }`;

  let html = `<div style="max-width:720px;margin:0 auto;padding:32px 20px;">`;
  html += `<h1 style="font-size:24px;font-weight:700;color:#1e293b;margin:0 0 4px;">${esc(form.title)}</h1>`;
  if (form.description) {
    html += `<p style="font-size:14px;color:#64748b;margin:0 0 24px;">${esc(form.description)}</p>`;
  } else {
    html += `<div style="margin-bottom:24px;"></div>`;
  }

  for (const field of form.fields) {
    html += renderField(field);
  }

  html += `</div>`;
  return { html, css };
}
