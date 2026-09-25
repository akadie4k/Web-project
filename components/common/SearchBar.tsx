
"use client";

import { useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface SearchBarProps {
  placeholder?: string;
}

export default function SearchBar({
  placeholder = "ค้นหาโรงพยาบาล / จังหวัด...",
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get("search") || "");

  // โหลดค่าจาก URL มาแสดงในช่อง Search
  useEffect(() => {
    const keyword = searchParams.get("search") || "";
    const timer = setTimeout(() => setSearch(keyword), 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Search แบบ debounce
  useEffect(() => {
    const keyword = search.trim();
    const currentKeyword = searchParams.get("search") || "";

    // ถ้าค่าตรงกับ URL อยู่แล้ว ไม่ต้องทำอะไร
    if (keyword === currentKeyword) {
      return;
    }

    const timer = setTimeout(() => {
      // ถ้าลบข้อความจนหมด
      if (!keyword) {
        router.replace(pathname);
        return;
      }

      const params = new URLSearchParams(
        searchParams.toString()
      );

      params.set("search", keyword);

      router.replace(
        `${pathname}?${params.toString()}`
      );
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [
    search,
    pathname,
    router,
    searchParams,
  ]);

  return (
    <div className="relative w-full">
      {/* Search Icon */}
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        className="
          absolute
          left-4
          top-1/2
          h-4
          w-4
          -translate-y-1/2
          text-slate-400
        "
      />

      {/* Search Input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="
          w-full
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          py-2.5
          pl-11
          pr-4
          text-sm
          text-slate-700
          outline-none
          transition

          placeholder:text-slate-400

          focus:border-[#126fd1]
          focus:bg-white
          focus:ring-2
          focus:ring-[#126fd1]/10
        "
      />
    </div>
  );
}
