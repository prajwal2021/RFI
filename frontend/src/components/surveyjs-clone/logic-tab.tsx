"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { clone, getLoc, logicQuestions, walkElements } from "./model";

const ACCENT = "#19b394";
const sel = "px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-[#19b394]";

const OPERATORS: { op: string; label: string; unary?: boolean }[] = [
  { op: "=", label: "equals" },
  { op: "!=", label: "does not equal" },
  { op: ">", label: "greater than" },
  { op: "<", label: "less than" },
  { op: ">=", label: "greater or equal" },
  { op: "<=", label: "less or equal" },
  { op: "contains", label: "contains" },
  { op: "notcontains", label: "does not contain" },
  { op: "anyof", label: "is any of" },
  { op: "allof", label: "contains all of" },
  { op: "empty", label: "is empty", unary: true },
  { op: "notempty", label: "is not empty", unary: true },
];

type Action =
  | "visibleIf" | "enableIf" | "requiredIf" | "pageVisibleIf"
  | "complete" | "skip" | "setvalue" | "copyvalue" | "runexpression";

const ACTIONS: { key: Action; label: string }[] = [
  { key: "visibleIf", label: "Show question / panel" },
  { key: "enableIf", label: "Enable question" },
  { key: "requiredIf", label: "Make question required" },
  { key: "pageVisibleIf", label: "Show page" },
  { key: "complete", label: "Complete the survey" },
  { key: "skip", label: "Skip to question" },
  { key: "setvalue", label: "Set a question's value" },
  { key: "copyvalue", label: "Copy a question's value" },
  { key: "runexpression", label: "Run an expression" },
];

interface Cond {
  source: string;
  op: string;
  value: string;
  connector: "and" | "or";
}

function literal(v: string): string {
  const t = v.trim();
  if (t !== "" && !isNaN(Number(t))) return t;
  if (t === "true" || t === "false") return t;
  return `'${t.replace(/'/g, "\\'")}'`;
}

function condExpr(c: Cond): string {
  const left = `{${c.source}}`;
  const def = OPERATORS.find((o) => o.op === c.op);
  if (def?.unary) return `${left} ${c.op}`;
  if (c.op === "anyof" || c.op === "allof") {
    const list = c.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(literal)
      .join(", ");
    return `${left} ${c.op} [${list}]`;
  }
  return `${left} ${c.op} ${literal(c.value)}`;
}

function buildExpr(conds: Cond[]): string {
  return conds.map((c, i) => (i > 0 ? ` ${c.connector} ` : "") + condExpr(c)).join("");
}

function choiceValues(q: any): string[] {
  if (q?.type === "boolean") return ["true", "false"];
  if (!Array.isArray(q?.choices)) return [];
  return q.choices.map((c: any) => (c && typeof c === "object" ? String(c.value) : String(c)));
}

function RuleExpr({ expr, onSave }: { expr: string; onSave: (e: string) => void }) {
  const [text, setText] = useState(expr);
  const dirty = text !== expr;
  return (
    <div className="flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 px-2 py-1 border border-gray-200 rounded font-mono text-xs focus:outline-none focus:border-[#19b394]"
      />
      {dirty && (
        <button onClick={() => onSave(text)} className="text-xs font-semibold" style={{ color: ACCENT }}>
          Save
        </button>
      )}
    </div>
  );
}

export default function LogicTab({ json, onChange }: { json: any; onChange: (next: any) => void }) {
  const qs = logicQuestions(json);
  const targets: any[] = [];
  walkElements(json, (n) => targets.push(n));
  const label = (q: any) => getLoc(q.title) || q.name;

  const [conds, setConds] = useState<Cond[]>([{ source: "", op: "=", value: "", connector: "and" }]);
  const [action, setAction] = useState<Action>("visibleIf");
  const [target, setTarget] = useState("");
  const [target2, setTarget2] = useState("");
  const [setVal, setSetVal] = useState("");
  const [runExpr, setRunExpr] = useState("");

  const patchCond = (i: number, patch: Partial<Cond>) =>
    setConds(conds.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const needsTarget = ["visibleIf", "enableIf", "requiredIf", "pageVisibleIf", "skip", "setvalue", "copyvalue"].includes(action);
  const needsTarget2 = action === "copyvalue";
  const condsOk = conds.every((c) => c.source && (OPERATORS.find((o) => o.op === c.op)?.unary || c.value.trim() !== ""));
  const canAdd =
    condsOk &&
    (!needsTarget || !!target) &&
    (!needsTarget2 || !!target2) &&
    (action !== "runexpression" || !!runExpr.trim());

  const addRule = () => {
    if (!canAdd) return;
    const next = clone(json);
    const expr = buildExpr(conds);

    if (["visibleIf", "enableIf", "requiredIf"].includes(action)) {
      let hit: any = null;
      walkElements(next, (n) => {
        if (n.name === target) hit = n;
      });
      if (!hit) return;
      hit[action] = hit[action] ? `(${hit[action]}) and (${expr})` : expr;
    } else if (action === "pageVisibleIf") {
      const pg = next.pages.find((p: any) => p.name === target);
      if (!pg) return;
      pg.visibleIf = pg.visibleIf ? `(${pg.visibleIf}) and (${expr})` : expr;
    } else {
      const triggers = Array.isArray(next.triggers) ? next.triggers : [];
      if (action === "complete") triggers.push({ type: "complete", expression: expr });
      if (action === "skip") triggers.push({ type: "skip", expression: expr, gotoName: target });
      if (action === "setvalue") {
        const v = setVal.trim();
        triggers.push({
          type: "setvalue",
          expression: expr,
          setToName: target,
          setValue: v !== "" && !isNaN(Number(v)) ? Number(v) : v === "true" ? true : v === "false" ? false : v,
        });
      }
      if (action === "copyvalue") triggers.push({ type: "copyvalue", expression: expr, setToName: target2, fromName: target });
      if (action === "runexpression") {
        triggers.push({ type: "runexpression", expression: expr, runExpression: runExpr.trim(), ...(target ? { setToName: target } : {}) });
      }
      next.triggers = triggers;
    }
    onChange(next);
    setConds([{ source: "", op: "=", value: "", connector: "and" }]);
    setTarget("");
    setTarget2("");
    setSetVal("");
    setRunExpr("");
  };

  // ── Existing rules ──
  type Row = { key: string; where: string; rule: string; expr: string; save: (e: string) => void; remove: () => void };
  const rows: Row[] = [];
  const mutate = (fn: (j: any) => void) => {
    const next = clone(json);
    fn(next);
    onChange(next);
  };

  json.pages.forEach((p: any, pi: number) => {
    if (p.visibleIf) {
      rows.push({
        key: `page-${pi}`,
        where: p.name,
        rule: "page visible if",
        expr: p.visibleIf,
        save: (e) => mutate((j) => (j.pages[pi].visibleIf = e)),
        remove: () => mutate((j) => delete j.pages[pi].visibleIf),
      });
    }
  });
  walkElements(json, (n, path) => {
    for (const k of ["visibleIf", "enableIf", "requiredIf"] as const) {
      if (n[k]) {
        rows.push({
          key: `${path.join(".")}-${k}`,
          where: n.name,
          rule: k,
          expr: n[k],
          save: (e) => mutate((j) => walkElements(j, (m) => m.name === n.name && (m[k] = e))),
          remove: () => mutate((j) => walkElements(j, (m) => m.name === n.name && delete m[k])),
        });
      }
    }
  });
  (json.triggers || []).forEach((t: any, i: number) => {
    const desc =
      t.type === "complete" ? "complete survey"
      : t.type === "skip" ? `skip to ${t.gotoName}`
      : t.type === "setvalue" ? `set ${t.setToName} = ${JSON.stringify(t.setValue)}`
      : t.type === "copyvalue" ? `copy ${t.fromName} → ${t.setToName}`
      : `run: ${t.runExpression}`;
    rows.push({
      key: `trigger-${i}`,
      where: "survey",
      rule: desc,
      expr: t.expression || "",
      save: (e) => mutate((j) => (j.triggers[i].expression = e)),
      remove: () =>
        mutate((j) => {
          j.triggers.splice(i, 1);
          if (j.triggers.length === 0) delete j.triggers;
        }),
    });
  });

  const questionSelect = (value: string, onChangeV: (v: string) => void, list: any[], placeholder = "select question…") => (
    <select value={value} onChange={(e) => onChangeV(e.target.value)} className={sel}>
      <option value="">{placeholder}</option>
      {list.map((q) => (
        <option key={q.name} value={q.name}>{label(q)}</option>
      ))}
    </select>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#f3f3f3] p-6">
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Survey Logic</h3>
        <p className="text-sm text-gray-500 mb-5">
          Build rules with one or more conditions. <b>AND</b> is evaluated before <b>OR</b>.
        </p>

        <div className="mb-6 p-4 border rounded bg-gray-50 space-y-3">
          {conds.map((c, i) => {
            const srcQ = qs.find((x) => x.q.name === c.source)?.q;
            const def = OPERATORS.find((o) => o.op === c.op);
            const options = choiceValues(srcQ);
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                {i === 0 ? (
                  <span className="w-12 text-sm font-semibold text-gray-700">If</span>
                ) : (
                  <select
                    value={c.connector}
                    onChange={(e) => patchCond(i, { connector: e.target.value as "and" | "or" })}
                    className={`${sel} w-12 px-1 font-semibold`}
                  >
                    <option value="and">and</option>
                    <option value="or">or</option>
                  </select>
                )}
                {questionSelect(c.source, (v) => patchCond(i, { source: v, value: "" }), qs.map((x) => x.q))}
                <select value={c.op} onChange={(e) => patchCond(i, { op: e.target.value })} className={sel}>
                  {OPERATORS.map((o) => (
                    <option key={o.op} value={o.op}>{o.label}</option>
                  ))}
                </select>
                {!def?.unary &&
                  (options.length > 0 && (c.op === "=" || c.op === "!=") ? (
                    <select value={c.value} onChange={(e) => patchCond(i, { value: e.target.value })} className={sel}>
                      <option value="">select value…</option>
                      {options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={c.value}
                      onChange={(e) => patchCond(i, { value: e.target.value })}
                      placeholder={c.op === "anyof" || c.op === "allof" ? "a, b, c" : "value"}
                      className={`${sel} w-40`}
                    />
                  ))}
                {conds.length > 1 && (
                  <button onClick={() => setConds(conds.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={() => setConds([...conds, { source: "", op: "=", value: "", connector: "and" }])}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: ACCENT }}
          >
            <Plus className="h-4 w-4" /> Add condition
          </button>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
            <span className="w-12 text-sm font-semibold text-gray-700">Then</span>
            <select value={action} onChange={(e) => { setAction(e.target.value as Action); setTarget(""); }} className={sel}>
              {ACTIONS.map((a) => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>

            {["visibleIf"].includes(action) && questionSelect(target, setTarget, targets.filter((n) => n.name))}
            {["enableIf", "requiredIf", "setvalue", "skip"].includes(action) && questionSelect(target, setTarget, qs.map((x) => x.q))}
            {action === "copyvalue" && (
              <>
                {questionSelect(target, setTarget, qs.map((x) => x.q), "from question…")}
                <span className="text-sm text-gray-600">to</span>
                {questionSelect(target2, setTarget2, qs.map((x) => x.q), "to question…")}
              </>
            )}
            {action === "pageVisibleIf" && (
              <select value={target} onChange={(e) => setTarget(e.target.value)} className={sel}>
                <option value="">select page…</option>
                {json.pages.map((p: any) => (
                  <option key={p.name} value={p.name}>{getLoc(p.title) || p.name}</option>
                ))}
              </select>
            )}
            {action === "setvalue" && (
              <input value={setVal} onChange={(e) => setSetVal(e.target.value)} placeholder="new value" className={`${sel} w-36`} />
            )}
            {action === "runexpression" && (
              <>
                <input
                  value={runExpr}
                  onChange={(e) => setRunExpr(e.target.value)}
                  placeholder="e.g. {price} * {qty}"
                  className={`${sel} w-52 font-mono`}
                />
                <span className="text-sm text-gray-600">save to</span>
                {questionSelect(target, setTarget, qs.map((x) => x.q), "(optional)")}
              </>
            )}

            <button
              onClick={addRule}
              disabled={!canAdd}
              className="ml-auto px-4 py-1.5 text-sm font-semibold text-white rounded disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              Add rule
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No logic rules yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-400 border-b">
                <th className="py-2 pr-3 w-40">Applies to</th>
                <th className="py-2 pr-3 w-56">Rule</th>
                <th className="py-2 pr-3">Condition</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key + r.expr} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-3 font-medium text-gray-800">{r.where}</td>
                  <td className="py-2 pr-3 text-gray-600">{r.rule}</td>
                  <td className="py-2 pr-3">
                    <RuleExpr expr={r.expr} onSave={r.save} />
                  </td>
                  <td className="py-2 text-right">
                    <button onClick={r.remove} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
