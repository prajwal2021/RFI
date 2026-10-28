"use client";

import { useEffect, useState } from "react";
import { fetchMe, Me } from "@/lib/api";

let cached: Promise<Me> | null = null;

/** What the signed-in user may do. RFI users build forms; Call Center users run the Call Center; admins and anyone with both do everything. */
export function useAccess() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    cached = cached || fetchMe();
    cached.then(setMe).catch(() => { cached = null; });
  }, []);
  const rfi = !me || me.is_admin || me.is_rfi_user !== false;
  const cc = !me || me.is_admin || me.is_call_center_user !== false;
  return {
    me,
    /** Can build, publish, move and delete forms */
    canEditForms: rfi,
    /** Sees only a trimmed Call Center (people from their forms, hand-offs) */
    rfiOnly: !!me && !me.is_admin && !cc,
  };
}
