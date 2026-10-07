import { format } from "date-fns";
import { buildRows, FieldInfo } from "@/lib/submission-fields";

export interface ExportSubmission {
  rfi_id: string;
  rfi_subject?: string;
  data: Record<string, any>;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  created_at: string;
}

// ── Table building ──

function cleanCell(value: string): string {
  if (value === "—") return "";
  if (value.startsWith("data:image")) return "[image]";
  return value;
}

export function buildExportTable(
  subs: ExportSubmission[],
  fieldsFor: (rfiId: string) => FieldInfo[],
  fallbackSubject = ""
): string[][] {
  const fixed = ["Form", "Submitted at", "Name", "Email"];
  const labelIndex = new Map<string, number>();
  const records: { fixed: string[]; values: Map<number, string> }[] = [];

  for (const s of subs) {
    const values = new Map<number, string>();
    for (const row of buildRows(fieldsFor(s.rfi_id), s.data)) {
      let idx = labelIndex.get(row.label);
      if (idx === undefined) {
        idx = labelIndex.size;
        labelIndex.set(row.label, idx);
      }
      values.set(idx, cleanCell(row.value));
    }
    records.push({
      fixed: [
        s.rfi_subject || fallbackSubject,
        format(new Date(s.created_at), "yyyy-MM-dd HH:mm:ss"),
        s.submitted_by_name || "",
        s.submitted_by_email || "",
      ],
      values,
    });
  }

  const labels = Array.from(labelIndex.keys());
  const header = [...fixed, ...labels];
  const body = records.map((r) => [...r.fixed, ...labels.map((_, i) => r.values.get(i) ?? "")]);
  return [header, ...body];
}

// ── CSV ──

function csvCell(v: string): string {
  // Neutralise spreadsheet formula injection from respondent-supplied text.
  let s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: string[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

// ── XLSX (minimal OOXML in an uncompressed zip) ──

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), name, f.data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, dosTime, true);
    cd.setUint16(14, dosDate, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, f.data.length, true);
    cd.setUint32(24, f.data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);

    offset += 30 + name.length + f.data.length;
  }

  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);

  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((a, c) => a + c.length, 0));
  let p = 0;
  for (const c of all) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

function xmlEscape(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function colName(i: number): string {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function toXlsx(rows: string[][], sheetName = "Responses"): Uint8Array {
  const enc = new TextEncoder();
  const sheetRows = rows
    .map((r, ri) => {
      const cells = r
        .map((v, ci) => {
          const text = xmlEscape(v.length > 32767 ? v.slice(0, 32767) : v);
          const style = ri === 0 ? ' s="1"' : "";
          return `<c r="${colName(ci)}${ri + 1}" t="inlineStr"${style}><is><t xml:space="preserve">${text}</t></is></c>`;
        })
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");

  const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const PKG = "http://schemas.openxmlformats.org/package/2006/relationships";
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const safeName = xmlEscape(sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet1");

  const files = [
    {
      name: "[Content_Types].xml",
      text: `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      text: `${head}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      text: `${head}<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      text: `${head}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: "xl/styles.xml",
      text: `${head}<styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      text: `${head}<worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${sheetRows}</sheetData></worksheet>`,
    },
  ];

  return zipStore(files.map((f) => ({ name: f.name, data: enc.encode(f.text) })));
}

// ── Download ──

export function download(filename: string, content: string | Uint8Array, type: string) {
  const url = URL.createObjectURL(new Blob([content as BlobPart], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFileName(s: string): string {
  return (s || "responses").replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "responses";
}

export function exportTable(rows: string[][], base: string, fmt: "csv" | "xlsx") {
  const stamp = format(new Date(), "yyyy-MM-dd");
  const name = `${safeFileName(base)}_${stamp}`;
  if (fmt === "csv") {
    download(`${name}.csv`, toCsv(rows), "text/csv;charset=utf-8");
  } else {
    download(`${name}.xlsx`, toXlsx(rows), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }
}
