"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import {
  faClockRotateLeft,
  faBell,
  faBars,
  faGlobe,
  faHorse,
  faChartPie,
  faHouse,
} from "@fortawesome/free-solid-svg-icons";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface MenuItem {
  label: string;
  href: string;
  icon: typeof faGlobe;
}

const menuItems: MenuItem[] = [
  {
    label: "หน้าหลัก",
    href: "/",
    icon: faGlobe,
  },
  {
    label: "แดชบอร์ด",
    href: "/dashboard",
    icon: faHouse,
  },
  {
    label: "ประวัติการบริจาค",
    href: "/history",
    icon: faClockRotateLeft,
  },
  {
    label: "การแจ้งเตือน",
    href: "/Notifications",
    icon: faBell,
  },
];

interface DonorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DonorSideBar({
  isOpen,
  onClose,
}: DonorSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* ================= MOBILE OVERLAY ================= */}
      {isOpen && (
        <button
          type="button"
          aria-label="ปิดเมนู"
          onClick={onClose}
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

      {/* ================= SIDEBAR ================= */}
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
          transition-transform
          duration-300
          ease-out
          ${
            isOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* ================= HEADER ================= */}
        <div
          className="
            flex
            h-20
            shrink-0
            items-center
            border-b
            border-slate-100
            px-6
          "
        >
          {/* Logo + BloodConnect */}
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <Image
              src="/logo_bloodConnect.svg"
              alt="BloodConnect Logo"
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
                  tracking-[0.13em]
                  text-[#65a1f2]
                "
              >
                CONNECT LIVES SAVE LIVES
              </div>
            </div>
          </Link>

          {/* ================= MOBILE CLOSE ================= */}
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดเมนู"
            title="ปิดเมนู"
            className="
              ml-auto
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-[#126fd1]
              md:hidden
            "
          >
            <FontAwesomeIcon
              icon={faBars}
              className="h-5 w-5"
            />
          </button>
        </div>

        {/* ================= MENU ================= */}
        <nav className="flex-1 px-4 py-7">
          <p
            className="
              mb-3
              px-3
              text-[10px]
              font-bold
              uppercase
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
                  onClick={onClose}
                  className={`
                    group
                    relative
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-3
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
                  {/* Active Bar */}
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

                  {/* Notification Dot */}
                  {item.href === "/Notifications" && (
                    <span
                      className="
                        ml-auto
                        h-2
                        w-2
                        rounded-full
                        bg-[#ed1b32]
                      "
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ================= FOOTER ================= */}
        <div
          className="
            shrink-0
            border-t
            border-slate-100
            px-6
            py-5
          "
        >
          <div className="flex items-center gap-3">
            <Image
              src="/logo_bloodConnect.svg"
              alt="BloodConnect"
              width={34}
              height={34}
              className="
                h-8
                w-8
                shrink-0
                object-contain
              "
            />

            <div>
              <p
                className="
                  text-[13px]
                  font-semibold
                  tracking-tight
                "
              >
                <span className="text-[#0E3B6C]">
                  Blood
                </span>

                <span className="text-[#DC2626]">
                  Connect
                </span>
              </p>

              <p className="text-[9px] text-slate-400">
                จัดการข้อมูลส่วนตัว
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}