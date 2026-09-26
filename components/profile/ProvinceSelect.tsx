"use client";

import { useEffect, useRef, useState } from "react";

import { THAI_PROVINCES } from "@/lib/thaiProvinces";

interface ProvinceSelectProps {
  id: string;
  value: string;
  onChange: (province: string) => void;
  buttonClassName: string;
}

// A custom listbox so the list always opens below the field; native <select>
// popups are placed by the browser and often open upward for long lists.
export default function ProvinceSelect({ id, value, onChange, buttonClassName }: ProvinceSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const options = THAI_PROVINCES.filter((province) => province.includes(query.trim()));
  const listId = `${id}-list`;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const openList = () => {
    setQuery("");
    setActiveIndex(Math.max(0, THAI_PROVINCES.indexOf(value as (typeof THAI_PROVINCES)[number])));
    setOpen(true);
  };

  const choose = (province: string) => {
    onChange(province);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (options[activeIndex]) choose(options[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openList())}
        className={`${buttonClassName} flex items-center justify-between text-left`}
      >
        <span className={value ? "" : "text-slate-400"}>{value || "เลือกจังหวัด"}</span>
        <i className={`fa-solid fa-chevron-down text-xs text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}></i>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="ค้นหาจังหวัด..."
              aria-label="ค้นหาจังหวัด"
              aria-controls={listId}
              aria-activedescendant={options[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
              className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm text-[#0e3b6c] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#65a1f2]"
            />
          </div>

          <ul ref={listRef} id={listId} role="listbox" aria-label="จังหวัด" className="max-h-64 overflow-y-auto py-1">
            {options.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400">ไม่พบจังหวัดที่ค้นหา</li>
            ) : (
              options.map((province, index) => (
                <li
                  key={province}
                  id={`${id}-option-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={province === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(province)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-center justify-between px-4 py-2 text-sm ${
                    index === activeIndex ? "bg-blue-50 text-[#0e3b6c]" : "text-slate-700"
                  } ${province === value ? "font-bold" : ""}`}
                >
                  {province}
                  {province === value && <i className="fa-solid fa-check text-xs text-blue-600"></i>}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
