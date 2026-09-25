"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { BloodRequest } from "@/types/database";
import BloodBadge from "@/components/BloodBadge";
import UrgencyBadge from "@/components/UrgencyBadge";

interface RequestFeedCardProps {
  request: BloodRequest;
}

export default function RequestFeedCard({
  request,
}: RequestFeedCardProps) {
  const router = useRouter();

  const [showDetail, setShowDetail] =
    useState(false);

  const [showDonatePopup, setShowDonatePopup] =
    useState(false);

  const [isDonating, setIsDonating] =
    useState(false);

  const [donateError, setDonateError] =
    useState("");

  // =========================================
  // Blood Type
  // =========================================
  const isNegative =
    request.rh_factor === "Negative" ||
    request.rh_factor === "-";

  const sign = isNegative ? "-" : "+";
  const bloodGroup =
    `${request.blood_type}${sign}`;

  // =========================================
  // Donation Progress
  // =========================================
  const pledgedUnits = (
    request.donation_records || []
  ).filter(
    (record) =>
      record.status === "ACCEPTED" ||
      record.status === "COMPLETED"
  ).length;

  const remainingUnits =
    request.units_needed - pledgedUnits;

  const percent =
    request.units_needed > 0
      ? Math.min(
          100,
          Math.round(
            (pledgedUnits /
              request.units_needed) *
              100
          )
        )
      : 0;

  // =========================================
  // Target Date
  // =========================================
  const targetDate = request.target_date
    ? new Date(
        request.target_date
      ).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "ไม่ระบุ";

  // =========================================
  // Open Donate Popup
  // =========================================
  const openDonatePopup = () => {
    setDonateError("");
    setShowDonatePopup(true);
  };

  // =========================================
  // Close Donate Popup
  // =========================================
  const closeDonatePopup = () => {
    if (isDonating) return;

    setShowDonatePopup(false);
    setDonateError("");
  };

  // =========================================
  // Confirm Donate
  // =========================================
  const handleDonate = async () => {
    if (isDonating || remainingUnits <= 0) return;
  
    setIsDonating(true);
    setDonateError("");
  
    try {
      console.log("===== START DONATE =====");
      console.log("REQUEST ID:", request.request_id);
  
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          request_id: request.request_id,
        }),
      });
  
      console.log("API STATUS:", response.status);
  
      const contentType =
        response.headers.get("content-type") || "";
  
      let data: { error?: string; details?: string; code?: string; hint?: string } | null = null;
  
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const responseText = await response.text();
  
        console.error(
          "API RETURNED NON-JSON:",
          responseText
        );
  
        throw new Error(
          `API Error (${response.status})`
        );
      }
  
      console.log("API RESPONSE:", data);
  
      // =========================================
      // API Error
      // =========================================
      if (!response.ok) {
        console.error(
          "DONATION API ERROR:",
          data
        );
  
        const errorMessage = [
          data?.error,
          data?.details,
          data?.code,
          data?.hint,
        ]
          .filter(Boolean)
          .join(" | ");
  
        throw new Error(
          errorMessage ||
            "ไม่สามารถตอบรับการบริจาคได้"
        );
      }
  
      // =========================================
      // Success
      // =========================================
      console.log(
        "DONATION SUCCESS:",
        data
      );
  
      setShowDonatePopup(false);
  
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(
        "DONATE ERROR:",
        error
      );
  
      setDonateError(
        error instanceof Error
          ? error.message
          : "ไม่สามารถตอบรับการบริจาคได้"
      );
    } finally {
      setIsDonating(false);
    }
  };

  return (
    <>
      {/* ==================================================
          REQUEST CARD
      ================================================== */}
      <article className="bg-slate-50 rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-sm hover:border-[#ea384c] transition flex flex-col justify-between">
        <div>
          {/* =========================================
              Urgency
          ========================================= */}
          <div className="flex items-center justify-between mb-4">
            <UrgencyBadge
              urgency={
                request.urgency_level
              }
            />
          </div>

          {/* =========================================
              Hospital + Blood Group
          ========================================= */}
          <div className="flex items-start gap-4 mb-5">
            <BloodBadge
              bloodType={bloodGroup}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-2xl sm:text-3xl bg-[#0e3b6c] text-white border-0 shadow-md"
            />

            <div>
              <h3 className="text-base font-bold text-[#0e3b6c] leading-snug">
                {request.hospitals?.name ||
                  "โรงพยาบาล"}
              </h3>

              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <i className="fa-solid fa-location-dot text-xs text-[#dc2626]" />

                {request.hospitals?.province ||
                  "ไม่ระบุจังหวัด"}
              </p>
            </div>
          </div>

          {/* =========================================
              Request Information
          ========================================= */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-5 space-y-2 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">
                วัตถุประสงค์:
              </span>

              <span className="font-bold text-[#0e3b6c] text-right">
                {request.purpose ||
                  "ไม่ระบุ"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">
                ความต้องการ:
              </span>

              <span className="font-bold text-[#ea384c]">
                {request.units_needed} ยูนิต
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">
                ต้องการภายใน:
              </span>

              <span className="font-bold text-[#0e3b6c]">
                {targetDate}
              </span>
            </div>
          </div>

          {/* =========================================
              Progress
          ========================================= */}
          <div className="space-y-1.5 mb-6">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-500">
                ตอบรับแล้ว{" "}
                {pledgedUnits}/
                {request.units_needed} ยูนิต
              </span>

              <span
                className={
                  remainingUnits > 0
                    ? "text-[#dc2626] font-bold"
                    : "text-emerald-600 font-bold"
                }
              >
                {remainingUnits > 0
                  ? `ขาดอีก ${remainingUnits} ยูนิต`
                  : "ครบจำนวนแล้ว"}
              </span>
            </div>

            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#65a1f2] rounded-full transition-all duration-300"
                style={{
                  width: `${percent}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* =========================================
            BUTTONS
        ========================================= */}
        <div className="grid grid-cols-2 gap-3">
          {/* View Detail */}
          <button
            type="button"
            onClick={() =>
              setShowDetail(true)
            }
            className="
              py-3.5
              bg-white
              border-2
              border-[#0e3b6c]
              text-[#0e3b6c]
              hover:bg-[#0e3b6c]
              hover:text-white
              text-sm
              font-bold
              rounded-xl
              transition
              duration-150
              flex
              items-center
              justify-center
              gap-2
            "
          >
            <i className="fa-solid fa-eye text-xs" />

            <span>
              ดูรายละเอียด
            </span>
          </button>

          {/* Donate */}
          <button
            type="button"
            onClick={openDonatePopup}
            disabled={
              remainingUnits <= 0
            }
            className="
              py-3.5
              bg-[#0e3b6c]
              hover:bg-[#ea384c]
              disabled:bg-slate-300
              disabled:cursor-not-allowed
              text-white
              text-sm
              font-bold
              rounded-xl
              transition
              duration-150
              flex
              items-center
              justify-center
              gap-2
            "
          >
            {remainingUnits <= 0 ? (
              <>
                <i className="fa-solid fa-check text-xs" />

                <span>
                  ครบจำนวนแล้ว
                </span>
              </>
            ) : (
              <>
                <span>
                  ตอบรับบริจาค
                </span>

                <i className="fa-solid fa-arrow-right text-xs" />
              </>
            )}
          </button>
        </div>
      </article>

      {/* ==================================================
          VIEW DETAIL POPUP
      ================================================== */}
      {showDetail && (
        <div
          className="
            fixed
            inset-0
            z-[90]
            flex
            items-center
            justify-center
            bg-black/50
            backdrop-blur-sm
            p-4
          "
          onClick={() =>
            setShowDetail(false)
          }
        >
          <div
            className="
              w-full
              max-w-lg
              max-h-[90vh]
              overflow-y-auto
              rounded-3xl
              bg-white
              shadow-2xl
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* Header */}
            <div className="bg-[#0e3b6c] px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">
                    รายละเอียดคำขอบริจาค
                  </h2>

                  <p className="text-xs text-white/80 mt-1">
                    ข้อมูลการขอรับบริจาคโลหิต
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowDetail(false)
                  }
                  className="
                    w-9
                    h-9
                    rounded-full
                    bg-white/10
                    hover:bg-white/20
                    flex
                    items-center
                    justify-center
                    transition
                  "
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            {/* Detail */}
            <div className="p-6 space-y-4">
              {/* Blood */}
              <div className="flex items-center gap-4">
                <BloodBadge
                  bloodType={bloodGroup}
                  className="w-16 h-16 rounded-2xl text-2xl bg-[#0e3b6c] text-white border-0 shadow-md"
                />

                <div>
                  <p className="text-xs text-slate-500">
                    กรุ๊ปเลือดที่ต้องการ
                  </p>

                  <p className="text-2xl font-bold text-[#ea384c]">
                    {bloodGroup}
                  </p>
                </div>
              </div>

              {/* Hospital */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs text-slate-500 mb-1">
                  โรงพยาบาล
                </p>

                <p className="font-bold text-[#0e3b6c]">
                  {request.hospitals?.name ||
                    "ไม่ระบุ"}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  <i className="fa-solid fa-location-dot mr-1 text-[#dc2626]" />

                  {request.hospitals?.province ||
                    "ไม่ระบุจังหวัด"}
                </p>
              </div>

              {/* Purpose */}
              <div>
                <p className="text-xs text-slate-500 mb-1">
                  วัตถุประสงค์
                </p>

                <p className="text-sm font-semibold text-slate-700">
                  {request.purpose ||
                    "ไม่ระบุ"}
                </p>
              </div>

              {/* Units */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
                  <p className="text-xs text-slate-500">
                    ต้องการทั้งหมด
                  </p>

                  <p className="text-xl font-bold text-[#ea384c] mt-1">
                    {request.units_needed}
                  </p>

                  <p className="text-xs text-slate-500">
                    ยูนิต
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                  <p className="text-xs text-slate-500">
                    ยังขาด
                  </p>

                  <p className="text-xl font-bold text-[#0e3b6c] mt-1">
                    {Math.max(
                      remainingUnits,
                      0
                    )}
                  </p>

                  <p className="text-xs text-slate-500">
                    ยูนิต
                  </p>
                </div>
              </div>

              {/* Target Date */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs text-slate-500">
                  ต้องการภายใน
                </p>

                <p className="font-bold text-[#0e3b6c] mt-1">
                  {targetDate}
                </p>
              </div>

              {/* Urgency */}
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  ระดับความเร่งด่วน
                </p>

                <UrgencyBadge
                  urgency={
                    request.urgency_level
                  }
                />
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={() =>
                  setShowDetail(false)
                }
                className="
                  w-full
                  py-3
                  rounded-xl
                  bg-[#0e3b6c]
                  hover:bg-[#ea384c]
                  text-white
                  text-sm
                  font-bold
                  transition
                "
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          DONATE CONFIRMATION POPUP
      ================================================== */}
      {showDonatePopup && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/50
            backdrop-blur-sm
            p-4
          "
          onClick={closeDonatePopup}
        >
          <div
            className="
              w-full
              max-w-md
              rounded-3xl
              bg-white
              shadow-2xl
              overflow-hidden
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* Header */}
            <div className="bg-[#0e3b6c] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
                  <i className="fa-solid fa-hand-holding-droplet text-lg" />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    ยืนยันการตอบรับ
                  </h2>

                  <p className="text-xs text-white/80 mt-0.5">
                    กรุณาตรวจสอบข้อมูลก่อนยืนยัน
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                คุณต้องการตอบรับการบริจาค
                สำหรับเคสนี้ใช่หรือไม่?
              </p>

              {/* Request Info */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    โรงพยาบาล
                  </span>

                  <span className="text-sm font-bold text-[#0e3b6c] text-right">
                    {request.hospitals?.name ||
                      "ไม่ระบุ"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    จังหวัด
                  </span>

                  <span className="text-sm font-bold text-[#0e3b6c]">
                    {request.hospitals?.province ||
                      "ไม่ระบุ"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    กรุ๊ปเลือด
                  </span>

                  <span className="text-sm font-bold text-[#ea384c]">
                    {bloodGroup}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    จำนวนที่ยังขาด
                  </span>

                  <span className="text-sm font-bold text-[#ea384c]">
                    {Math.max(
                      remainingUnits,
                      0
                    )}{" "}
                    ยูนิต
                  </span>
                </div>
              </div>

              {/* Warning */}
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5" />

                  <p className="text-xs text-amber-700 leading-relaxed">
                    เมื่อยืนยันแล้ว
                    ระบบจะบันทึกการตอบรับเคสนี้
                    และนำคุณไปยังหน้า Dashboard
                  </p>
                </div>
              </div>

              {/* Error */}
              {donateError && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5" />

                    <p className="text-xs text-red-600 font-medium">
                      {donateError}
                    </p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                {/* Cancel */}
                <button
                  type="button"
                  onClick={closeDonatePopup}
                  disabled={isDonating}
                  className="
                    flex-1
                    py-3
                    rounded-xl
                    border
                    border-slate-300
                    text-slate-600
                    text-sm
                    font-bold
                    hover:bg-slate-50
                    disabled:opacity-50
                    transition
                  "
                >
                  ยกเลิก
                </button>

                {/* Confirm */}
                <button
                  type="button"
                  onClick={handleDonate}
                  disabled={isDonating}
                  className="
                    flex-1
                    py-3
                    rounded-xl
                    bg-[#ea384c]
                    hover:bg-[#d92f42]
                    text-white
                    text-sm
                    font-bold
                    disabled:bg-slate-300
                    disabled:cursor-not-allowed
                    transition
                    flex
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  {isDonating ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-xs" />
                      <span>
                        กำลังตอบรับ...
                      </span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs" />
                      <span>
                        ยืนยันการตอบรับ
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
