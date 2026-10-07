"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { clone, collectLocRefs, LOCALES } from "./model";

const ACCENT = "#19b394";

function localeName(code: string): string {
  return LOCALES.find((l) => l.code === code)?.name || code;
}

export default function TranslationTab({
  json,
  locales,
  setLocales,
  onChange,
}: {
  json: any;
  locales: string[];
  setLocales: (l: string[]) => void;
  onChange: (next: any) => void;
}) {
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState("");
  const refs = collectLocRefs(json);
  const shown = refs
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !filter || r.label.toLowerCase().includes(filter.toLowerCase()) || r.getDefault().toLowerCase().includes(filter.toLowerCase()));

  const edit = (idx: number, locale: string, text: string) => {
    const next = clone(json);
    collectLocRefs(next)[idx].set(locale, text);
    onChange(next);
  };

  const removeLocale = (code: string) => {
    if (!confirm(`Remove all ${localeName(code)} translations?`)) return;
    const next = clone(json);
    collectLocRefs(next).forEach((r) => {
      if (r.get(code)) r.set(code, "");
    });
    setLocales(locales.filter((l) => l !== code));
    onChange(next);
  };

  const available = LOCALES.filter((l) => !locales.includes(l.code));

  return (
    <div className="flex-1 overflow-y-auto bg-[#f3f3f3] p-6">
      <div className="max-w-6xl mx-auto bg-white rounded shadow p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Translations</h3>
        <p className="text-sm text-gray-500 mb-4">
          Add languages and translate every title, description and choice. Respondents see a language selector on the
          published form when more than one language is present.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          {locales.map((l) => (
            <span key={l} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-emerald-50 border border-emerald-200 text-emerald-800">
              {localeName(l)}
              <button onClick={() => removeLocale(l)} className="hover:text-red-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <select value={adding} onChange={(e) => setAdding(e.target.value)} className="px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white">
            <option value="">Add language…</option>
            {available.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          <button
            disabled={!adding}
            onClick={() => {
              setLocales([...locales, adding]);
              setAdding("");
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-white rounded disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter strings…"
            className="ml-auto px-2.5 py-1.5 border border-gray-300 rounded text-sm w-56"
          />
        </div>

        {locales.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Add a language to start translating.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400 border-b">
                  <th className="py-2 pr-3 w-52">String</th>
                  <th className="py-2 pr-3 min-w-[200px]">Default</th>
                  {locales.map((l) => (
                    <th key={l} className="py-2 pr-3 min-w-[200px]">{localeName(l)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(({ r, i }) => (
                  <tr key={i} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3 text-xs text-gray-500">{r.label}</td>
                    <td className="py-2 pr-3 text-gray-800 whitespace-pre-wrap">{r.getDefault()}</td>
                    {locales.map((l) => (
                      <td key={l} className="py-1.5 pr-3">
                        <input
                          value={r.get(l)}
                          onChange={(e) => edit(i, l, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#19b394]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
