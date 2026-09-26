"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BloodBadge from "@/components/BloodBadge";
import DonorNavbar from "@/components/layout/DonorNavbar";
import DonorSideBar from "@/components/layout/DonorSideBar";
import Footer from "@/components/layout/Footer";
import { PARENT_CONSENT_MESSAGE } from "@/lib/donorEligibility";
import UrgencyBadge from "@/components/UrgencyBadge";
import type { BloodRequest } from "@/types/database";

interface DonorProfile {
  donor_id: string;
  blood_type: "A" | "B" | "AB" | "O";
  rh_factor: "Positive" | "Negative" | "+" | "-";
  province: string;
  is_ready: boolean;
  last_donate_date: string | null;
}

interface DashboardUser {
  user_id: string;
  full_name: string;
}

interface RecoveryStatus {
  isCoolingDown: boolean;
  daysRemaining: number;
  nextDonationDate: Date | null;
  progress: number;
}

type HospitalRelation =
  | { name: string; province: string }
  | { name: string; province: string }[]
  | null;

type BloodRequestQueryRow = Omit<
  BloodRequest,
  "hospitals" | "donation_records"
> & {
  hospitals: HospitalRelation;
  donation_records?: BloodRequest["donation_records"] | null;
};

type ActiveRequest = BloodRequest & {
  donation_record_id: string;
  donation_status: string;
};

const normalizeRh = (rh?: string | null) => {
  const value = rh?.trim().toUpperCase();

  if (value === "+" || value?.startsWith("POS")) return "+";
  if (value === "-" || value?.startsWith("NEG")) return "-";

  return null;
};

const formatBloodGroup = (profile: DonorProfile | null) => {
  if (!profile) return "-";

  return `${profile.blood_type}${normalizeRh(profile.rh_factor) ?? ""}`;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getRecoveryStatus = (
  lastDonationDate?: string | null,
): RecoveryStatus => {
  if (!lastDonationDate) {
    return {
      isCoolingDown: false,
      daysRemaining: 0,
      nextDonationDate: null,
      progress: 100,
    };
  }

  const donatedAt = new Date(`${lastDonationDate}T00:00:00`);
  const nextDonationDate = new Date(donatedAt);
  nextDonationDate.setDate(nextDonationDate.getDate() + 90);

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.max(
    0,
    Math.ceil((nextDonationDate.getTime() - Date.now()) / millisecondsPerDay),
  );

  const daysElapsed = Math.max(0, 90 - daysRemaining);

  return {
    isCoolingDown: daysRemaining > 0,
    daysRemaining,
    nextDonationDate,
    progress: Math.min(100, Math.round((daysElapsed / 90) * 100)),
  };
};

const toBloodRequest = (request: BloodRequestQueryRow): BloodRequest => ({
  ...request,
  hospitals: Array.isArray(request.hospitals)
    ? request.hospitals[0]
    : (request.hospitals ?? undefined),
  donation_records: request.donation_records ?? undefined,
});

export default function DashboardPage() {
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [matchedRequests, setMatchedRequests] = useState<BloodRequest[]>([]);
  const [canReceiveRequests, setCanReceiveRequests] = useState(false);
  const [canEnableReadiness, setCanEnableReadiness] = useState(false);
  const [eligibilityReasons, setEligibilityReasons] = useState<string[]>([]);
  const [activeRequest, setActiveRequest] = useState<ActiveRequest | null>(
    null,
  );
  const [isUpdatingReadiness, setIsUpdatingReadiness] = useState(false);
  const [isCancellingMission, setIsCancellingMission] = useState(false);
  const [missionError, setMissionError] = useState("");
  const [readinessError, setReadinessError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/donor/overview", {
          credentials: "include",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "ไม่สามารถโหลดแดชบอร์ดได้");
        }

        setUser(data.user as DashboardUser);
        setProfile(data.profile as DonorProfile);
        setCanReceiveRequests(Boolean(data.canReceiveRequests));
        setCanEnableReadiness(Boolean(data.canEnableReadiness));
        setEligibilityReasons(data.eligibility?.reasons ?? []);

        setMatchedRequests(
          ((data.matchedRequests ?? []) as BloodRequestQueryRow[]).map(
            toBloodRequest,
          ),
        );

        setActiveRequest(
          data.activeRequest
            ? (toBloodRequest(
                data.activeRequest as BloodRequestQueryRow,
              ) as ActiveRequest)
            : null,
        );
      } catch (error) {
        console.error("Unable to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

  const bloodGroup = formatBloodGroup(profile);
  const recoveryStatus = getRecoveryStatus(profile?.last_donate_date);

  const handleCancelMission = async () => {
    if (!activeRequest || isCancellingMission) return;

    if (!window.confirm("ยืนยันยกเลิกการตอบรับภารกิจนี้ใช่หรือไม่")) return;

    setIsCancellingMission(true);
    setMissionError("");

    try {
      const response = await fetch(
        `/api/donor/donations/${activeRequest.donation_record_id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถยกเลิกภารกิจได้");
      }

      setActiveRequest(null);
    } catch (error) {
      console.error("Unable to cancel donation:", error);

      setMissionError(
        error instanceof Error ? error.message : "ไม่สามารถยกเลิกภารกิจได้",
      );
    } finally {
      setIsCancellingMission(false);
    }
  };

  const handleReadinessToggle = async () => {
    const nextValue = !profile?.is_ready;

    if (
      !profile ||
      (nextValue && !canEnableReadiness) ||
      isUpdatingReadiness
    ) {
      return;
    }

    setIsUpdatingReadiness(true);
    setReadinessError("");

    try {
      const response = await fetch("/api/donor/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          is_ready: nextValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถอัปเดตสถานะได้");
      }

      setProfile(data.profile as DonorProfile);
      setCanReceiveRequests(nextValue);
    } catch (error) {
      console.error("Unable to update readiness:", error);
      setReadinessError(
        error instanceof Error ? error.message : "ไม่สามารถอัปเดตสถานะได้",
      );
    } finally {
      setIsUpdatingReadiness(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DonorNavbar
        onMenuClick={() => setIsSidebarOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      <DonorSideBar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main
        className={`
          min-h-screen
          pt-[116px]
          md:pt-16
          transition-[margin]
          duration-300
          ease-out
          ${isSidebarOpen ? "md:ml-64" : "md:ml-0"}
        `}
      >
        <div className="w-full px-4 py-5 sm:px-6 md:px-8 lg:px-10">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              กำลังโหลดแดชบอร์ดของคุณ...
            </div>
          ) : (
            <>
              <section className="mb-6 flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <BloodBadge
                    bloodType={bloodGroup}
                    className="h-16 w-16 rounded-full text-xl sm:h-16 sm:w-16 sm:text-xl"
                  />

                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      สวัสดี,
                    </p>

                    <h1 className="text-xl font-extrabold text-[#0e3b6c] sm:text-2xl">
                      {user?.full_name || "ผู้บริจาค"}
                    </h1>

                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <i className="fa-solid fa-location-dot text-xs text-[#ea384c]" />
                      {profile?.province || "ยังไม่ได้ระบุจังหวัด"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleReadinessToggle}
                    disabled={
                      (!profile?.is_ready && !canEnableReadiness) ||
                      isUpdatingReadiness
                    }
                    aria-pressed={Boolean(
                      profile?.is_ready && !recoveryStatus.isCoolingDown,
                    )}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                      profile?.is_ready && !recoveryStatus.isCoolingDown
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50"
                    } ${
                      recoveryStatus.isCoolingDown
                        ? "cursor-not-allowed opacity-70"
                        : "transition hover:border-[#65a1f2]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`relative h-7 w-12 shrink-0 rounded-full ring-1 ring-inset ring-black/10 transition-colors after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow-md after:ring-1 after:ring-black/5 after:transition-transform ${
                        profile?.is_ready && !recoveryStatus.isCoolingDown
                          ? "bg-emerald-500 after:translate-x-5"
                          : "bg-slate-300"
                      }`}
                    />
                    <span>
                      <span className="block text-sm font-bold text-slate-700">
                        พร้อมบริจาค
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {recoveryStatus.isCoolingDown
                          ? `พักฟื้นอีก ${recoveryStatus.daysRemaining} วัน`
                          : profile?.is_ready
                            ? "พร้อมรับแจ้งเตือนคำร้องขอบริจาค"
                            : "ไม่พร้อมรับแจ้งเตือนคำร้องขอบริจาค"}
                      </span>
                    </span>
                    <span className="sr-only">
                      {recoveryStatus.isCoolingDown
                        ? "เว้นระยะอย่างน้อย 90 วันหลังบริจาค"
                        : "กดเพื่อเปลี่ยนสถานะพร้อมบริจาค"}
                    </span>
                  </button>

                  {readinessError && (
                    <p role="alert" className="text-sm text-red-600">
                      {readinessError}
                    </p>
                  )}

                  <Link
                    href="/Notifications"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0e3b6c] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ea384c]"
                  >
                    <i className="fa-solid fa-bell" />
                    ดูเคสที่ตรงกับคุณ
                  </Link>
                </div>
              </section>

              {!canEnableReadiness && (
                <div
                  role="alert"
                  className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800"
                >
                  <p className="flex items-start gap-2 font-bold">
                    <i className="fa-solid fa-triangle-exclamation mt-0.5" />
                    <span>
                      {eligibilityReasons.length > 0
                        ? eligibilityReasons.join(" ")
                        : PARENT_CONSENT_MESSAGE}
                    </span>
                  </p>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <section className="overflow-hidden rounded-3xl border border-blue-200 bg-blue-50 shadow-sm">
                    <div className="border-b border-blue-100 bg-white/70 px-5 py-4 sm:px-6">
                      <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#0e3b6c]">
                        <i className="fa-solid fa-heart-pulse text-[#ea384c]" />
                        ภารกิจปัจจุบันของคุณ
                      </h2>
                    </div>

                    {activeRequest ? (
                      <div className="p-5 sm:p-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <UrgencyBadge urgency={activeRequest.urgency_level} />

                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                            ตอบรับแล้ว
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800">
                          {activeRequest.hospitals?.name || "โรงพยาบาล"}
                        </h3>

                        <p className="mt-1 text-sm text-slate-600">
                          {activeRequest.purpose || "ไม่ระบุวัตถุประสงค์"}
                        </p>

                        <div className="mt-5 grid gap-3 rounded-2xl border border-blue-100 bg-white p-4 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-bold text-slate-400">
                              กรุ๊ปเลือดที่ต้องการ
                            </p>

                            <p className="mt-1 font-bold text-[#0e3b6c]">
                              {activeRequest.blood_type}
                              {normalizeRh(activeRequest.rh_factor)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-400">
                              ต้องการภายใน
                            </p>

                            <p className="mt-1 font-bold text-slate-700">
                              {activeRequest.target_date
                                ? formatDate(activeRequest.target_date)
                                : "ไม่ระบุ"}
                            </p>
                          </div>
                        </div>

                        {missionError && (
                          <p className="mt-3 text-sm text-red-600">
                            {missionError}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={handleCancelMission}
                          disabled={isCancellingMission}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <i className="fa-solid fa-xmark" />

                          {isCancellingMission
                            ? "กำลังยกเลิก..."
                            : "ยกเลิกการตอบรับ"}
                        </button>
                      </div>
                    ) : (
                      <div className="p-8 text-center sm:p-10">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#65a1f2] shadow-sm">
                          <i className="fa-solid fa-hand-holding-heart" />
                        </div>

                        <h3 className="mt-4 font-bold text-slate-800">
                          ยังไม่มีภารกิจที่ตอบรับอยู่
                        </h3>

                        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                          เมื่อคุณตอบรับเคสขอเลือด
                          รายละเอียดภารกิจจะแสดงในส่วนนี้
                        </p>
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-extrabold text-[#0e3b6c]">
                          เคสด่วนที่ตรงกับโปรไฟล์คุณ
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          เคสกรุ๊ปเลือด {bloodGroup} ในจังหวัดของคุณ
                        </p>
                      </div>

                      <Link
                        href="/Notifications"
                        className="text-sm font-bold text-[#126fd1] hover:underline"
                      >
                        ดูทั้งหมด
                      </Link>
                    </div>

                    <div className="space-y-3">
                      {canReceiveRequests && matchedRequests.length > 0 ? (
                        matchedRequests.map((request) => (
                          <article
                            key={request.request_id}
                            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#65a1f2] sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-4">
                              <BloodBadge
                                bloodType={`${request.blood_type}${
                                  normalizeRh(request.rh_factor) ?? ""
                                }`}
                                className="h-12 w-12 rounded-xl text-base sm:h-12 sm:w-12 sm:text-base"
                              />

                              <div>
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <UrgencyBadge
                                    urgency={request.urgency_level}
                                    className="px-2 py-0.5 text-[10px]"
                                  />

                                  <h3 className="font-bold text-slate-800">
                                    {request.hospitals?.name || "โรงพยาบาล"}
                                  </h3>
                                </div>

                                <p className="text-sm text-slate-500">
                                  {request.purpose || "ไม่ระบุวัตถุประสงค์"} ·
                                  ต้องการ {request.units_needed} ยูนิต
                                </p>
                              </div>
                            </div>

                            <Link
                              href="/Notifications"
                              className="shrink-0 rounded-xl border border-[#126fd1] px-4 py-2.5 text-center text-sm font-bold text-[#126fd1] transition hover:bg-[#126fd1] hover:text-white"
                            >
                              ดูรายละเอียด
                            </Link>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                          {canReceiveRequests
                            ? "ยังไม่มีเคสเปิดที่ตรงกับโปรไฟล์ของคุณในขณะนี้"
                            : canEnableReadiness
                              ? "เปิดสถานะพร้อมบริจาคเพื่อดูเคสที่ตรงกับโปรไฟล์ของคุณ"
                              : "ขณะนี้ยังไม่สามารถรับเคสบริจาคได้"}
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <div
                    className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                      recoveryStatus.isCoolingDown
                        ? "bg-amber-50 text-amber-500"
                        : profile?.is_ready
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <i
                      className={`fa-solid ${
                        recoveryStatus.isCoolingDown
                          ? "fa-hourglass-half"
                          : profile?.is_ready
                            ? "fa-circle-check"
                            : "fa-circle-pause"
                      } text-2xl`}
                    />
                  </div>

                  <h2 className="mt-4 text-lg font-extrabold text-slate-800">
                    {recoveryStatus.isCoolingDown
                      ? "อยู่ในระยะพักฟื้นร่างกาย"
                      : profile?.is_ready
                        ? "คุณพร้อมช่วยเหลือแล้ว"
                        : "สถานะการรับแจ้งเตือนถูกปิด"}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {recoveryStatus.isCoolingDown
                      ? `เพื่อสุขภาพที่ดีของคุณ กรุณาเว้นระยะ 90 วัน (พร้อมอีกครั้ง ${
                          recoveryStatus.nextDonationDate
                            ? formatDate(
                                recoveryStatus.nextDonationDate.toISOString(),
                              )
                            : "-"
                        })`
                      : profile?.is_ready
                        ? "คุณจะเห็นเคสเปิดที่ตรงกับกรุ๊ปเลือดและจังหวัดของคุณ"
                        : "เปิดการรับแจ้งเตือนจากหน้าโปรไฟล์ เมื่อคุณพร้อมรับเคสใหม่"}
                  </p>

                  {recoveryStatus.isCoolingDown && (
                    <div className="mt-5 text-left">
                      <div className="mb-2 flex justify-between text-xs font-bold text-slate-400">
                        <span>บริจาคล่าสุด</span>
                        <span>ครบ 90 วัน</span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{
                            width: `${recoveryStatus.progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-left">
                    <p className="text-xs font-bold text-slate-400">
                      ข้อมูลสำหรับการจับคู่
                    </p>

                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">กรุ๊ปเลือด</dt>

                        <dd className="font-bold text-[#0e3b6c]">
                          {bloodGroup}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">จังหวัด</dt>

                        <dd className="text-right font-bold text-slate-700">
                          {profile?.province || "-"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </aside>
              </div>
            </>
          )}

          <div className="mt-10 sm:mt-12">
            <Footer />
          </div>
        </div>
      </main>
    </div>
  );
}
