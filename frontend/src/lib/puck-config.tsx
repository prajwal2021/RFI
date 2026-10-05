import type { Config } from "@measured/puck";
import { DropZone } from "@measured/puck";
import { ColorField } from "@/components/puck/color-field";
import { RichTextEditor } from "@/components/puck/rich-text-editor";
import {
  Type,
  Image as ImageIcon,
  Columns,
  Square,
  Minus,
  MoveVertical,
  TextCursorInput,
  AlignLeft,
  List,
  CheckSquare,
  Calendar,
  Upload,
  FileText,
} from "lucide-react";

type Props = {
  [key: string]: any;
};

type PuckConfig = Config<Props>;

export const puckConfig: PuckConfig = {
  categories: {
    layout: {
      title: "Layout",
      components: ["Columns", "Card", "Spacer", "Divider"],
    },
    content: {
      title: "Content",
      components: ["Heading", "Text", "RichText", "Image"],
    },
    formFields: {
      title: "Form Fields",
      components: [
        "TextField",
        "TextArea",
        "SelectField",
        "CheckboxField",
        "DateField",
        "FileUpload",
      ],
    },
  },
  root: {
    fields: {
      title: { type: "text", label: "RFI Title" },
      description: { type: "textarea", label: "Description" },
      backgroundColor: {
        type: "custom",
        label: "Background Color",
        render: ({ value, onChange }) => (
          <ColorField value={value || "#ffffff"} onChange={onChange} />
        ),
      },
      maxWidth: {
        type: "select",
        label: "Page Width",
        options: [
          { label: "Narrow (640px)", value: "640" },
          { label: "Medium (768px)", value: "768" },
          { label: "Wide (1024px)", value: "1024" },
          { label: "Full", value: "100%" },
        ],
      },
    },
    defaultProps: {
      title: "Untitled RFI",
      description: "",
      backgroundColor: "#ffffff",
      maxWidth: "768",
    },
    render: ({ children, puck, title, backgroundColor, maxWidth }) => (
      <div
        style={{
          backgroundColor: backgroundColor || "#ffffff",
          minHeight: "100%",
          padding: "2rem",
        }}
      >
        <div
          style={{
            maxWidth: maxWidth === "100%" ? "100%" : `${maxWidth}px`,
            margin: "0 auto",
          }}
        >
          {children}
        </div>
      </div>
    ),
  },
  components: {
    Heading: {
      fields: {
        text: { type: "text", label: "Text" },
        level: {
          type: "select",
          label: "Level",
          options: [
            { label: "H1", value: "h1" },
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
            { label: "H4", value: "h4" },
          ],
        },
        align: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        color: {
          type: "custom",
          label: "Color",
          render: ({ value, onChange }) => (
            <ColorField value={value || "#1a1a1a"} onChange={onChange} />
          ),
        },
        fontSize: { type: "number", label: "Font Size (px)", min: 12, max: 96 },
        fontWeight: {
          type: "select",
          label: "Font Weight",
          options: [
            { label: "Normal", value: "400" },
            { label: "Medium", value: "500" },
            { label: "Semi Bold", value: "600" },
            { label: "Bold", value: "700" },
            { label: "Extra Bold", value: "800" },
          ],
        },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        text: "Heading",
        level: "h1",
        align: "left",
        color: "#1a1a1a",
        fontSize: 32,
        fontWeight: "700",
        marginBottom: 16,
      },
      render: ({ text, level, align, color, fontSize, fontWeight, marginBottom }) => {
        const Tag = (level || "h1") as keyof JSX.IntrinsicElements;
        return (
          <Tag
            style={{
              textAlign: align as any,
              color,
              fontSize: `${fontSize}px`,
              fontWeight,
              marginBottom: `${marginBottom}px`,
              lineHeight: 1.2,
            }}
          >
            {text}
          </Tag>
        );
      },
    },

    Text: {
      fields: {
        content: { type: "textarea", label: "Content" },
        align: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        color: {
          type: "custom",
          label: "Color",
          render: ({ value, onChange }) => (
            <ColorField value={value || "#4b5563"} onChange={onChange} />
          ),
        },
        fontSize: { type: "number", label: "Font Size (px)", min: 10, max: 48 },
        lineHeight: {
          type: "select",
          label: "Line Height",
          options: [
            { label: "Tight (1.25)", value: "1.25" },
            { label: "Normal (1.5)", value: "1.5" },
            { label: "Relaxed (1.75)", value: "1.75" },
            { label: "Loose (2)", value: "2" },
          ],
        },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        content: "Enter your text here...",
        align: "left",
        color: "#4b5563",
        fontSize: 16,
        lineHeight: "1.5",
        marginBottom: 16,
      },
      render: ({ content, align, color, fontSize, lineHeight, marginBottom }) => (
        <p
          style={{
            textAlign: align as any,
            color,
            fontSize: `${fontSize}px`,
            lineHeight,
            marginBottom: `${marginBottom}px`,
            whiteSpace: "pre-wrap",
          }}
        >
          {content}
        </p>
      ),
    },

    RichText: {
      fields: {
        content: {
          type: "custom",
          label: "Content",
          render: ({ value, onChange }) => (
            <RichTextEditor value={value || ""} onChange={onChange} />
          ),
        },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        content: "<p>Start writing rich text content...</p>",
        marginBottom: 16,
      },
      render: ({ content, marginBottom }) => (
        <div
          style={{ marginBottom: `${marginBottom}px` }}
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: content || "" }}
        />
      ),
    },

    Image: {
      fields: {
        src: { type: "text", label: "Image URL" },
        alt: { type: "text", label: "Alt Text" },
        width: { type: "text", label: 'Width (px or %)' },
        height: { type: "text", label: 'Height (px or "auto")' },
        objectFit: {
          type: "select",
          label: "Fit",
          options: [
            { label: "Cover", value: "cover" },
            { label: "Contain", value: "contain" },
            { label: "Fill", value: "fill" },
            { label: "None", value: "none" },
          ],
        },
        borderRadius: { type: "number", label: "Border Radius (px)", min: 0, max: 50 },
        align: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "flex-start" },
            { label: "Center", value: "center" },
            { label: "Right", value: "flex-end" },
          ],
        },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        src: "",
        alt: "Image",
        width: "100%",
        height: "auto",
        objectFit: "cover",
        borderRadius: 0,
        align: "center",
        marginBottom: 16,
      },
      render: ({ src, alt, width, height, objectFit, borderRadius, align, marginBottom }) => (
        <div
          style={{
            display: "flex",
            justifyContent: align,
            marginBottom: `${marginBottom}px`,
          }}
        >
          {src ? (
            <img
              src={src}
              alt={alt}
              style={{
                width,
                height,
                objectFit: objectFit as any,
                borderRadius: `${borderRadius}px`,
              }}
            />
          ) : (
            <div
              style={{
                width: width || "100%",
                height: "200px",
                backgroundColor: "#f3f4f6",
                borderRadius: `${borderRadius}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px dashed #d1d5db",
              }}
            >
              <div style={{ textAlign: "center", color: "#9ca3af" }}>
                <ImageIcon size={32} style={{ margin: "0 auto 8px" }} />
                <span style={{ fontSize: "14px" }}>Enter image URL in properties</span>
              </div>
            </div>
          )}
        </div>
      ),
    },

    Columns: {
      fields: {
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2 Columns", value: "2" },
            { label: "3 Columns", value: "3" },
            { label: "4 Columns", value: "4" },
          ],
        },
        gap: { type: "number", label: "Gap (px)", min: 0, max: 64 },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        columns: "2",
        gap: 16,
        marginBottom: 16,
      },
      render: ({ columns, gap, marginBottom }) => {
        const count = parseInt(columns || "2", 10);
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${count}, 1fr)`,
              gap: `${gap}px`,
              marginBottom: `${marginBottom}px`,
            }}
          >
            {Array.from({ length: count }).map((_: unknown, i: number) => (
              <DropZone key={i} zone={`column-${i}`} />
            ))}
          </div>
        );
      },
    },

    Card: {
      fields: {
        padding: { type: "number", label: "Padding (px)", min: 0, max: 64 },
        backgroundColor: {
          type: "custom",
          label: "Background",
          render: ({ value, onChange }) => (
            <ColorField value={value || "#ffffff"} onChange={onChange} />
          ),
        },
        borderColor: {
          type: "custom",
          label: "Border Color",
          render: ({ value, onChange }) => (
            <ColorField value={value || "#e5e7eb"} onChange={onChange} />
          ),
        },
        borderRadius: { type: "number", label: "Border Radius (px)", min: 0, max: 32 },
        shadow: {
          type: "select",
          label: "Shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "0 1px 3px rgba(0,0,0,0.1)" },
            { label: "Medium", value: "0 4px 6px rgba(0,0,0,0.1)" },
            { label: "Large", value: "0 10px 25px rgba(0,0,0,0.1)" },
          ],
        },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        padding: 24,
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
        borderRadius: 8,
        shadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginBottom: 16,
      },
      render: ({ padding, backgroundColor, borderColor, borderRadius, shadow, marginBottom }) => (
        <div
          style={{
            padding: `${padding}px`,
            backgroundColor,
            border: `1px solid ${borderColor}`,
            borderRadius: `${borderRadius}px`,
            boxShadow: shadow,
            marginBottom: `${marginBottom}px`,
          }}
        >
          <DropZone zone="card-content" />
        </div>
      ),
    },

    Spacer: {
      fields: {
        height: { type: "number", label: "Height (px)", min: 4, max: 200 },
      },
      defaultProps: { height: 32 },
      render: ({ height }) => (
        <div
          style={{
            height: `${height}px`,
            width: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#d1d5db",
                userSelect: "none",
              }}
            >
              {height}px
            </span>
          </div>
        </div>
      ),
    },

    Divider: {
      fields: {
        color: {
          type: "custom",
          label: "Color",
          render: ({ value, onChange }) => (
            <ColorField value={value || "#e5e7eb"} onChange={onChange} />
          ),
        },
        thickness: { type: "number", label: "Thickness (px)", min: 1, max: 8 },
        style: {
          type: "select",
          label: "Style",
          options: [
            { label: "Solid", value: "solid" },
            { label: "Dashed", value: "dashed" },
            { label: "Dotted", value: "dotted" },
          ],
        },
        marginY: { type: "number", label: "Vertical Spacing (px)", min: 0, max: 64 },
      },
      defaultProps: {
        color: "#e5e7eb",
        thickness: 1,
        style: "solid",
        marginY: 16,
      },
      render: ({ color, thickness, style, marginY }) => (
        <hr
          style={{
            border: "none",
            borderTop: `${thickness}px ${style} ${color}`,
            margin: `${marginY}px 0`,
          }}
        />
      ),
    },

    TextField: {
      fields: {
        label: { type: "text", label: "Label" },
        placeholder: { type: "text", label: "Placeholder" },
        helpText: { type: "text", label: "Help Text" },
        required: {
          type: "radio",
          label: "Required",
          options: [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ],
        },
        inputType: {
          type: "select",
          label: "Input Type",
          options: [
            { label: "Text", value: "text" },
            { label: "Email", value: "email" },
            { label: "Number", value: "number" },
            { label: "Phone", value: "tel" },
            { label: "URL", value: "url" },
          ],
        },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        label: "Text Field",
        placeholder: "Enter text...",
        helpText: "",
        required: "false",
        inputType: "text",
        marginBottom: 20,
      },
      render: ({ label, placeholder, helpText, required, inputType, marginBottom }) => (
        <div style={{ marginBottom: `${marginBottom}px` }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
              color: "#374151",
            }}
          >
            {label}
            {required === "true" && (
              <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
            )}
          </label>
          <input
            type={inputType}
            placeholder={placeholder}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
            }}
          />
          {helpText && (
            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>{helpText}</p>
          )}
        </div>
      ),
    },

    TextArea: {
      fields: {
        label: { type: "text", label: "Label" },
        placeholder: { type: "text", label: "Placeholder" },
        helpText: { type: "text", label: "Help Text" },
        required: {
          type: "radio",
          label: "Required",
          options: [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ],
        },
        rows: { type: "number", label: "Rows", min: 2, max: 20 },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        label: "Text Area",
        placeholder: "Enter detailed text...",
        helpText: "",
        required: "false",
        rows: 4,
        marginBottom: 20,
      },
      render: ({ label, placeholder, helpText, required, rows, marginBottom }) => (
        <div style={{ marginBottom: `${marginBottom}px` }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
              color: "#374151",
            }}
          >
            {label}
            {required === "true" && (
              <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
            )}
          </label>
          <textarea
            placeholder={placeholder}
            rows={rows}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
              resize: "vertical",
            }}
          />
          {helpText && (
            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>{helpText}</p>
          )}
        </div>
      ),
    },

    SelectField: {
      fields: {
        label: { type: "text", label: "Label" },
        helpText: { type: "text", label: "Help Text" },
        required: {
          type: "radio",
          label: "Required",
          options: [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ],
        },
        options: { type: "textarea", label: "Options (one per line)" },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        label: "Select Field",
        helpText: "",
        required: "false",
        options: "Option 1\nOption 2\nOption 3",
        marginBottom: 20,
      },
      render: ({ label, helpText, required, options, marginBottom }) => {
        const optionList = (options || "").split("\n").filter(Boolean);
        return (
          <div style={{ marginBottom: `${marginBottom}px` }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "6px",
                color: "#374151",
              }}
            >
              {label}
              {required === "true" && (
                <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
              )}
            </label>
            <select
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                outline: "none",
                backgroundColor: "white",
              }}
            >
              <option value="">Select...</option>
              {optionList.map((opt: string, i: number) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {helpText && (
              <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>{helpText}</p>
            )}
          </div>
        );
      },
    },

    CheckboxField: {
      fields: {
        label: { type: "text", label: "Label" },
        helpText: { type: "text", label: "Help Text" },
        options: { type: "textarea", label: "Options (one per line)" },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        label: "Checkbox Field",
        helpText: "",
        options: "Option A\nOption B\nOption C",
        marginBottom: 20,
      },
      render: ({ label, helpText, options, marginBottom }) => {
        const optionList = (options || "").split("\n").filter(Boolean);
        return (
          <div style={{ marginBottom: `${marginBottom}px` }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "8px",
                color: "#374151",
              }}
            >
              {label}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {optionList.map((opt: string, i: number) => (
                <label
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    color: "#4b5563",
                    cursor: "pointer",
                  }}
                >
                  <input type="checkbox" style={{ width: "16px", height: "16px" }} />
                  {opt}
                </label>
              ))}
            </div>
            {helpText && (
              <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>{helpText}</p>
            )}
          </div>
        );
      },
    },

    DateField: {
      fields: {
        label: { type: "text", label: "Label" },
        helpText: { type: "text", label: "Help Text" },
        required: {
          type: "radio",
          label: "Required",
          options: [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ],
        },
        includeTime: {
          type: "radio",
          label: "Include Time",
          options: [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ],
        },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        label: "Date Field",
        helpText: "",
        required: "false",
        includeTime: "false",
        marginBottom: 20,
      },
      render: ({ label, helpText, required, includeTime, marginBottom }) => (
        <div style={{ marginBottom: `${marginBottom}px` }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
              color: "#374151",
            }}
          >
            {label}
            {required === "true" && (
              <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
            )}
          </label>
          <input
            type={includeTime === "true" ? "datetime-local" : "date"}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
            }}
          />
          {helpText && (
            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>{helpText}</p>
          )}
        </div>
      ),
    },

    FileUpload: {
      fields: {
        label: { type: "text", label: "Label" },
        helpText: { type: "text", label: "Help Text" },
        accept: { type: "text", label: "Accepted file types (e.g. .pdf,.docx)" },
        required: {
          type: "radio",
          label: "Required",
          options: [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ],
        },
        marginBottom: { type: "number", label: "Bottom Spacing (px)", min: 0, max: 100 },
      },
      defaultProps: {
        label: "File Upload",
        helpText: "Drag and drop or click to upload",
        accept: "",
        required: "false",
        marginBottom: 20,
      },
      render: ({ label, helpText, accept, required, marginBottom }) => (
        <div style={{ marginBottom: `${marginBottom}px` }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
              color: "#374151",
            }}
          >
            {label}
            {required === "true" && (
              <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
            )}
          </label>
          <div
            style={{
              border: "2px dashed #d1d5db",
              borderRadius: "8px",
              padding: "24px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: "#fafafa",
            }}
          >
            <Upload
              size={24}
              style={{ margin: "0 auto 8px", color: "#9ca3af" }}
            />
            <p style={{ fontSize: "14px", color: "#6b7280" }}>
              {helpText || "Click to upload"}
            </p>
            {accept && (
              <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                Accepts: {accept}
              </p>
            )}
          </div>
        </div>
      ),
    },
  },
};
