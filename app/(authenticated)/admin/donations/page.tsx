"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BloodBadge from "@/components/BloodBadge";
import AdminSidebar from "@/components/layout/AdminSidebar";

interface DonationItem {
  record_id: string;
  donation_date: string;
  status: "ACCEPTED" | "COMPLETED" | "CANCELLED";
  volume_ml: number | null;
  consent_accepted: boolean;
  consent_document_url?: string | null;
  notes?: string | null;
  donor: {
    donor_id: string;
    full_name: string;
    blood_type: string;
    rh_factor: string;
    phone: string;
  };
  request: {
    request_id: string;
    purpose: string;
    urgency_level: string;
    units_needed: number;
  };
}

const getConsentFileUrl = (fileNameOrUrl?: string | null) => {
  if (!fileNameOrUrl) return null;
  const trimmed = fileNameOrUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://fenjrceijhbizaigvqef.supabase.co";

  const cleanPath = trimmed.replace(/^\/+/, "");
  if (cleanPath.startsWith("consent-documents/")) {
    return `${supabaseUrl}/storage/v1/object/public/${cleanPath}`;
  }
  return `${supabaseUrl}/storage/v1/object/public/consent-documents/${cleanPath}`;
};

export default function AdminDonationsPage() {
  const router = useRouter();
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [hospitalName, setHospitalName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [selectedDonation, setSelectedDonation] = useState<DonationItem | null>(null);

  // ควบคุม Modals ต่างๆ
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const [volumeMl, setVolumeMl] = useState<number>(450);
  const [rejectReasonType, setRejectReasonType] = useState("เอกสารยินยอมไม่ถูกต้องหรือไม่สมบูรณ์");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  // ล็อคไม่ให้เลื่อนหน้าจอพื้นหลังขณะเปิด Modal ตัวใดตัวหนึ่ง
  useEffect(() => {
    const isAnyModalOpen =
      isActionModalOpen ||
      isConfirmModalOpen ||
      isConsentModalOpen ||
      isRejectModalOpen;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isActionModalOpen, isConfirmModalOpen, isConsentModalOpen, isRejectModalOpen]);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      setFetchError("");
      const res = await fetch("/api/admin/donations", { credentials: "include" });

      if (res.status === 401 || res.status === 403) {
        router.replace("/login");
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("ระบบปลายทางส่งข้อมูลกลับมาไม่ถูกต้อง");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ไม่สามารถโหลดข้อมูลได้");
      setDonations(data.donations || []);
      setHospitalName(data.name || "");
    } catch (err) {
      console.error("Fetch donations error:", err);
      setFetchError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  // เปิด Modal เลือกการกระทำ
  const handleOpenAction = (donation: DonationItem) => {
    setSelectedDonation(donation);
    setActionError("");
    setIsActionModalOpen(true);
  };

  // ย้ายจาก Action Modal ไปหน้าบันทึกผล
  const handleGoToComplete = () => {
    setIsActionModalOpen(false);
    setVolumeMl(450);
    setIsConfirmModalOpen(true);
  };

  // ย้ายจาก Action Modal ไปหน้าปฏิเสธ
  const handleGoToReject = () => {
    setIsActionModalOpen(false);
    setRejectReasonType("เอกสารยินยอมไม่ถูกต้องหรือไม่สมบูรณ์");
    setCustomRejectReason("");
    setIsRejectModalOpen(true);
  };

  const handleOpenConsent = (donation: DonationItem) => {
    setSelectedDonation(donation);
    setIsConsentModalOpen(true);
  };

  // ส่งบันทึกการบริจาค
  const handleConfirmCompletion = async () => {
    if (!selectedDonation || isSubmitting) return;

    setIsSubmitting(true);
    setActionError("");

    try {
      const res = await fetch(`/api/admin/donations/${selectedDonation.record_id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ volume_ml: Number(volumeMl) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึก");

      setIsConfirmModalOpen(false);
      setSelectedDonation(null);
      await fetchDonations();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ส่งปฏิเสธและเก็บลง notes
  const handleConfirmReject = async () => {
    if (!selectedDonation || isSubmitting) return;

    const finalReason =
      rejectReasonType === "OTHER"
        ? customRejectReason.trim()
        : rejectReasonType;

    if (!finalReason) {
      setActionError("กรุณาระบุเหตุผลการปฏิเสธ");
      return;
    }

    setIsSubmitting(true);
    setActionError("");

    try {
      const res = await fetch(`/api/admin/donations/${selectedDonation.record_id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: finalReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการปฏิเสธคำขอ");

      setIsRejectModalOpen(false);
      setSelectedDonation(null);
      await fetchDonations();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = donations.filter((d) => d.status === "ACCEPTED").length;
  const completedCount = donations.filter((d) => d.status === "COMPLETED").length;

  return (
    <AdminSidebar userName="Admin">
      <div className="w-full space-y-6">
        
        {/* Header สรุปข้อมูล */}
        <header className="rounded-3xl border border-[#dee8f3] bg-white p-5 sm:p-6 md:p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              {hospitalName && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-[#126fd1]">
                  <i className="fa-solid fa-hospital text-sm" />
                  <span>{hospitalName}</span>
                </div>
              )}
              <h1 className="text-xl font-black tracking-tight text-[#0e3b6c] sm:text-2xl md:text-3xl">
                จัดการการตอบรับและบันทึกการบริจาค
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                ตรวจสอบรายชื่อผู้บริจาค ใบยินยอม และบันทึกปริมาณโลหิตเข้าสู่คลัง
              </p>
            </div>

            {/* การ์ดสถิติ */}
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3 sm:p-4 text-center sm:min-w-[120px]">
                <span className="block text-xl sm:text-2xl font-black text-amber-700">{pendingCount}</span>
                <span className="text-[11px] sm:text-xs font-semibold text-amber-900/70">รอเข้ารับการบริจาค</span>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 sm:p-4 text-center sm:min-w-[120px]">
                <span className="block text-xl sm:text-2xl font-black text-emerald-700">{completedCount}</span>
                <span className="text-[11px] sm:text-xs font-semibold text-emerald-900/70">บริจาคสำเร็จแล้ว</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-[#dee8f3] bg-white shadow-sm">
            <div className="text-center">
              <div className="inline-block size-8 animate-spin rounded-full border-4 border-[#126fd1] border-t-transparent" />
              <p className="mt-3 text-sm font-semibold text-slate-500">กำลังโหลดรายการ...</p>
            </div>
          </div>
        ) : fetchError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700 shadow-sm">
            <p className="text-base font-bold">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
            <p className="mt-1 text-slate-600">{fetchError}</p>
            <button
              type="button"
              onClick={fetchDonations}
              className="mt-4 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : donations.length === 0 ? (
          <div className="rounded-3xl border border-[#dee8f3] bg-white p-12 sm:p-16 text-center text-slate-500 shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <i className="fa-solid fa-inbox text-xl" />
            </div>
            <p className="mt-3 text-base font-bold text-slate-700">ไม่พบรายการตอบรับการบริจาค</p>
            <p className="mt-1 text-xs text-slate-400">เมื่อมีผู้บริจาคตอบรับคำขอ รายการจะปรากฏที่นี่</p>
          </div>
        ) : (
          <div>
            {/* โหมดแสดงผลบนมือถือ: Responsive Card Layout (ซ่อนบนจอ md ขึ้นไป) */}
            <div className="space-y-4 md:hidden">
              {donations.map((item) => {
                const bloodLabel = `${item.donor.blood_type || ""}${
                  item.donor.rh_factor === "Positive" || item.donor.rh_factor === "+" ? "+" : "-"
                }`;

                return (
                  <div key={item.record_id} className="rounded-3xl border border-[#dee8f3] bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <BloodBadge bloodType={bloodLabel} className="size-11 rounded-2xl text-xs shadow-sm shrink-0" />
                        <div>
                          <h3 className="font-bold text-[#0e3b6c]">{item.donor.full_name}</h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <i className="fa-solid fa-phone text-[10px]" />
                            <span>{item.donor.phone || "ไม่มีเบอร์โทรศัพท์"}</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* สถานะ badge บนมือถือ */}
                      <div>
                        {item.status === "COMPLETED" ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            สำเร็จ ({item.volume_ml ?? 450} มล.)
                          </span>
                        ) : item.status === "ACCEPTED" ? (
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200">
                            รอเข้ารับ
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 border border-red-200">
                            ยกเลิก
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3 text-xs space-y-1 border border-slate-100">
                      <p className="text-slate-700"><strong className="text-slate-900">วัตถุประสงค์:</strong> {item.request.purpose}</p>
                      <p className="text-slate-500">ระดับความเร่งด่วน: <span className="font-semibold text-slate-700">{item.request.urgency_level}</span></p>
                      {item.notes && (
                        <p className="text-red-500 font-medium pt-1 border-t border-slate-200">
                          หมายเหตุ: {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-2">
                      {item.consent_document_url ? (
                        <button
                          type="button"
                          onClick={() => handleOpenConsent(item)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#126fd1] hover:underline"
                        >
                          <i className="fa-solid fa-file-lines text-xs" />
                          <span>ดูเอกสารยินยอม</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">ไม่ต้องใช้ใบยินยอม</span>
                      )}

                      {item.status === "ACCEPTED" && (
                        <button
                          type="button"
                          onClick={() => handleOpenAction(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0e3b6c] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#126fd1]"
                        >
                          <i className="fa-solid fa-sliders text-xs" />
                          <span>จัดการ</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* โหมดแสดงผลบนเดสก์ท็อป: Data Table (ซ่อนบนจอเล็ก) */}
            <div className="hidden md:block overflow-hidden rounded-3xl border border-[#dee8f3] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#dee8f3] bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-6 py-4.5">ผู้บริจาค</th>
                      <th className="whitespace-nowrap px-6 py-4.5 text-center">กรุ๊ปเลือด</th>
                      <th className="px-6 py-4.5">วัตถุประสงค์การขอ</th>
                      <th className="whitespace-nowrap px-6 py-4.5">ใบยินยอม</th>
                      <th className="whitespace-nowrap px-6 py-4.5 text-center">สถานะ</th>
                      <th className="whitespace-nowrap px-6 py-4.5 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dee8f3]">
                    {donations.map((item) => {
                      const bloodLabel = `${item.donor.blood_type || ""}${
                        item.donor.rh_factor === "Positive" || item.donor.rh_factor === "+" ? "+" : "-"
                      }`;

                      return (
                        <tr key={item.record_id} className="transition-colors hover:bg-slate-50/70">
                          {/* ผู้บริจาค */}
                          <td className="whitespace-nowrap px-6 py-5">
                            <p className="text-base font-bold text-[#0e3b6c]">{item.donor.full_name}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                              <i className="fa-solid fa-phone text-[10px] text-slate-400" />
                              <span>{item.donor.phone || "ไม่มีเบอร์โทรศัพท์"}</span>
                            </p>
                          </td>

                          {/* กรุ๊ปเลือด */}
                          <td className="whitespace-nowrap px-6 py-5 text-center">
                            <div className="inline-flex justify-center">
                              <BloodBadge
                                bloodType={bloodLabel}
                                className="size-12 rounded-2xl text-sm shadow-sm"
                              />
                            </div>
                          </td>

                          {/* วัตถุประสงค์ */}
                          <td className="min-w-[240px] px-6 py-5">
                            <p className="line-clamp-1 font-semibold text-slate-800">{item.request.purpose}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                  item.request.urgency_level === "CRITICAL"
                                    ? "bg-red-100 text-red-700"
                                    : item.request.urgency_level === "URGENT"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                ระดับ: {item.request.urgency_level}
                              </span>
                            </div>
                          </td>

                          {/* ใบยินยอม */}
                          <td className="whitespace-nowrap px-6 py-5">
                            {item.consent_document_url ? (
                              <button
                                type="button"
                                onClick={() => handleOpenConsent(item)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-[#126fd1] transition hover:bg-blue-100"
                              >
                                <i className="fa-solid fa-file-lines text-xs" />
                                <span>ดูใบยินยอม</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                                <i className="fa-solid fa-check text-[10px] text-emerald-600" />
                                <span>ไม่ต้องใช้ใบยินยอม</span>
                              </span>
                            )}
                          </td>

                          {/* สถานะ */}
                          <td className="whitespace-nowrap px-6 py-5 text-center">
                            {item.status === "COMPLETED" ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                  <span className="size-1.5 rounded-full bg-emerald-500" />
                                  บริจาคสำเร็จ ({item.volume_ml ?? 450} มล.)
                                </span>
                                {item.notes && <span className="text-[11px] text-slate-400">{item.notes}</span>}
                              </div>
                            ) : item.status === "ACCEPTED" ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                                  <span className="size-1.5 animate-pulse rounded-full bg-blue-500" />
                                  รอเข้ารับการบริจาค
                                </span>
                                {item.notes && <span className="text-[11px] text-slate-400">{item.notes}</span>}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                                  <span className="size-1.5 rounded-full bg-red-500" />
                                  ยกเลิกแล้ว
                                </span>
                                {item.notes && (
                                  <span className="max-w-[150px] truncate text-[11px] font-medium text-red-500" title={item.notes}>
                                    {item.notes}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* การจัดการ (ปุ่มเดียวเปิด Modal) */}
                          <td className="whitespace-nowrap px-6 py-5 text-right">
                            {item.status === "ACCEPTED" ? (
                              <button
                                type="button"
                                onClick={() => handleOpenAction(item)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-[#0e3b6c] shadow-sm transition hover:bg-slate-50 hover:border-[#126fd1]"
                              >
                                <i className="fa-solid fa-sliders text-xs text-slate-400" />
                                <span>จัดการ</span>
                              </button>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL 1: เมนูเลือกการจัดการ (Action Menu Modal) ================= */}
      {isActionModalOpen && selectedDonation && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm select-none"
          aria-modal="true"
          role="dialog"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl select-text"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#0e3b6c]">
                จัดการรายการบริจาค
              </h3>
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              ผู้บริจาค: <strong className="text-slate-800">{selectedDonation.donor.full_name}</strong>
            </p>

            <div className="mt-5 space-y-2.5">
              {/* ตัวเลือก 1: บันทึกสำเร็จ */}
              <button
                type="button"
                onClick={handleGoToComplete}
                className="flex w-full items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-left transition hover:bg-emerald-100/70 group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <i className="fa-solid fa-check text-sm" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">บันทึกการบริจาคสำเร็จ</h4>
                    <p className="text-[11px] text-emerald-700/80">เจาะเก็บโลหิตเรียบร้อย นำเข้าคลัง</p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-emerald-600 transition group-hover:translate-x-0.5" />
              </button>

              {/* ตัวเลือก 2: ปฏิเสธรายการ */}
              <button
                type="button"
                onClick={handleGoToReject}
                className="flex w-full items-center justify-between rounded-2xl border border-red-100 bg-red-50/60 p-3.5 text-left transition hover:bg-red-100/70 group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
                    <i className="fa-solid fa-ban text-sm" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-red-950">ปฏิเสธรายการ / เอกสารไม่ผ่าน</h4>
                    <p className="text-[11px] text-red-700/80">เอกสารปลอมหรือไม่ผ่านเกณฑ์</p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-red-600 transition group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: บันทึกการบริจาคสำเร็จ ================= */}
      {isConfirmModalOpen && selectedDonation && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm select-none"
          aria-modal="true"
          role="dialog"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl select-text"
          >
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-square-check text-lg text-emerald-600" />
              <h3 className="text-base sm:text-lg font-bold text-[#0e3b6c]">
                บันทึกการรับบริจาคโลหิต
              </h3>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              ผู้บริจาค: <strong className="text-slate-800">{selectedDonation.donor.full_name}</strong>
            </p>

            <div className="mt-5">
              <label htmlFor="volume" className="block text-xs font-bold text-slate-700">
                ปริมาณโลหิตที่เจาะเก็บได้ (มิลลิลิตร)
              </label>
              <div className="relative mt-1.5">
                <input
                  id="volume"
                  type="number"
                  step="50"
                  value={volumeMl}
                  onChange={(e) => setVolumeMl(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#126fd1] focus:ring-2 focus:ring-blue-100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  มล. (ml)
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                * ค่ามาตรฐานทั่วไปคือ 350 หรือ 450 มิลลิลิตร
              </p>
            </div>

            {actionError && (
              <p className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs text-red-600">{actionError}</p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmCompletion}
                disabled={isSubmitting}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSubmitting ? "กำลังบันทึก..." : "ยืนยันและบันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: ปฏิเสธคำขอและลง Notes ================= */}
      {isRejectModalOpen && selectedDonation && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm select-none"
          aria-modal="true"
          role="dialog"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl select-text"
          >
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <i className="fa-solid fa-triangle-exclamation text-base" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#0e3b6c]">
                ปฏิเสธการตอบรับบริจาค
              </h3>
            </div>

            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              ผู้บริจาค: <strong className="text-slate-800">{selectedDonation.donor.full_name}</strong>
            </p>

            <div className="mt-4 space-y-2">
              <label htmlFor="reason" className="block text-xs font-bold text-slate-700">
                เลือกเหตุผลในการปฏิเสธ (บันทึกลงในช่องหมายเหตุ)
              </label>
              <select
                id="reason"
                value={rejectReasonType}
                onChange={(e) => setRejectReasonType(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="เอกสารยินยอมไม่ถูกต้องหรือไม่สมบูรณ์">เอกสารยินยอมไม่ถูกต้องหรือไม่สมบูรณ์</option>
                <option value="สงสัยว่าเป็นเอกสารปลอมแปลงหรือไม่ตรงกับตัวจริง">สงสัยว่าเป็นเอกสารปลอมแปลงหรือไม่ตรงกับตัวจริง</option>
                <option value="สุขภาพผู้บริจาคไม่ผ่านเกณฑ์เบื้องต้น">สุขภาพผู้บริจาคไม่ผ่านเกณฑ์เบื้องต้น</option>
                <option value="ผู้บริจาคไม่มาตามวันเวลานัดหมาย">ผู้บริจาคไม่มาตามวันเวลานัดหมาย</option>
                <option value="OTHER">อื่นๆ (พิมพ์ระบุเอง)</option>
              </select>

              {rejectReasonType === "OTHER" && (
                <textarea
                  rows={3}
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  placeholder="กรอกรายละเอียดเหตุผลเพิ่มเติม..."
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              )}
            </div>

            {actionError && (
              <p className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs text-red-600">{actionError}</p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsRejectModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmReject}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
              >
                {isSubmitting ? "กำลังปฏิเสธ..." : "ยืนยันการปฏิเสธ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: ตรวจดูใบยินยอม ================= */}
      {isConsentModalOpen && selectedDonation && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm select-none"
          aria-modal="true"
          role="dialog"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl select-text"
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-file-contract text-base text-[#126fd1]" />
                <h3 className="text-base font-bold text-[#0e3b6c]">
                  เอกสารยินยอมจากผู้ปกครอง
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConsentModalOpen(false)}
                className="flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                <p><strong>ผู้บริจาค:</strong> {selectedDonation.donor.full_name}</p>
                <p className="mt-1">
                  <strong>หมู่โลหิต:</strong> {selectedDonation.donor.blood_type}{" "}
                  {selectedDonation.donor.rh_factor}
                </p>
              </div>

              {selectedDonation.consent_document_url ? (
                <div className="pt-1">
                  <a
                    href={getConsentFileUrl(selectedDonation.consent_document_url) || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#126fd1] px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[#0e5bb0]"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                    <span>เปิดดูเอกสารแนบ (คลิกเพื่อดูไฟล์เต็ม)</span>
                  </a>
                </div>
              ) : (
                <p className="py-3 text-center text-xs italic text-slate-400">
                  ผู้บริจาครายนี้ไม่อยู่ในเกณฑ์ที่ต้องแนบเอกสารยินยอม
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsConsentModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminSidebar>
  );
}