"use client";

import { useMemo } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { Themed, SurveyTheme, THEME_PRESETS, FONTS } from "./theme";
import { attachAppearance } from "./appearance";
import { ColorField, ImageField } from "./property-grid";

const ACCENT = "#19b394";
const inputCls =
  "w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#19b394] bg-white";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{title}</div>
      {children}
    </div>
  );
}

export default function ThemeTab({
  json,
  theme,
  onChange,
}: {
  json: any;
  theme: SurveyTheme;
  onChange: (t: SurveyTheme) => void;
}) {
  const upd = (patch: Partial<SurveyTheme>) => {
    const next: any = { ...theme, ...patch };
    for (const k of Object.keys(next)) if (next[k] === "" || next[k] === undefined) delete next[k];
    onChange(next);
  };

  const model = useMemo(() => {
    const m = new Model(json);
    attachAppearance(m);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(json)]);

  return (
    <div className="flex-1 flex min-h-0">
      <aside className="w-80 shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-5">
        <Group title="Presets">
          <div className="grid grid-cols-2 gap-2">
            {THEME_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => onChange({ ...p.theme, backgroundImage: theme.backgroundImage, fontFamily: theme.fontFamily })}
                className={`flex items-center gap-2 px-2.5 py-2 border rounded text-sm text-left hover:bg-gray-50 ${theme.preset === p.name ? "border-2" : ""}`}
                style={theme.preset === p.name ? { borderColor: ACCENT } : undefined}
              >
                <span className="flex">
                  <span className="h-4 w-4 rounded-l" style={{ background: p.theme.primary }} />
                  <span className="h-4 w-4 rounded-r border" style={{ background: p.theme.pageBg }} />
                </span>
                {p.name}
              </button>
            ))}
          </div>
        </Group>

        <Group title="Colors">
          <ColorField label="Primary (buttons, accents)" value={theme.primary} onChange={(v) => upd({ primary: v, preset: undefined })} />
          <ColorField label="Page background" value={theme.pageBg} onChange={(v) => upd({ pageBg: v, preset: undefined })} />
          <ColorField label="Question / card background" value={theme.cardBg} onChange={(v) => upd({ cardBg: v, preset: undefined })} />
          <ColorField label="Text color" value={theme.text} onChange={(v) => upd({ text: v, preset: undefined })} />
          <ColorField label="Survey / page title color" value={theme.headingColor} onChange={(v) => upd({ headingColor: v })} />
          <ColorField label="Question title color" value={theme.questionTitleColor} onChange={(v) => upd({ questionTitleColor: v })} />
          <ColorField label="Input background" value={theme.inputBg} onChange={(v) => upd({ inputBg: v })} />
          <ColorField label="Border color" value={theme.borderColor} onChange={(v) => upd({ borderColor: v })} />
        </Group>

        <Group title="Typography & shape">
          <label className="block text-xs font-medium text-gray-600 mb-1">Font</label>
          <select value={theme.fontFamily || ""} onChange={(e) => upd({ fontFamily: e.target.value })} className={`${inputCls} mb-3`}>
            {FONTS.map((f) => (
              <option key={f.label} value={f.value}>{f.label}</option>
            ))}
          </select>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Corner radius: {theme.cornerRadius ?? 4}px
          </label>
          <input
            type="range"
            min={0}
            max={24}
            value={theme.cornerRadius ?? 4}
            onChange={(e) => upd({ cornerRadius: Number(e.target.value), preset: undefined })}
            className="w-full accent-[#19b394]"
          />
        </Group>

        <Group title="Background image">
          <ImageField label="Page background image" value={theme.backgroundImage} onChange={(v) => upd({ backgroundImage: v })} />
        </Group>

        <button
          onClick={() => onChange({})}
          className="w-full py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50"
        >
          Reset theme
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#e8e8e8] p-6">
        <div className="max-w-3xl mx-auto rounded overflow-hidden shadow">
          <Themed theme={theme} className="min-h-[500px]">
            <Survey model={model} />
          </Themed>
        </div>
      </main>
    </div>
  );
}
