"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DonorNavbar from "@/components/layout/DonorNavbar";
import DonorSideBar from "@/components/layout/DonorSideBar";
import RequestFeed from "@/components/donor/Notifications/RequestFeed";
import Footer from "@/components/layout/Footer";

import { supabase } from "@/lib/supabase";
import type { BloodRequest } from "@/types/database";

interface DonorProfile {
  donor_id: string;
  blood_type: "A" | "B" | "AB" | "O";
  rh_factor: "Positive" | "Negative" | "+" | "-";
  province: string;
  is_ready: boolean;
  last_donate_date?: string | null;
}

export default function RequestsPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [coolingDownInfo, setCoolingDownInfo] = useState<{
    isCoolingDown: boolean;
    daysRemaining: number;
  }>({ isCoolingDown: false, daysRemaining: 0 });

  // ฟังก์ชันแปลง Rh Factor ให้เป็นรูปแบบสากล (+ หรือ -) เพื่อนำมา match กันได้อย่างแม่นยำ
  const normalizeRh = (rh?: string | null) => {
    if (!rh) return null;
    const clean = rh.trim().toUpperCase();
    if (clean === "+" || clean.startsWith("POS")) return "+";
    if (clean === "-" || clean.startsWith("NEG")) return "-";
    return null;
  };

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);

        // ==========================================
        // 1. ดึงข้อมูล User จาก /api/auth/check
        // ==========================================
        const authRes = await fetch("/api/auth/check", {
          method: "GET",
          credentials: "include", // ส่ง Cookie token แนบไปด้วย
        });

        if (!authRes.ok) {
          console.warn("Unauthorized or session expired, redirecting to login...");
          router.push("/login");
          return;
        }

        const authData = await authRes.json();
        // ดึง user_id ตามโครงสร้าง response: { user: { user_id, ... } }
        const userId = authData?.user?.user_id;

        if (!userId) {
          console.warn("User ID not found in session, redirecting to login...");
          router.push("/login");
          return;
        }

        console.log("Logged in user ID:", userId);

        // ==========================================
        // 2. ดึง Donor Profile จาก Supabase
        // ==========================================
        const { data: donorProfile, error: profileError } = await supabase
          .from("donor_profiles")
          .select("donor_id, blood_type, rh_factor, province, is_ready, last_donate_date")
          .eq("donor_id", userId)
          .single<DonorProfile>();

        if (profileError || !donorProfile) {
          console.error("Donor profile error:", profileError);
          return;
        }

        // เช็คระยะพักฟื้น 90 วันหลังบริจาค
        if (donorProfile.last_donate_date) {
          const donatedAt = new Date(`${donorProfile.last_donate_date}T00:00:00`);
          const nextDonationDate = new Date(donatedAt);
          nextDonationDate.setDate(nextDonationDate.getDate() + 90);

          const millisecondsPerDay = 1000 * 60 * 60 * 24;
          const daysRemaining = Math.max(
            0,
            Math.ceil((nextDonationDate.getTime() - Date.now()) / millisecondsPerDay)
          );

          if (daysRemaining > 0) {
            setCoolingDownInfo({ isCoolingDown: true, daysRemaining });
            setRequests([]);
            return;
          }
        }

        // ==========================================
        // 3. ตรวจสอบสถานะความพร้อมบริจาค
        // ==========================================
        if (!donorProfile.is_ready) {
          console.log("Donor is currently not ready to donate.");
          setRequests([]);
          return;
        }

        // ==========================================
        // 4. ดึง Blood Requests พร้อม Join ข้อมูล Hospitals
        // ==========================================
        const { data: requestData, error: requestError } = await supabase
          .from("blood_requests")
          .select(`
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
              province
            ),
            donation_records (
              record_id,
              volume_ml,
              status
            )
          `)
          .eq("status", "OPEN")
          .eq("blood_type", donorProfile.blood_type)
          .eq("hospitals.province", donorProfile.province)
          .order("created_at", { ascending: false });

        if (requestError) {
          console.error("Blood request error:", requestError);
          return;
        }

        // ==========================================
        // 5. Match Rh Factor ระหว่าง Donor กับ Request
        // ==========================================
        const donorRh = normalizeRh(donorProfile.rh_factor);

        const matchedRequests = (requestData ?? []).filter((request) => {
          const requestRh = normalizeRh(request.rh_factor);
          return donorRh !== null && donorRh === requestRh;
        });

        setRequests(matchedRequests as unknown as BloodRequest[]);
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <DonorNavbar onMenuClick={() => setIsSidebarOpen(true)} />

      {/* Sidebar */}
      <DonorSideBar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main */}
      <main className="min-h-screen pt-[116px] md:ml-64 md:pt-16">
        <div className="w-full px-4 py-5 sm:px-6 md:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-5xl">
            {/* Header */}
            <div className="mb-5 sm:mb-6">
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
                การแจ้งเตือน
              </h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                ตรวจสอบรายการคำขอรับบริจาคโลหิตที่ตรงกับหมู่เลือดเเละจังหวัดของคุณ
              </p>
            </div>

            {/* Request Feed */}
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                กำลังโหลดรายการคำขอรับบริจาคโลหิต...
              </div>
            ) : coolingDownInfo.isCoolingDown ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-3">
                  <i className="fa-solid fa-hourglass-half text-xl" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  คุณกำลังอยู่ในระยะพักฟื้นร่างกาย
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  เพื่อสุขภาพและความปลอดภัยของคุณ กรุณาเว้นระยะห่างการบริจาค 90 วัน (เหลืออีก {coolingDownInfo.daysRemaining} วัน)
                </p>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="py-12 text-center text-sm text-slate-500">
                    กำลังโหลดรายการคำขอรับบริจาคโลหิต...
                  </div>
                }
              >
                <RequestFeed requests={requests} />
              </Suspense>
            )}

            {/* Footer */}
                      <div className="mt-10 sm:mt-12">
            <Footer />
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
