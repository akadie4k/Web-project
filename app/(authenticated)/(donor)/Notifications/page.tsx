"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DonorNavbar from "@/components/layout/DonorNavbar";
import DonorSideBar from "@/components/layout/DonorSideBar";
import RequestFeed from "@/components/donor/Notifications/RequestFeed";
import Footer from "@/components/layout/Footer";

import type { BloodRequest } from "@/types/database";

interface EligibilityInfo {
  isEligible: boolean;
  isCoolingDown: boolean;
  daysRemaining: number;
  reasons: string[];
}

export default function RequestsPage() {
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const [eligibilityInfo, setEligibilityInfo] = useState<EligibilityInfo>({
    isEligible: false,
    isCoolingDown: false,
    daysRemaining: 0,
    reasons: [],
  });

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/donor/Notifications", {
          credentials: "include",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "ไม่สามารถโหลดรายการคำขอได้");
        }

        setIsReady(Boolean(data.profile?.is_ready));
        setEligibilityInfo(data.eligibility as EligibilityInfo);
        setRequests((data.requests ?? []) as BloodRequest[]);
      } catch (error) {
        console.error("Unable to load donor requests:", error);
        setEligibilityInfo({
          isEligible: false,
          isCoolingDown: false,
          daysRemaining: 0,
          reasons: [
            error instanceof Error
              ? error.message
              : "ไม่สามารถโหลดรายการคำขอได้",
          ],
        });
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ==========================================
          Navbar
      ========================================== */}
      <DonorNavbar
        onMenuClick={() =>
          setIsSidebarOpen(true)
        }
        onToggleSidebar={() =>
          setIsSidebarOpen((prev) => !prev)
        }
        isSidebarOpen={isSidebarOpen}
      />

      {/* ==========================================
          Sidebar
      ========================================== */}
      <DonorSideBar
        isOpen={isSidebarOpen}
        onClose={() =>
          setIsSidebarOpen(false)
        }
      />

      {/* ==========================================
          Main
      ========================================== */}
      <main
        className={`
          min-h-screen
          pt-[116px]
          md:pt-16
          transition-[margin]
          duration-300
          ease-out
          ${
            isSidebarOpen
              ? "md:ml-64"
              : "md:ml-0"
          }
        `}
      >
        <div className="w-full px-4 py-5 sm:px-6 md:px-8 lg:px-10">
          <div className="w-full">

            {/* ==========================================
                Header
            ========================================== */}
            <div className="mb-5 sm:mb-6">
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
                การแจ้งเตือน
              </h1>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                ตรวจสอบรายการคำขอรับบริจาคโลหิตที่ตรงกับหมู่เลือดและจังหวัดของคุณ
              </p>
            </div>

            {/* ==========================================
                Loading
            ========================================== */}
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                กำลังตรวจสอบสิทธิ์และโหลดรายการคำขอรับบริจาคโลหิต...
              </div>
            ) : eligibilityInfo.isEligible && !isReady ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center shadow-sm">
                <h3 className="text-base font-bold text-slate-800">
                  ปิดสถานะพร้อมบริจาคอยู่
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  เปิดสถานะพร้อมบริจาคจากหน้าโปรไฟล์หรือแดชบอร์ดเพื่อรับเคสที่ตรงกับคุณ
                </p>
              </div>
            ) : !eligibilityInfo.isEligible ? (
              /* ==========================================
                 ไม่ผ่านเกณฑ์
              ========================================== */
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <i className="fa-solid fa-hourglass-half text-xl" />
                </div>

                <h3 className="text-center text-base font-bold text-slate-800">
                  ขณะนี้ยังไม่สามารถบริจาคโลหิตได้
                </h3>

                {eligibilityInfo.reasons.length > 0 && (
                  <div className="mx-auto mt-4 max-w-xl">
                    <ul className="space-y-2">
                      {eligibilityInfo.reasons.map(
                        (reason, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm text-slate-600"
                          >
                            <span className="mt-1 text-amber-500">
                              •
                            </span>

                            <span>
                              {reason}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {eligibilityInfo.isCoolingDown && (
                  <p className="mt-4 text-center text-sm font-medium text-amber-700">
                    เหลืออีก{" "}
                    {eligibilityInfo.daysRemaining}{" "}
                    วัน จึงจะสามารถบริจาคได้
                  </p>
                )}
              </div>
            ) : (
              /* ==========================================
                 ผ่านเกณฑ์ → แสดง Request Feed
              ========================================== */
              <Suspense
                fallback={
                  <div className="py-12 text-center text-sm text-slate-500">
                    กำลังโหลดรายการคำขอรับบริจาคโลหิต...
                  </div>
                }
              >
                <RequestFeed
                  requests={requests}
                />
              </Suspense>
            )}

            {/* ==========================================
                Footer
            ========================================== */}
            <div className="mt-10 sm:mt-12">
              <Footer />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}