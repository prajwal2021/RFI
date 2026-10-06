"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRFI, updateRFI } from "@/lib/api";
import { generateFormHTML, FormFieldDef, FormDef } from "./html-generator";
import {
  ArrowLeft, ChevronUp, ChevronDown, Trash2, Plus, X,
  Type, AlignLeft, Hash, Calendar, ChevronDownIcon, List,
  CheckSquare, CircleDot, Mail, Phone, Upload,
  Heading1, Minus, GripVertical, Save, ExternalLink, Share2,
} from "lucide-react";

// ── Field type registry ──

interface FieldTypeDef {
  type: string;
  label: string;
  icon: React.ReactNode;
  category: "field" | "element";
  defaultOptions?: string[];
}

const FIELD_TYPES: FieldTypeDef[] = [
  { type: "text", label: "Text/Number", icon: <Type className="h-4 w-4" />, category: "field" },
  { type: "multiline", label: "Multi-Line Text", icon: <AlignLeft className="h-4 w-4" />, category: "field" },
  { type: "dropdown", label: "Dropdown List", icon: <List className="h-4 w-4" />, category: "field", defaultOptions: ["Option 1", "Option 2", "Option 3"] },
  { type: "date", label: "Date", icon: <Calendar className="h-4 w-4" />, category: "field" },
  { type: "number", label: "Number", icon: <Hash className="h-4 w-4" />, category: "field" },
  { type: "checkbox", label: "Checkbox", icon: <CheckSquare className="h-4 w-4" />, category: "field", defaultOptions: ["Option 1", "Option 2"] },
  { type: "radio", label: "Radio Buttons", icon: <CircleDot className="h-4 w-4" />, category: "field", defaultOptions: ["Option 1", "Option 2"] },
  { type: "email", label: "Email", icon: <Mail className="h-4 w-4" />, category: "field" },
  { type: "phone", label: "Phone", icon: <Phone className="h-4 w-4" />, category: "field" },
  { type: "heading", label: "Heading/Description", icon: <Heading1 className="h-4 w-4" />, category: "element" },
  { type: "divider", label: "Divider", icon: <Minus className="h-4 w-4" />, category: "element" },
  { type: "file", label: "File Upload", icon: <Upload className="h-4 w-4" />, category: "element" },
];

function getFieldIcon(type: string) {
  return FIELD_TYPES.find((ft) => ft.type === type)?.icon || <Type className="h-4 w-4" />;
}

function getFieldLabel(type: string) {
  return FIELD_TYPES.find((ft) => ft.type === type)?.label || type;
}

function makeField(type: string, title: string): FormFieldDef {
  const ft = FIELD_TYPES.find((t) => t.type === type);
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    title: title || ft?.label || "Field",
    subtitle: "",
    required: false,
    hidden: false,
    defaultValue: "",
    options: ft?.defaultOptions ? [...ft.defaultOptions] : [],
  };
}

// ── Toggle switch ──

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-300"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
      </button>
    </label>
  );
}

// ── New Field Dialog (Smartsheet style) ──

function NewFieldDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (type: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState("text");

  if (!open) return null;

  const fieldTypes = FIELD_TYPES.filter((ft) => ft.category === "field");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">New Field</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a field name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Field Type</label>
            <div className="border rounded-md max-h-[320px] overflow-y-auto">
              {fieldTypes.map((ft) => (
                <button
                  key={ft.type}
                  onClick={() => setSelectedType(ft.type)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 border-b last:border-b-0 transition ${selectedType === ft.type ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                >
                  <span className="text-gray-500">{ft.icon}</span>
                  {ft.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onAdd(selectedType, name);
              setName("");
              setSelectedType("text");
              onClose();
            }}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Field Card in center panel ──

function FieldCard({
  field,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
}: {
  field: FormFieldDef;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  if (field.type === "divider") {
    return (
      <div
        onClick={onSelect}
        className={`relative group my-2 py-3 px-4 rounded-md cursor-pointer transition ${isSelected ? "ring-2 ring-blue-500 bg-blue-50/30" : "hover:bg-gray-50"}`}
      >
        {isSelected && (
          <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
            <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
          </div>
        )}
        <hr className="border-gray-300" />
        {isSelected && (
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute -right-10 top-1/2 -translate-y-1/2 p-1 text-red-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  if (field.type === "heading") {
    return (
      <div
        onClick={onSelect}
        className={`relative group my-2 py-3 px-4 rounded-md cursor-pointer transition ${isSelected ? "ring-2 ring-blue-500 bg-blue-50/30" : "hover:bg-gray-50"}`}
      >
        {isSelected && (
          <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
            <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
          </div>
        )}
        <h3 className="font-semibold text-gray-800">{field.title || "Section Heading"}</h3>
        {field.subtitle && <p className="text-xs text-gray-500 mt-0.5">{field.subtitle}</p>}
        {isSelected && (
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute -right-10 top-1/2 -translate-y-1/2 p-1 text-red-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`relative group my-2 py-3 px-4 rounded-md cursor-pointer transition ${isSelected ? "ring-2 ring-blue-500 bg-blue-50/30" : "hover:bg-gray-50"}`}
    >
      {isSelected && (
        <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
        </div>
      )}

      <div className="font-medium text-sm text-gray-800 mb-2">
        {field.title}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </div>

      {/* Input preview */}
      {(field.type === "text" || field.type === "email" || field.type === "phone" || field.type === "number") && (
        <div className="h-9 rounded-md border border-gray-300 bg-white px-3 flex items-center text-sm text-gray-400">
          {field.defaultValue || ""}
        </div>
      )}
      {field.type === "multiline" && (
        <div className="h-20 rounded-md border border-gray-300 bg-white px-3 pt-2 text-sm text-gray-400">
          {field.defaultValue || ""}
        </div>
      )}
      {field.type === "date" && (
        <div className="h-9 rounded-md border border-gray-300 bg-white px-3 flex items-center justify-between text-sm text-gray-400">
          <span>{field.defaultValue || "mm/dd/yyyy"}</span>
          <Calendar className="h-4 w-4" />
        </div>
      )}
      {field.type === "dropdown" && (
        <div className="h-9 rounded-md border border-gray-300 bg-white px-3 flex items-center justify-between text-sm text-gray-400">
          <span>Select...</span>
          <ChevronDownIcon className="h-4 w-4" />
        </div>
      )}
      {field.type === "checkbox" && (
        <div className="space-y-1.5">
          {field.options.slice(0, 3).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-4 w-4 rounded border border-gray-300 bg-white" />
              {opt}
            </label>
          ))}
          {field.options.length > 3 && <p className="text-xs text-gray-400">+{field.options.length - 3} more</p>}
        </div>
      )}
      {field.type === "radio" && (
        <div className="space-y-1.5">
          {field.options.slice(0, 3).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-4 w-4 rounded-full border border-gray-300 bg-white" />
              {opt}
            </label>
          ))}
          {field.options.length > 3 && <p className="text-xs text-gray-400">+{field.options.length - 3} more</p>}
        </div>
      )}
      {field.type === "file" && (
        <div className="h-9 rounded-md border border-dashed border-gray-300 bg-white px-3 flex items-center gap-2 text-sm text-gray-400">
          <Upload className="h-4 w-4" /> Choose file...
        </div>
      )}

      {isSelected && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute -right-10 top-1/2 -translate-y-1/2 p-1 text-red-400 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ── Field Editor (right panel) ──

function FieldEditor({
  field,
  onChange,
}: {
  field: FormFieldDef;
  onChange: (updates: Partial<FormFieldDef>) => void;
}) {
  const hasOptions = ["dropdown", "checkbox", "radio"].includes(field.type);

  return (
    <div className="p-5 space-y-5">
      <h3 className="text-base font-semibold text-gray-900">Details</h3>

      {/* Field Type */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Field Type</label>
        <select
          value={field.type}
          onChange={(e) => {
            const newType = e.target.value;
            const ft = FIELD_TYPES.find((t) => t.type === newType);
            const updates: Partial<FormFieldDef> = { type: newType };
            if (ft?.defaultOptions && !["dropdown", "checkbox", "radio"].includes(field.type)) {
              updates.options = [...ft.defaultOptions];
            }
            onChange(updates);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FIELD_TYPES.map((ft) => (
            <option key={ft.type} value={ft.type}>{ft.label}</option>
          ))}
        </select>
      </div>

      <hr className="border-gray-200" />

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
        <input
          value={field.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Subtitle</label>
        <textarea
          value={field.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <hr className="border-gray-200" />

      {/* Toggles */}
      <Toggle checked={field.required} onChange={(v) => onChange({ required: v })} label="Required" />
      <Toggle checked={field.hidden} onChange={(v) => onChange({ hidden: v })} label="Hidden" />

      <hr className="border-gray-200" />

      {/* Default Value */}
      {field.type !== "heading" && field.type !== "divider" && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Default Value</label>
          {field.type === "date" ? (
            <input
              type="date"
              value={field.defaultValue}
              onChange={(e) => onChange({ defaultValue: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : field.type === "dropdown" ? (
            <select
              value={field.defaultValue}
              onChange={(e) => onChange({ defaultValue: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {field.options.map((o, i) => (
                <option key={i} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type === "number" ? "number" : "text"}
              value={field.defaultValue}
              onChange={(e) => onChange({ defaultValue: e.target.value })}
              placeholder="Enter default value"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      )}

      {/* Options (for dropdown, checkbox, radio) */}
      {hasOptions && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Options</label>
          <div className="space-y-2">
            {field.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <GripVertical className="h-3 w-3 text-gray-300 shrink-0" />
                <input
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...field.options];
                    newOpts[i] = e.target.value;
                    onChange({ options: newOpts });
                  }}
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    const newOpts = field.options.filter((_, j) => j !== i);
                    onChange({ options: newOpts });
                  }}
                  className="text-gray-400 hover:text-red-500 shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => onChange({ options: [...field.options, `Option ${field.options.length + 1}`] })}
            className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-3 w-3" /> Add option
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Form Builder ──

export default function FormBuilder({
  initialForm,
  rfiId,
  workspaceId,
}: {
  initialForm?: FormDef;
  rfiId?: string;
  workspaceId?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialForm?.title || "Untitled Form");
  const [description, setDescription] = useState(initialForm?.description || "");
  const [fields, setFields] = useState<FormFieldDef[]>(initialForm?.fields || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewField, setShowNewField] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "settings">("form");
  const [editingTitle, setEditingTitle] = useState(false);

  const selectedField = fields.find((f) => f.id === selectedId) || null;

  const addField = (type: string, name: string) => {
    const f = makeField(type, name);
    setFields([...fields, f]);
    setSelectedId(f.id);
  };

  const addElement = (type: string) => {
    const f = makeField(type, "");
    setFields([...fields, f]);
    setSelectedId(f.id);
  };

  const updateField = (id: string, updates: Partial<FormFieldDef>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveField = (id: string, dir: "up" | "down") => {
    const idx = fields.findIndex((f) => f.id === id);
    if (dir === "up" && idx > 0) {
      const next = [...fields];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      setFields(next);
    } else if (dir === "down" && idx < fields.length - 1) {
      const next = [...fields];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      setFields(next);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formDef: FormDef = { title, description, fields };
      const { html, css } = generateFormHTML(formDef);
      const content = { formDefinition: formDef, html, css, projectData: {} };

      if (rfiId) {
        await updateRFI(rfiId, { subject: title, content });
        alert("Form saved!");
      } else {
        const rfi = await createRFI({
          subject: title,
          created_by: "admin",
          content,
          workspace_id: workspaceId,
        });
        router.push(`/rfi/${rfi.id}`);
      }
    } catch {
      alert("Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#f0f0f0]">
      {/* ── Top Bar (Smartsheet style - dark) ── */}
      <header className="h-12 bg-[#2d2d2d] text-white flex items-center px-4 shrink-0 z-20">
        <button onClick={() => router.push("/")} className="p-1 hover:bg-white/10 rounded mr-3">
          <ArrowLeft className="h-4 w-4" />
        </button>

        {editingTitle ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
            autoFocus
            className="bg-white/10 text-white text-sm font-medium px-2 py-1 rounded border border-white/20 outline-none w-64"
          />
        ) : (
          <button onClick={() => setEditingTitle(true)} className="text-sm font-medium hover:bg-white/10 px-2 py-1 rounded truncate max-w-[300px]">
            {title}
          </button>
        )}

        {/* Form / Settings tabs */}
        <div className="flex ml-8 gap-0.5">
          <button
            onClick={() => setActiveTab("form")}
            className={`px-4 py-1.5 text-sm rounded-t ${activeTab === "form" ? "bg-white/15 font-medium" : "hover:bg-white/10"}`}
          >
            Form
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-1.5 text-sm rounded-t ${activeTab === "settings" ? "bg-white/15 font-medium" : "hover:bg-white/10"}`}
          >
            Settings
          </button>
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      {/* ── Three Panel Layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Panel ── */}
        <aside className="w-72 bg-white border-r flex flex-col shrink-0">
          <div className="p-4 border-b">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Fields</h3>
            <p className="text-xs text-gray-500 mb-3">
              Add fields to your form. Each field collects one piece of information.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirm("Remove all fields from the form?")) {
                    setFields([]);
                    setSelectedId(null);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Remove All
              </button>
              <button
                onClick={() => setShowNewField(true)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                <Plus className="h-3 w-3" /> Add new field
              </button>
            </div>
          </div>

          {/* Added fields list */}
          <div className="flex-1 overflow-y-auto p-3">
            {fields.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded mb-0.5 transition ${selectedId === f.id ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <span className="text-gray-400 shrink-0">{getFieldIcon(f.type)}</span>
                <span className="truncate">{f.title || getFieldLabel(f.type)}</span>
              </button>
            ))}
            {fields.length === 0 && (
              <div className="text-center py-8 text-xs text-gray-400">
                No fields added yet
              </div>
            )}
          </div>

          {/* Form Elements section */}
          <div className="border-t p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Form Elements</h4>
            {FIELD_TYPES.filter((ft) => ft.category === "element").map((ft) => (
              <button
                key={ft.type}
                onClick={() => addElement(ft.type)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
              >
                <span className="text-gray-400">{ft.icon}</span>
                {ft.label}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Center Panel ── */}
        <main className="flex-1 overflow-y-auto p-8" onClick={() => setSelectedId(null)}>
          {activeTab === "form" ? (
            <div className="max-w-[700px] mx-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white rounded-lg shadow-sm border">
                {/* Form header area */}
                <div className="px-8 pt-8 pb-4">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-2xl font-bold text-gray-900 w-full outline-none border-b-2 border-transparent focus:border-blue-500 pb-1"
                    placeholder="Form Title"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={2}
                    className="w-full mt-2 text-sm text-gray-500 outline-none resize-none"
                  />
                </div>

                {/* Fields */}
                <div className="px-8 pb-8 pl-16 pr-16">
                  {fields.map((field, idx) => (
                    <FieldCard
                      key={field.id}
                      field={field}
                      isSelected={selectedId === field.id}
                      onSelect={() => setSelectedId(field.id)}
                      onMoveUp={() => moveField(field.id, "up")}
                      onMoveDown={() => moveField(field.id, "down")}
                      onRemove={() => removeField(field.id)}
                      isFirst={idx === 0}
                      isLast={idx === fields.length - 1}
                    />
                  ))}
                  {fields.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                      <Plus className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">Click &quot;Add new field&quot; to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Settings tab */
            <div className="max-w-[500px] mx-auto bg-white rounded-lg shadow-sm border p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Form Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <Toggle
                  checked={false}
                  onChange={() => {}}
                  label="Do not show title and description"
                />
              </div>
            </div>
          )}
        </main>

        {/* ── Right Panel ── */}
        <aside className="w-80 bg-white border-l overflow-y-auto shrink-0">
          {selectedField ? (
            <FieldEditor
              field={selectedField}
              onChange={(updates) => updateField(selectedField.id, updates)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6">
              <Type className="h-8 w-8 mb-3 text-gray-300" />
              <p className="text-sm text-center">Select a field to edit its properties</p>
            </div>
          )}
        </aside>
      </div>

      {/* New Field Dialog */}
      <NewFieldDialog
        open={showNewField}
        onClose={() => setShowNewField(false)}
        onAdd={addField}
      />
    </div>
  );
}
