"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DonorNavbar from "@/components/layout/DonorNavbar";
import DonorSideBar from "@/components/layout/DonorSideBar";
import RequestFeed from "@/components/donor/Notifications/RequestFeed";
import Footer from "@/components/layout/Footer";

import { supabase } from "@/lib/supabase";
import type { BloodRequest } from "@/types/database";
import { evaluateDonorEligibility } from "@/lib/donorEligibility";

interface DonorProfile {
  donor_id: string;
  blood_type: "A" | "B" | "AB" | "O";
  rh_factor: "Positive" | "Negative" | "+" | "-";
  province: string;

  weight?: number | null;
  date_of_birth?: string | null;
  last_donate_date?: string | null;
  is_ready: boolean;
}

export default function RequestsPage() {
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [eligibilityInfo, setEligibilityInfo] = useState<{
    isEligible: boolean;
    isCoolingDown: boolean;
    daysRemaining: number;
    reasons: string[];
  }>({
    isEligible: false,
    isCoolingDown: false,
    daysRemaining: 0,
    reasons: [],
  });

  const normalizeRh = (rh?: string | null) => {
    if (!rh) return null;

    const clean = rh.trim().toUpperCase();

    if (clean === "+" || clean.startsWith("POS")) {
      return "+";
    }

    if (clean === "-" || clean.startsWith("NEG")) {
      return "-";
    }

    return null;
  };

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);

        // ==========================================
        // 1. ตรวจสอบ Login
        // ==========================================
        const authRes = await fetch("/api/auth/check", {
          method: "GET",
          credentials: "include",
        });

        if (!authRes.ok) {
          console.warn(
            "Unauthorized or session expired, redirecting to login..."
          );

          router.push("/login");
          return;
        }

        const authData = await authRes.json();
        const userId = authData?.user?.user_id;

        if (!userId) {
          console.warn(
            "User ID not found in session, redirecting to login..."
          );

          router.push("/login");
          return;
        }

        console.log("Logged in user ID:", userId);

        // ==========================================
        // 2. ดึงข้อมูล Donor Profile
        // ==========================================
        const { data: donorProfile, error: profileError } =
          await supabase
            .from("donor_profiles")
            .select(
              `
              donor_id,
              blood_type,
              rh_factor,
              province,
              weight,
              date_of_birth,
              last_donate_date,
              is_ready
            `
            )
            .eq("donor_id", userId)
            .single<DonorProfile>();

        if (profileError || !donorProfile) {
          console.error(
            "Donor profile error:",
            profileError
          );

          setEligibilityInfo({
            isEligible: false,
            isCoolingDown: false,
            daysRemaining: 0,
            reasons: ["ไม่พบข้อมูลโปรไฟล์ผู้บริจาค"],
          });

          setRequests([]);
          return;
        }

        // ==========================================
        // 3. ตรวจสอบสิทธิ์การบริจาค
        // ==========================================
        const eligibility = evaluateDonorEligibility({
          weight: donorProfile.weight,
          date_of_birth: donorProfile.date_of_birth,
          last_donate_date: donorProfile.last_donate_date,
          is_ready: donorProfile.is_ready,
        });

        console.log(
          "Donor eligibility:",
          eligibility
        );

        setEligibilityInfo({
          isEligible: eligibility.isEligible,
          isCoolingDown: eligibility.isCoolingDown,
          daysRemaining: eligibility.daysRemaining,
          reasons: eligibility.reasons,
        });

        // ==========================================
        // 4. ถ้าไม่มีสิทธิ์บริจาค → ไม่ต้องหา Request
        // ==========================================
        if (!eligibility.isEligible) {
          console.log(
            "Donor is not eligible:",
            eligibility.reasons
          );

          setRequests([]);
          return;
        }

        // ==========================================
        // 5. ดึง Blood Requests
        // ==========================================
        const {
          data: requestData,
          error: requestError,
        } = await supabase
          .from("blood_requests")
          .select(
            `
            request_id,
            hospital_id,
            blood_type,
            rh_factor,
            units_needed,
            urgency_level,
            purpose,
            target_date,
            status,
            created_at,
            hospitals!inner (
              hospital_id,
              name,
              province,
              operating_hours
            ),
            donation_records (
              record_id,
              volume_ml,
              status
            )
          `
          )
          .eq("status", "OPEN")
          .eq(
            "blood_type",
            donorProfile.blood_type
          )
          .eq(
            "hospitals.province",
            donorProfile.province
          )
          .order("created_at", {
            ascending: false,
          });

        if (requestError) {
          console.error(
            "Blood request error:",
            requestError
          );

          setRequests([]);
          return;
        }

        // ==========================================
        // 6. Matching Rh
        // ==========================================
        const donorRh = normalizeRh(
          donorProfile.rh_factor
        );

        const matchedRequests = (
          requestData ?? []
        ).filter((request: any) => {
          const requestRh = normalizeRh(
            request.rh_factor
          );

          return (
            donorRh !== null &&
            donorRh === requestRh
          );
        });

        console.log(
          "Matched blood requests:",
          matchedRequests
        );

        setRequests(
          matchedRequests as unknown as BloodRequest[]
        );
      } catch (err) {
        console.error(
          "Unexpected error:",
          err
        );

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