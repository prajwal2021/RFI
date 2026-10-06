"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import grapesjs from "grapesjs";
import gjsBlocksBasic from "grapesjs-blocks-basic";
import gjsPluginForms from "grapesjs-plugin-forms";
import "grapesjs/dist/css/grapes.min.css";

export interface EditorContent {
  projectData: any;
  html: string;
  css: string;
}

export interface GrapesEditorRef {
  getContent: () => EditorContent | null;
}

interface GrapesEditorProps {
  initialContent?: EditorContent | null;
}

const GrapesEditor = forwardRef<GrapesEditorRef, GrapesEditorProps>(
  ({ initialContent }, ref) => {
    const editorRef = useRef<any>(null);
    const [ready, setReady] = useState(false);

    useImperativeHandle(ref, () => ({
      getContent: () => {
        const editor = editorRef.current;
        if (!editor) return null;
        return {
          projectData: editor.getProjectData(),
          html: editor.getHtml(),
          css: editor.getCss(),
        };
      },
    }));

    useEffect(() => {
      const editor = grapesjs.init({
        container: "#gjs",
        fromElement: false,
        height: "100%",
        width: "auto",
        storageManager: false,
        plugins: [
          (e: any) => gjsBlocksBasic(e, { flexGrid: true }),
          (e: any) => gjsPluginForms(e, {}),
        ],
        canvas: {
          styles: [
            "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
            "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
            "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap",
            "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap",
            "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
          ],
        },
        deviceManager: {
          devices: [
            { name: "Desktop", width: "" },
            { name: "Tablet", width: "768px", widthMedia: "992px" },
            { name: "Mobile", width: "375px", widthMedia: "480px" },
          ],
        },
        styleManager: {
          sectors: [
            {
              name: "Typography",
              open: true,
              properties: [
                {
                  type: "select",
                  property: "font-family",
                  options: [
                    { id: "Inter, sans-serif", label: "Inter" },
                    { id: "Roboto, sans-serif", label: "Roboto" },
                    { id: "Open Sans, sans-serif", label: "Open Sans" },
                    { id: "Lato, sans-serif", label: "Lato" },
                    { id: "Poppins, sans-serif", label: "Poppins" },
                    { id: "Georgia, serif", label: "Georgia" },
                    { id: "Times New Roman, serif", label: "Times New Roman" },
                    { id: "Arial, sans-serif", label: "Arial" },
                    { id: "Courier New, monospace", label: "Courier New" },
                  ],
                },
                "font-size",
                "font-weight",
                "letter-spacing",
                "color",
                "line-height",
                "text-align",
                "text-decoration",
                "text-transform",
                "font-style",
              ],
            },
            {
              name: "Dimension",
              open: false,
              properties: [
                "width",
                "min-width",
                "max-width",
                "height",
                "min-height",
                "max-height",
                "padding",
                "margin",
              ],
            },
            {
              name: "Layout",
              open: false,
              properties: [
                "display",
                "flex-direction",
                "flex-wrap",
                "justify-content",
                "align-items",
                "align-content",
                "gap",
                "order",
                "flex-basis",
                "flex-grow",
                "flex-shrink",
                "align-self",
              ],
            },
            {
              name: "Position",
              open: false,
              properties: ["position", "top", "right", "bottom", "left", "float", "clear", "overflow", "z-index"],
            },
            {
              name: "Background",
              open: false,
              properties: ["background-color", "background-image", "background-repeat", "background-position", "background-size", "background-attachment"],
            },
            {
              name: "Border",
              open: false,
              properties: [
                "border",
                "border-radius",
                "border-top-left-radius",
                "border-top-right-radius",
                "border-bottom-left-radius",
                "border-bottom-right-radius",
              ],
            },
            {
              name: "Effects",
              open: false,
              properties: ["box-shadow", "text-shadow", "opacity", "cursor", "transition", "transform"],
            },
            {
              name: "List",
              open: false,
              properties: ["list-style-type", "list-style-position"],
            },
          ],
        },
      });

      addCustomBlocks(editor);

      const hasProjectData =
        initialContent?.projectData &&
        Object.keys(initialContent.projectData).length > 0;

      if (hasProjectData) {
        editor.loadProjectData(initialContent!.projectData);
      } else if (initialContent?.html) {
        editor.setComponents(initialContent.html);
        if (initialContent.css) {
          editor.setStyle(initialContent.css);
        }
      } else {
        editor.setComponents(`
          <div style="max-width:800px;margin:0 auto;padding:40px 20px;">
            <h1 style="font-family:Inter,sans-serif;font-size:32px;font-weight:700;color:#1e293b;margin-bottom:8px;">RFI Title</h1>
            <p style="font-family:Inter,sans-serif;font-size:16px;color:#64748b;margin-bottom:32px;">Add a description for this Request for Information.</p>
            <hr style="border:none;border-top:2px solid #e2e8f0;margin-bottom:32px;">
          </div>
        `);
        editor.setStyle(`
          * { box-sizing: border-box; }
          body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1a1a1a; background: #ffffff; }
        `);
      }

      editorRef.current = editor;
      setReady(true);

      return () => {
        editor.destroy();
        editorRef.current = null;
      };
    }, []);

    return <div id="gjs" style={{ height: "100%", overflow: "hidden" }} />;
  }
);

GrapesEditor.displayName = "GrapesEditor";

function addCustomBlocks(editor: any) {
  const bm = editor.BlockManager;

  bm.add("rfi-section", {
    label: "Section",
    category: "RFI Layout",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: `<section style="padding:32px 24px;margin-bottom:24px;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
      <h2 style="font-size:22px;font-weight:600;color:#1e293b;margin:0 0 12px;">Section Title</h2>
      <p style="font-size:15px;color:#64748b;margin:0;">Section description or instructions go here.</p>
    </section>`,
  });

  bm.add("rfi-question", {
    label: "Question Block",
    category: "RFI Layout",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="12" y="17" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">?</text></svg>',
    content: `<div style="padding:20px;margin-bottom:20px;border-left:4px solid #3b82f6;background:#f8fafc;border-radius:0 8px 8px 0;">
      <label style="display:block;font-size:15px;font-weight:600;color:#1e293b;margin-bottom:4px;">Question Label <span style="color:#ef4444;">*</span></label>
      <p style="font-size:13px;color:#64748b;margin:0 0 12px;">Add instructions or context for this question.</p>
      <input type="text" placeholder="Enter response..." style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;outline:none;font-family:inherit;" />
    </div>`,
  });

  bm.add("rfi-info-box", {
    label: "Info Box",
    category: "RFI Layout",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="8" r="1" fill="currentColor"/></svg>',
    content: `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-bottom:16px;">
      <div style="font-weight:600;color:#1e40af;margin-bottom:6px;font-size:15px;">Important Information</div>
      <p style="margin:0;color:#1e3a5f;font-size:14px;">Add important details, notes, or context here.</p>
    </div>`,
  });

  bm.add("rfi-warning-box", {
    label: "Warning Box",
    category: "RFI Layout",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><path d="M12 2L2 22h20L12 2z" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="10" x2="12" y2="15" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>',
    content: `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-bottom:16px;">
      <div style="font-weight:600;color:#92400e;margin-bottom:6px;font-size:15px;">Warning / Deadline</div>
      <p style="margin:0;color:#78350f;font-size:14px;">Add deadline information or important warnings here.</p>
    </div>`,
  });

  bm.add("rfi-success-box", {
    label: "Success Box",
    category: "RFI Layout",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><polyline points="8,12 11,15 16,9" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    content: `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px 20px;margin-bottom:16px;">
      <div style="font-weight:600;color:#065f46;margin-bottom:6px;font-size:15px;">Completed / Approved</div>
      <p style="margin:0;color:#064e3b;font-size:14px;">Status or completion information.</p>
    </div>`,
  });

  bm.add("rfi-divider", {
    label: "Divider",
    category: "RFI Layout",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/></svg>',
    content: '<hr style="border:none;border-top:2px solid #e2e8f0;margin:24px 0;" />',
  });

  bm.add("rfi-spacer", {
    label: "Spacer",
    category: "RFI Layout",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3,3"/><line x1="6" y1="4" x2="18" y2="4" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="20" x2="18" y2="20" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: '<div style="height:40px;" data-gjs-type="default"></div>',
  });

  bm.add("rfi-heading", {
    label: "Heading",
    category: "RFI Content",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><text x="4" y="18" fill="currentColor" font-size="18" font-weight="bold">H</text></svg>',
    content: '<h2 style="font-family:Inter,sans-serif;font-size:24px;font-weight:600;color:#1e293b;margin:0 0 12px;">Heading Text</h2>',
  });

  bm.add("rfi-paragraph", {
    label: "Paragraph",
    category: "RFI Content",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="18" x2="15" y2="18" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: '<p style="font-family:Inter,sans-serif;font-size:15px;color:#475569;line-height:1.7;margin:0 0 16px;">Enter your paragraph text here. You can style fonts, colors, spacing, and alignment using the style panel on the right.</p>',
  });

  bm.add("rfi-list", {
    label: "Bullet List",
    category: "RFI Content",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><circle cx="5" cy="7" r="1.5" fill="currentColor"/><line x1="10" y1="7" x2="21" y2="7" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/><line x1="10" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="17" r="1.5" fill="currentColor"/><line x1="10" y1="17" x2="21" y2="17" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: `<ul style="font-family:Inter,sans-serif;font-size:15px;color:#475569;line-height:1.8;padding-left:24px;margin:0 0 16px;">
      <li>First item</li><li>Second item</li><li>Third item</li>
    </ul>`,
  });

  bm.add("rfi-card", {
    label: "Card",
    category: "RFI Content",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="8" x2="17" y2="8" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="1"/></svg>',
    content: `<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="font-size:18px;font-weight:600;color:#1e293b;margin:0 0 8px;">Card Title</h3>
      <p style="font-size:14px;color:#64748b;margin:0;">Card content goes here. Customize colors, borders, and shadows in the style panel.</p>
    </div>`,
  });

  bm.add("rfi-button", {
    label: "Button",
    category: "RFI Content",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="3" y="7" width="18" height="10" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: '<a style="display:inline-block;padding:12px 28px;background:#3b82f6;color:#ffffff;border-radius:8px;font-size:15px;font-weight:500;text-decoration:none;font-family:Inter,sans-serif;cursor:pointer;">Button Text</a>',
  });

  bm.add("rfi-table", {
    label: "Table",
    category: "RFI Content",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="3" y="3" width="18" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1"/><line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" stroke-width="1"/><line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" stroke-width="1"/><line x1="15" y1="3" x2="15" y2="21" stroke="currentColor" stroke-width="1"/></svg>',
    content: `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-family:Inter,sans-serif;font-size:14px;">
      <thead><tr>
        <th style="padding:10px 14px;background:#f1f5f9;border:1px solid #e2e8f0;text-align:left;font-weight:600;color:#334155;">Header 1</th>
        <th style="padding:10px 14px;background:#f1f5f9;border:1px solid #e2e8f0;text-align:left;font-weight:600;color:#334155;">Header 2</th>
        <th style="padding:10px 14px;background:#f1f5f9;border:1px solid #e2e8f0;text-align:left;font-weight:600;color:#334155;">Header 3</th>
      </tr></thead>
      <tbody>
        <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#475569;">Cell</td><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#475569;">Cell</td><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#475569;">Cell</td></tr>
        <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#475569;">Cell</td><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#475569;">Cell</td><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#475569;">Cell</td></tr>
      </tbody>
    </table>`,
  });

  bm.add("rfi-textarea", {
    label: "Long Answer",
    category: "RFI Form Fields",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="8" x2="18" y2="8" stroke="currentColor" stroke-width="1"/><line x1="6" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="1"/><line x1="6" y1="16" x2="12" y2="16" stroke="currentColor" stroke-width="1"/></svg>',
    content: `<div style="margin-bottom:20px;">
      <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;font-family:Inter,sans-serif;">Question Label <span style="color:#ef4444;">*</span></label>
      <textarea name="response" placeholder="Enter your detailed response..." rows="4" style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;outline:none;resize:vertical;font-family:inherit;"></textarea>
    </div>`,
  });

  bm.add("rfi-select", {
    label: "Dropdown",
    category: "RFI Form Fields",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><polyline points="15,10 18,13 15,16" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: `<div style="margin-bottom:20px;">
      <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;font-family:Inter,sans-serif;">Select an option</label>
      <select name="selection" style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;outline:none;background:white;font-family:inherit;">
        <option value="">Choose...</option>
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
        <option value="option3">Option 3</option>
      </select>
    </div>`,
  });

  bm.add("rfi-checkbox-group", {
    label: "Checkboxes",
    category: "RFI Form Fields",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><polyline points="4.5,7 6,8.5 9,5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="6.5" x2="21" y2="6.5" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="17.5" x2="21" y2="17.5" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: `<div style="margin-bottom:20px;">
      <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:8px;font-family:Inter,sans-serif;">Select all that apply</label>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:#4b5563;cursor:pointer;font-family:Inter,sans-serif;"><input type="checkbox" name="check" value="A" style="width:16px;height:16px;" /> Option A</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:#4b5563;cursor:pointer;font-family:Inter,sans-serif;"><input type="checkbox" name="check" value="B" style="width:16px;height:16px;" /> Option B</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:#4b5563;cursor:pointer;font-family:Inter,sans-serif;"><input type="checkbox" name="check" value="C" style="width:16px;height:16px;" /> Option C</label>
      </div>
    </div>`,
  });

  bm.add("rfi-radio-group", {
    label: "Radio Buttons",
    category: "RFI Form Fields",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><circle cx="6.5" cy="6.5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="6.5" cy="6.5" r="2" fill="currentColor"/><line x1="14" y1="6.5" x2="21" y2="6.5" stroke="currentColor" stroke-width="1.5"/><circle cx="6.5" cy="17.5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="17.5" x2="21" y2="17.5" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: `<div style="margin-bottom:20px;">
      <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:8px;font-family:Inter,sans-serif;">Choose one</label>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:#4b5563;cursor:pointer;font-family:Inter,sans-serif;"><input type="radio" name="choice" value="A" style="width:16px;height:16px;" /> Option A</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:#4b5563;cursor:pointer;font-family:Inter,sans-serif;"><input type="radio" name="choice" value="B" style="width:16px;height:16px;" /> Option B</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:#4b5563;cursor:pointer;font-family:Inter,sans-serif;"><input type="radio" name="choice" value="C" style="width:16px;height:16px;" /> Option C</label>
      </div>
    </div>`,
  });

  bm.add("rfi-date-field", {
    label: "Date Field",
    category: "RFI Form Fields",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="3" y="4" width="18" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="1.5"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: `<div style="margin-bottom:20px;">
      <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;font-family:Inter,sans-serif;">Date</label>
      <input type="date" name="date" style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;outline:none;font-family:inherit;" />
    </div>`,
  });

  bm.add("rfi-file-upload", {
    label: "File Upload",
    category: "RFI Form Fields",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="1.5"/><polyline points="14,2 14,8 20,8" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" stroke-width="1.5"/><polyline points="9,15 12,12 15,15" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: `<div style="margin-bottom:20px;">
      <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;font-family:Inter,sans-serif;">Upload File</label>
      <div style="border:2px dashed #cbd5e1;border-radius:8px;padding:24px;text-align:center;cursor:pointer;background:#fafafa;">
        <p style="margin:0 0 8px;color:#64748b;font-size:14px;font-family:Inter,sans-serif;">Drag and drop or click to upload</p>
        <input type="file" name="file" style="font-size:13px;font-family:inherit;" />
      </div>
    </div>`,
  });

  bm.add("rfi-email-field", {
    label: "Email Field",
    category: "RFI Form Fields",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><polyline points="2,5 12,13 22,5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: `<div style="margin-bottom:20px;">
      <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;font-family:Inter,sans-serif;">Email Address</label>
      <input type="email" name="email" placeholder="name@example.com" style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;outline:none;font-family:inherit;" />
    </div>`,
  });

  bm.add("rfi-number-field", {
    label: "Number Field",
    category: "RFI Form Fields",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><text x="5" y="17" fill="currentColor" font-size="14" font-weight="bold">123</text></svg>',
    content: `<div style="margin-bottom:20px;">
      <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;font-family:Inter,sans-serif;">Number</label>
      <input type="number" name="number" placeholder="0" style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;outline:none;font-family:inherit;" />
    </div>`,
  });

  bm.add("rfi-image", {
    label: "Image",
    category: "RFI Content",
    media: '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><polyline points="21,15 16,10 5,21" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    content: { type: "image" },
    activate: true,
  });
}

export default GrapesEditor;
