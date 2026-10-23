"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Course, createCourse, deleteCourse, labelOf, listCourses, updateCourse } from "@/lib/crm";
import { btn, Card, Empty, ErrorBox, FieldLabel, input, Modal, OptSelect, textarea, Toast, useMeta } from "@/components/crm/ui";

export default function CoursesPage() {
  const { meta, reload } = useMeta();
  const [rows, setRows] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Course> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const load = useCallback(() => {
    listCourses().then(setRows).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const save = async () => {
    if (!edit?.name?.trim()) return setError("Give the course a name");
    setError(null);
    try {
      const payload = { name: edit.name, code: edit.code || null, category: edit.category || null, status: edit.status || "available",
        starts_on: edit.starts_on || null, description: edit.description || "", url: edit.url || null };
      if (edit.id) {
        const r = await updateCourse(edit.id, payload);
        setToast(r.waitlist_tasks_created ? `Saved. ${r.waitlist_tasks_created} waitlist follow-up task(s) created.` : "Saved");
      } else {
        await createCourse(payload);
        setToast("Course added");
      }
      setEdit(null);
      load();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-bold">Courses</h1>
          <p className="text-[13px] text-[#444]">The catalog everyone shares. Agents log interest against these; RFI answers that match a course name become interests automatically.</p>
        </div>
        <button onClick={() => setEdit({ status: "available" })} className={btn.brand}><Plus className="h-4 w-4" /> New course</button>
      </div>
      <ErrorBox text={error} />
      <Card title="Catalog" icon={<BookOpen className="h-4 w-4" />} iconColor="#dd7a01" bodyClass="p-0"
        help="Change a course from Coming soon to Available and everyone on its waitlist gets a follow-up task in the Call Center queue.">
        {!rows || !meta ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No courses yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="bg-[#fafaf9] border-b border-[#dddbda] text-left text-[11px] uppercase tracking-wide text-[#444]">
                <th className="px-3 py-2">Course</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Interested</th><th className="px-3 py-2">Waitlist</th><th className="px-3 py-2">Enrolled</th><th className="px-3 py-2" />
              </tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-[#e5e5e5]">
                    <td className="px-3 py-2"><div className="font-medium">{c.name}</div><div className="text-[11px] text-[#747474]">{[c.code, c.category].filter(Boolean).join(" · ")}</div></td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.status === "available" ? "bg-[#ebf7e6] text-[#2e844a]" : c.status === "coming_soon" ? "bg-[#fef6ec] text-[#a96404]" : "bg-[#f3f3f3] text-[#747474]"}`}>{labelOf(meta.course_statuses, c.status)}</span></td>
                    <td className="px-3 py-2 tabular-nums">{c.interested}</td>
                    <td className="px-3 py-2 tabular-nums">{c.waitlist}</td>
                    <td className="px-3 py-2 tabular-nums">{c.enrolled}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => setEdit(c)} className={btn.icon} title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                      {meta.me.is_admin && (
                        <button onClick={async () => { if (confirm(`Delete ${c.name}? Interests in it are removed too. Consider marking it Closed instead.`)) { await deleteCourse(c.id).catch((e) => setError(e.message)); load(); } }} className={`${btn.icon} ml-1`} title="Delete">
                          <Trash2 className="h-3.5 w-3.5 text-[#ba0517]" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {edit && meta && (
        <Modal title={edit.id ? `Edit ${edit.name}` : "New course"} onClose={() => setEdit(null)}
          footer={<><button onClick={() => setEdit(null)} className={btn.neutral}>Cancel</button><button onClick={save} className={btn.brand}>Save</button></>}>
          <div className="space-y-3">
            <label className="block"><FieldLabel label="Name" required help="Use the exact name shown on RFIs so answers match automatically." />
              <input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={input} /></label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block"><FieldLabel label="Code" /><input value={edit.code || ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} className={input} /></label>
              <label className="block"><FieldLabel label="Category" /><input value={edit.category || ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })} className={input} placeholder="Microcertificate" /></label>
              <OptSelect label="Status" opts={meta.course_statuses} value={edit.status || "available"} onChange={(v) => setEdit({ ...edit, status: v })} />
              <label className="block"><FieldLabel label="Starts on" /><input type="date" value={edit.starts_on || ""} onChange={(e) => setEdit({ ...edit, starts_on: e.target.value })} className={input} /></label>
            </div>
            <label className="block"><FieldLabel label="Web page" /><input value={edit.url || ""} onChange={(e) => setEdit({ ...edit, url: e.target.value })} className={input} placeholder="https://" /></label>
            <label className="block"><FieldLabel label="Talking points for agents" help="Short description agents can read to callers." />
              <textarea rows={3} value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className={textarea} /></label>
          </div>
        </Modal>
      )}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
