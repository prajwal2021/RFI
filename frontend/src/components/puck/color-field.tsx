"use client";

import { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";

interface ColorFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function ColorField({ value, onChange, label }: ColorFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={popoverRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded border border-gray-300 cursor-pointer shrink-0"
          style={{ backgroundColor: value || "#000000" }}
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-8 px-2 text-xs border border-gray-300 rounded bg-white"
          placeholder="#000000"
        />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-2 p-3 bg-white rounded-lg shadow-xl border">
          <HexColorPicker color={value || "#000000"} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
