import type React from "react";

export const RFI_MIME = "application/x-rfi";

export interface DraggedRfi {
  id: string;
  subject: string;
  from: string | null;
}

export function startRfiDrag(e: React.DragEvent, rfi: { id: string; subject: string; workspace_id: string | null }) {
  const payload: DraggedRfi = { id: rfi.id, subject: rfi.subject, from: rfi.workspace_id };
  e.dataTransfer.setData(RFI_MIME, JSON.stringify(payload));
  e.dataTransfer.setData("text/plain", rfi.subject);
  e.dataTransfer.effectAllowed = "move";
}

/** True while a form is being dragged (readable during dragover; the payload itself only on drop). */
export function isRfiDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes(RFI_MIME);
}

export function readRfiDrag(e: React.DragEvent): DraggedRfi | null {
  try {
    const raw = e.dataTransfer.getData(RFI_MIME);
    return raw ? (JSON.parse(raw) as DraggedRfi) : null;
  } catch {
    return null;
  }
}
