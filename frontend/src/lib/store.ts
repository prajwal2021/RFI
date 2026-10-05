import { create } from "zustand";
import { temporal } from "zundo";

interface BuilderState {
  selectedComponentId: string | null;
  isDirty: boolean;
  rfiTitle: string;
  setSelectedComponent: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setRfiTitle: (title: string) => void;
}

export const useBuilderStore = create<BuilderState>()(
  temporal(
    (set) => ({
      selectedComponentId: null,
      isDirty: false,
      rfiTitle: "Untitled RFI",
      setSelectedComponent: (id) => set({ selectedComponentId: id }),
      setDirty: (dirty) => set({ isDirty: dirty }),
      setRfiTitle: (title) => set({ rfiTitle: title }),
    }),
    { limit: 50 }
  )
);
