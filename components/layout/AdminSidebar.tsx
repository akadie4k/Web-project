"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import {
  faHouse,
  faFileLines,
  faHospital,
  faBars,
} from "@fortawesome/free-solid-svg-icons";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import AdminNavbar from "@/components/layout/AdminNavbar";
import Footer from "@/components/layout/Footer";

const menuItems = [
  {
    label: "หน้าหลัก",
    href: "/admin/dashboard",
    icon: faHouse,
  },
  {
    label: "สร้างคำร้องขอบริจาคเลือด",
    href: "/admin/blood-requests/create",
    icon: faFileLines,
  },
  {
    label: "โรงพยาบาล",
    href: "/hospitals",
    icon: faHospital,
  },
];

export default function AdminSidebar({
  children,
  userName: _userName,
}: {
  children: ReactNode;
  userName: string;
}) {
  const pathname = usePathname();

  // true = เปิด / false = ปิด
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#f6f9fc] text-[#0E3B6C]">

      {/* =========================
          Mobile Overlay
      ========================= */}
      {open && (
        <button
          type="button"
          aria-label="ปิดเมนู"
          onClick={() => setOpen(false)}
          className="
            fixed
            inset-0
            z-[50]
            bg-slate-900/30
            backdrop-blur-[1px]
            md:hidden
          "
        />
      )}

      {/* =========================
          Sidebar
      ========================= */}
      <aside
        className={`
          fixed
          left-0
          top-0
          z-[80]
          flex
          h-screen
          w-64
          flex-col
          border-r
          border-slate-200
          bg-white
          shadow-[4px_0_20px_rgba(14,59,108,0.04)]
          transition-transform
          duration-300
          ease-out

          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >

        {/* =========================
            Sidebar Header
        ========================= */}
        <div
          className="
            flex
            h-20
            shrink-0
            items-center
            border-b
            border-slate-100
            px-5
          "
        >
          <Link
            href="/admin/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3"
          >
            <Image
              src="/logo_bloodConnect.svg"
              alt="BloodConnect"
              width={42}
              height={42}
              priority
              className="
                h-10
                w-10
                shrink-0
                object-contain
              "
            />

            <div>
              <div
                className="
                  text-[18px]
                  font-bold
                  leading-tight
                  tracking-tight
                "
              >
                <span className="text-[#0E3B6C]">
                  Blood
                </span>

                <span className="text-[#DC2626]">
                  Connect
                </span>
              </div>

              <div
                className="
                  mt-0.5
                  text-[8px]
                  font-semibold
                  tracking-[0.12em]
                  text-[#65A1F2]
                "
              >
                CONNECT LIVES SAVE LIVES
              </div>
            </div>
          </Link>

          {/* =========================
              3 ขีด - Mobile Only
          ========================= */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="
              ml-auto
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-[#126fd1]
              md:hidden
            "
            aria-label="ปิดเมนู"
            title="ปิดเมนู"
          >
            <FontAwesomeIcon
              icon={faBars}
              className="h-5 w-5"
            />
          </button>
        </div>

        {/* =========================
            Menu
        ========================= */}
        <nav className="flex-1 px-4 py-8">
          <p
            className="
              mb-3
              px-3
              text-[10px]
              font-bold
              tracking-[0.14em]
              text-slate-400
            "
          >
            MENU
          </p>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`
                    group
                    relative
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-3.5
                    text-[14px]
                    font-medium
                    transition-all
                    duration-200

                    ${
                      isActive
                        ? "bg-[#126fd1]/10 text-[#126fd1]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-[#126fd1]"
                    }
                  `}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <span
                      className="
                        absolute
                        left-0
                        top-1/2
                        h-6
                        w-1
                        -translate-y-1/2
                        rounded-r-full
                        bg-[#126fd1]
                      "
                    />
                  )}

                  {/* Icon */}
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`
                      h-[17px]
                      w-[17px]
                      transition

                      ${
                        isActive
                          ? "text-[#126fd1]"
                          : "text-slate-400 group-hover:text-[#126fd1]"
                      }
                    `}
                  />

                  {/* Label */}
                  <span>{item.label}</span>

                  {/* Notification */}
                  {item.label === "Blood Requests" && (
                    <span
                      className="
                        ml-auto
                        h-2
                        w-2
                        rounded-full
                        bg-[#DC2626]
                      "
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* =========================
            Bottom Branding
        ========================= */}
        <div
          className="
            shrink-0
            border-t
            border-slate-100
            px-5
            py-4
          "
        >
          <div className="flex items-center gap-2 px-1">
            <Image
              src="/logo_bloodConnect.svg"
              alt="BloodConnect"
              width={24}
              height={24}
              className="
                h-6
                w-6
                shrink-0
                object-contain
              "
            />

            <div>
              <p
                className="
                  text-[11px]
                  font-semibold
                  text-[#0E3B6C]
                "
              >
                BloodConnect
              </p>

              <p
                className="
                  text-[9px]
                  text-slate-400
                "
              >
                © 2026 All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* =========================
          Main Content
      ========================= */}
      <div
        className={`
          flex
          min-h-screen
          flex-col
          transition-all
          duration-300

          ${open ? "md:ml-64" : "md:ml-0"}
        `}
      >
        <AdminNavbar
          onMenuClick={() => setOpen(true)}
          onToggleSidebar={() => setOpen((prev) => !prev)}
          isSidebarOpen={open}
        />

        <main
          className="
            flex-1
            px-4
            pb-8
            pt-[80px]
            sm:px-6
          "
        >
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}