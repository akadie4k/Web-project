"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

import {
  faBell,
  faUser,
  faBars,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import SearchBar from "@/components/common/SearchBar";

interface User {
  user_id: string;
  user_name: string;
  full_name: string;
  role: string;
}

interface DonorNavbarProps {
  onMenuClick: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export default function DonorNavbar({
  onMenuClick,
  onToggleSidebar,
  isSidebarOpen,
}: DonorNavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // ==================================================
  // Fetch Current User
  // ==================================================
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/auth/check", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();

        setUser(data.user ?? null);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    }

    fetchUser();
  }, []);

  // ==================================================
  // Logout
  // ==================================================
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      {/* ==================================================
          Navbar
      ================================================== */}
      <header
        className={`
          fixed
          right-0
          top-0
          z-[70]
          h-16
          border-b
          border-slate-200/80
          bg-white/95
          backdrop-blur
          transition-all
          duration-300
          ease-out

          ${isSidebarOpen ? "left-0 md:left-64" : "left-0"}
        `}
      >
        <div
          className="
            flex
            h-full
            items-center
            px-4
            sm:px-6
            md:px-8
          "
        >
          {/* ==================================================
              Desktop Sidebar Toggle
          ================================================== */}
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="เปิด/ปิดเมนู"
            title="เปิด/ปิดเมนู"
            className="
              mr-4
              hidden
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-600
              transition
              hover:bg-slate-100
              hover:text-[#126fd1]
              md:flex
            "
          >
            <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
          </button>

          {/* ==================================================
              Mobile Menu + Logo
          ================================================== */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="เปิดเมนู"
              title="เปิดเมนู"
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-slate-600
                transition
                hover:bg-slate-100
                hover:text-[#126fd1]
              "
            >
              <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
            </button>

            <Link
              href="/"
              className="
    text-[18px]
    font-bold
    tracking-tight
  "
            >
              <span className="text-[#0E3B6C]">Blood</span>

              <span className="text-[#DC2626]">Connect</span>
            </Link>
          </div>

          {/* ==================================================
              Search
          ================================================== */}
          <div className="hidden flex-1 md:block">
            <div className="mx-auto w-full max-w-2xl">
              <Suspense
                fallback={
                  <div
                    aria-hidden="true"
                    className="
                      h-10
                      w-full
                      rounded-xl
                      bg-slate-50
                    "
                  />
                }
              >
                <SearchBar placeholder="ค้นหาโรงพยาบาล / จังหวัด..." />
              </Suspense>
            </div>
          </div>

          {/* ==================================================
              Right Side
          ================================================== */}
          <div
            className="
              ml-auto
              flex
              items-center
              gap-1
              sm:gap-2
            "
          >
            {/* ==================================================
                Notification
            ================================================== */}
            <Link
              href="/Notifications"
              aria-label="การแจ้งเตือน"
              className="
                relative
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                text-slate-500
                transition
                hover:bg-slate-100
                hover:text-[#126fd1]
              "
            >
              <FontAwesomeIcon icon={faBell} className="h-[18px] w-[18px]" />

              <span
                className="
                  absolute
                  right-2
                  top-2
                  h-2
                  w-2
                  rounded-full
                  bg-[#ed1b32]
                  ring-2
                  ring-white
                "
              />
            </Link>

            {/* ==================================================
                Profile
            ================================================== */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-label="โปรไฟล์"
                title="โปรไฟล์"
                className="
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  px-1
                  py-1
                  transition
                  hover:bg-slate-50
                "
              >
                {/* Profile Icon */}
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-full
                    bg-[#0E3B6C]
                    text-white
                  "
                >
                  <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
                </div>

                {/* User Information */}
                <div className="hidden text-left lg:block">
                  <p
                    className="
                      max-w-[150px]
                      truncate
                      text-[13px]
                      font-semibold
                      text-slate-700
                    "
                  >
                    {user?.full_name || "ผู้ใช้งาน"}
                  </p>

                  <p className="text-[11px] text-slate-400">
                    {user?.role === "hospital_admin"
                      ? "เจ้าหน้าที่โรงพยาบาล"
                      : user?.role === "system_admin"
                      ? "ผู้ดูแลระบบ"
                      : "ผู้บริจาค"}
                  </p>
                </div>
              </button>

              {/* ==================================================
                  Profile Dropdown
              ================================================== */}
              {isProfileOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-12
                    w-56
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    shadow-xl
                  "
                >
                  {/* User Info */}
                  <div
                    className="
                      border-b
                      border-slate-100
                      px-4
                      py-4
                    "
                  >
                    <p
                      className="
                        truncate
                        text-sm
                        font-semibold
                        text-slate-700
                      "
                    >
                      {user?.full_name || "ผู้ใช้งาน"}
                    </p>

                    <p
                      className="
                        mt-1
                        truncate
                        text-xs
                        text-slate-400
                      "
                    >
                      @{user?.user_name || "user"}
                    </p>
                  </div>

                  {/* ==================================================
                      Profile
                  ================================================== */}
                  <Link
                    href="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="
                      flex
                      items-center
                      gap-3
                      px-4
                      py-3
                      text-sm
                      text-slate-600
                      transition
                      hover:bg-slate-50
                    "
                  >
                    <FontAwesomeIcon
                      icon={faUser}
                      className="h-4 w-4 text-slate-400"
                    />

                    <span>โปรไฟล์</span>
                  </Link>

                  {/* ==================================================
                      Logout
                  ================================================== */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      px-4
                      py-3
                      text-left
                      text-sm
                      text-red-500
                      transition
                      hover:bg-red-50
                    "
                  >
                    <FontAwesomeIcon
                      icon={faRightFromBracket}
                      className="h-4 w-4"
                    />

                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================
          Mobile Search
      ================================================== */}
      <div
        className="
          fixed
          left-0
          right-0
          top-16
          z-40
          border-b
          border-slate-100
          bg-white
          px-4
          py-2.5
          md:hidden
        "
      >
        <Suspense
          fallback={
            <div
              aria-hidden="true"
              className="
                h-10
                w-full
                rounded-xl
                bg-slate-50
              "
            />
          }
        >
          <SearchBar placeholder="ค้นหาโรงพยาบาล / จังหวัด..." />
        </Suspense>
      </div>
    </>
  );
}
