"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";

export interface HospitalData {
  hospital_id: string;
  name: string;
  province: string;
  address?: string | null;
  contact_phone?: string | null;
  contact_person?: string | null;
  operating_hours?: string | null;
}

export default function AdminHospitalPage() {
  const [hospital, setHospital] = useState<HospitalData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    address: "",
    contact_phone: "",
    contact_person: "",
    operating_hours: "",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchHospitalData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/hospital", { credentials: "include" });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "ไม่สามารถดึงข้อมูลโรงพยาบาลได้");
      }

      const data = await res.json();
      setHospital(data.hospital);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchHospitalData);
  }, []);

  const handleOpenModal = () => {
    if (hospital) {
      setFormData({
        address: hospital.address || "",
        contact_phone: hospital.contact_phone || "",
        contact_person: hospital.contact_person || "",
        operating_hours: hospital.operating_hours || "จันทร์ - ศุกร์ 08:30 - 16:30 น.",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital) return;

    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await fetch("/api/admin/hospital", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "บันทึกข้อมูลไม่สำเร็จ");

      setHospital(result.hospital);
      setIsModalOpen(false);
      setFeedback({ type: "success", message: "บันทึกข้อมูลโรงพยาบาลสำเร็จแล้ว" });
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminSidebar userName={hospital?.name ? `จนท. ${hospital.name}` : "Admin"}>
      <div className="space-y-6">
        {feedback && (
          <div
            className={`flex items-center justify-between rounded-2xl p-4 text-sm font-medium border shadow-sm ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <i
                className={`fa-solid ${
                  feedback.type === "success"
                    ? "fa-circle-check text-emerald-600"
                    : "fa-circle-exclamation text-red-600"
                }`}
              />
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

        {/* ส่วนหัวหน้า */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-3xl border border-[#dee8f3] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-[#126fd1] text-xl shadow-sm">
              <i className="fa-solid fa-hospital"></i>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0e3b6c] flex flex-wrap items-center gap-2">
                <span>โรงพยาบาลในความดูแลของฉัน</span>
                <span className="text-xs sm:text-sm font-normal text-slate-500">
                  (My Assigned Hospital)
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                ตรวจสอบและอัปเดตข้อมูลสถานที่ เบอร์ติดต่อตรง และเวลาทำการของสถานพยาบาล
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-2 text-xs font-bold text-[#126fd1]">
            <i className="fa-solid fa-shield-heart"></i>
            <span>ดูแล 1 แห่ง</span>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-[#dee8f3] bg-white text-slate-500 shadow-sm">
            <div className="text-center">
              <div className="inline-block size-8 animate-spin rounded-full border-4 border-[#126fd1] border-t-transparent" />
              <p className="mt-3 text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลโรงพยาบาล...</p>
            </div>
          </div>
        ) : error || !hospital ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
            <i className="fa-solid fa-circle-exclamation text-3xl mb-2 text-red-500" />
            <p className="font-bold text-base">เกิดข้อผิดพลาด</p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">{error || "ไม่พบข้อมูลโรงพยาบาลที่คุณสังกัด"}</p>
            <button
              type="button"
              onClick={fetchHospitalData}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-red-700"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : (
          /* กล่องแสดงข้อมูลโรงพยาบาล */
          <div className="relative overflow-hidden rounded-3xl border border-[#dee8f3] bg-white p-6 sm:p-8 shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ea384c]"></div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pt-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{hospital.name}</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  รหัสอ้างอิง: <span className="font-semibold text-slate-700 font-mono">#{hospital.hospital_id}</span> · จังหวัด {hospital.province}
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                พร้อมรับบริจาคปกติ
              </span>
            </div>

            {/* ที่อยู่ */}
            <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5">
              <p className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-500">
                <i className="fa-solid fa-location-dot text-[#ea384c]"></i> 
                <span>ที่อยู่แบบละเอียด</span>
              </p>
              <p className="whitespace-pre-line text-sm font-medium text-slate-800">
                {hospital.address || "ยังไม่ได้ระบุที่อยู่"}
              </p>
            </div>

            <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#0e3b6c] p-5 text-white shadow-sm">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-200">
                  <i className="fa-solid fa-phone-volume text-blue-300"></i>
                  <span>เบอร์ฉุกเฉิน / คลังเลือด</span>
                </p>
                <p className="text-xl sm:text-2xl font-black tracking-wide font-mono">
                  {hospital.contact_phone || "ยังไม่ได้ระบุเบอร์โทร"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#dee8f3] bg-white p-5 shadow-sm">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                  <i className="fa-solid fa-user-tie text-slate-400"></i>
                  <span>ผู้ประสานงานหลัก</span>
                </p>
                <p className="text-base sm:text-lg font-bold text-slate-900">
                  {hospital.contact_person || "ไม่ระบุชื่อผู้ประสานงาน"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">เจ้าหน้าที่ประจำสถานพยาบาล</p>
              </div>
            </div>

            {/* เวลาทำการ */}
            <div className="mb-8 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5">
              <p className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-500">
                <i className="fa-regular fa-clock text-[#126fd1]"></i>
                <span>เวลาทำการรับบริจาค</span>
              </p>
              <div className="text-sm font-semibold text-slate-800">
                {hospital.operating_hours || "จันทร์ - ศุกร์ 08:30 - 16:30 น."}
              </div>
            </div>

            {/* ปุ่มเปิด Modal แก้ไข */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleOpenModal}
                className="flex items-center gap-2 rounded-2xl bg-[#0e3b6c] px-6 py-3 text-xs sm:text-sm font-bold text-white transition hover:bg-[#126fd1] shadow-sm active:scale-95"
              >
                <i className="fa-solid fa-pen-to-square"></i>
                <span>แก้ไขข้อมูลโรงพยาบาล</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal แก้ไขข้อมูล */}
        {isModalOpen && hospital && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-[#126fd1]">
                    <i className="fa-solid fa-pen-to-square text-base"></i>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">แก้ไขข้อมูลโรงพยาบาล</h2>
                    <p className="text-xs text-slate-500">อัปเดตที่อยู่ เบอร์ติดต่อ และเวลาทำการ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              {/* ส่วนข้อมูลระบบที่ห้ามแก้ไข */}
              <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <i className="fa-solid fa-lock text-slate-400"></i> ข้อมูลที่ไม่สามารถแก้ไขได้
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-400">รหัสโรงพยาบาล</label>
                    <input type="text" disabled value={hospital.hospital_id} className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] font-semibold text-slate-400">ชื่อโรงพยาบาล</label>
                    <input type="text" disabled value={hospital.name} className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-500" />
                  </div>
                </div>
              </div>

              {/* ฟอร์มแก้ไข */}
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">ที่อยู่แบบละเอียด *</label>
                  <textarea
                    rows={3}
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-medium focus:border-[#126fd1] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">เบอร์โทรติดต่อตรง *</label>
                    <input
                      type="text"
                      required
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-medium focus:border-[#126fd1] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">ผู้ประสานงานหลัก</label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder="เช่น คุณวรรณา ใจมั่น"
                      className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-medium focus:border-[#126fd1] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">เวลาทำการรับบริจาค</label>
                  <input
                    type="text"
                    value={formData.operating_hours}
                    onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                    placeholder="เช่น จันทร์ - ศุกร์ 08:30 - 16:30 น."
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-medium focus:border-[#126fd1] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-[#0e3b6c] px-6 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-[#126fd1] shadow-sm disabled:opacity-50"
                  >
                    {submitting && <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>}
                    <i className="fa-solid fa-floppy-disk text-xs"></i> 
                    <span>บันทึกการเปลี่ยนแปลง</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminSidebar>
  );
}
