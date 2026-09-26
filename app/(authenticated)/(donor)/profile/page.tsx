"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DonorNavbar from "@/components/layout/DonorNavbar";
import DonorSideBar from "@/components/layout/DonorSideBar";
import Footer from "@/components/layout/Footer";
import ProvinceSelect from "@/components/profile/ProvinceSelect";
import {
  calculateAge,
  evaluateDonorEligibility,
} from "@/lib/donorEligibility";
import { bangkokToday } from "@/types/database";

const COMMON_CONDITIONS = [
  "เบาหวาน",
  "ความดันโลหิตสูง",
  "โรคหัวใจ",
  "โรคไต",
  "ธาลัสซีเมีย",
  "ไวรัสตับอักเสบ",
  "แพ้ยา",
];

const MAX_NOTES_LENGTH = 500;
const MAX_FILE_SIZE_MB = 5;

const INPUT_CLASS =
  "w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-[#0e3b6c] placeholder-slate-400 transition focus:border-[#65a1f2] focus:bg-white focus:outline-none";

// iOS Safari gives native date inputs an intrinsic min-width that overflows narrow screens.
const DATE_INPUT_CLASS = `${INPUT_CLASS} block min-h-11 min-w-0 max-w-full appearance-none [&::-webkit-date-and-time-value]:text-left`;

const LABEL_CLASS =
  "mb-1.5 flex items-center text-xs font-bold text-[#0e3b6c] sm:text-sm";

interface FormValues {
  phone: string;
  province: string;
  bloodType: string;
  rh: string;
  dateOfBirth: string;
  gender: string;
  weight: string;
  height: string;
  hasChronicDisease: boolean;
  medicalNotes: string;
  isReady: boolean;
  lastDonateDate: string;
}

interface DonorProfileDetails {
  blood_type: string | null;
  rh_factor: string | null;
  gender: string | null;
  date_of_birth: string | null;
  weight: number | null;
  height: number | null;
  province: string | null;
  is_ready: boolean | null;
  has_chronic_disease: boolean | null;
  medical_notes: string | null;
  last_donate_date: string | null;
  consent_form_url: string | null;
}

const normalizeRh = (rh?: string | null) => {
  const value = rh?.trim().toUpperCase();

  if (value === "+" || value?.startsWith("POS")) return "+";
  if (value === "-" || value?.startsWith("NEG")) return "-";

  return "";
};

const formatPhoneNumber = (value: string) => {
  const clean = value.replace(/\D/g, "");

  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;

  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
};

const BMI_LEVELS = [
  { max: 18.5, label: "น้ำหนักน้อย", className: "text-amber-600" },
  { max: 23, label: "ปกติ", className: "text-emerald-600" },
  { max: 25, label: "ท้วม", className: "text-amber-600" },
  { max: 30, label: "อ้วน", className: "text-orange-600" },
  { max: Infinity, label: "อ้วนมาก", className: "text-red-600" },
];

const calculateBmi = (weight: string, height: string) => {
  const kg = Number(weight);
  const cm = Number(height);

  if (!kg || !cm || cm < 100 || cm > 250) return null;

  const value = kg / (cm / 100) ** 2;

  return {
    value,
    level: BMI_LEVELS.find((level) => value < level.max)!,
  };
};

const splitNotes = (notes: string) =>
  notes
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

type BloodTestResult = "PENDING" | "PASSED" | "FAILED";

const BLOOD_TEST_OPTIONS: { value: BloodTestResult; label: string; className: string }[] = [
  { value: "PENDING", label: "รอผลตรวจ", className: "border-slate-200 bg-slate-50 text-slate-600" },
  { value: "PASSED", label: "ผ่าน (ผลเลือดปกติ)", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "FAILED", label: "ไม่ผ่าน", className: "border-red-200 bg-red-50 text-red-700" },
];

type Relation<T> = T | T[] | null | undefined;

interface DonationRecordRow {
  record_id: string;
  donation_date: string | null;
  volume_ml: number | null;
  status: string;
  blood_test_result: string | null;
  blood_requests?: Relation<{ hospitals?: Relation<{ name: string }> }>;
}

const firstOf = <T,>(value: Relation<T>) => (Array.isArray(value) ? value[0] : value ?? undefined);

const hospitalNameOf = (record: DonationRecordRow) =>
  firstOf(firstOf(record.blood_requests)?.hospitals)?.name ?? "ไม่ระบุสถานที่บริจาค";

const formatThaiDate = (date: string | null) =>
  date
    ? new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "ไม่ระบุวันที่";

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <h2 className="flex items-center rounded-t-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-[#0e3b6c]">
        <i className={`${icon} mr-3 text-slate-700`}></i>
        {title}
      </h2>

      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  activeClass,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeClass: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`relative inline-flex shrink-0 items-center ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />

      <div
        className={`relative h-7 w-12 rounded-full bg-slate-300 ${activeClass} ring-1 ring-inset ring-black/10 transition-colors after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow-md after:ring-1 after:ring-black/5 after:transition-transform after:content-[''] peer-checked:after:translate-x-5`}
      ></div>
    </label>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [account, setAccount] = useState<{
    fullName: string;
    userName: string;
  } | null>(null);

  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [rh, setRh] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("ชาย");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const [hasChronicDisease, setHasChronicDisease] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState("");

  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [consentFileError, setConsentFileError] = useState("");
  const [consentFormPath, setConsentFormPath] = useState("");

  const [isReady, setIsReady] = useState(true);
  const [lastDonateDate, setLastDonateDate] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [isUpdatingReadiness, setIsUpdatingReadiness] = useState(false);

  const [donations, setDonations] = useState<DonationRecordRow[]>([]);
  const [bloodTestStatus, setBloodTestStatus] = useState<
    Record<string, { state: "saving" | "saved" | "error"; message?: string }>
  >({});

  const today = bangkokToday();

  const bmi = calculateBmi(weight, height);

  const eligibility = evaluateDonorEligibility({
    weight: weight ? Number(weight) : null,
    date_of_birth: dateOfBirth || null,
    last_donate_date: lastDonateDate || null,
    is_ready: isReady,
    consent_form_url: consentFormPath || null,
  });

  const readinessEligibility = evaluateDonorEligibility({
    weight: weight ? Number(weight) : null,
    date_of_birth: dateOfBirth || null,
    last_donate_date: lastDonateDate || null,
    is_ready: true,
    consent_form_url: consentFormPath || null,
  });

  const { isCoolingDown, daysRemaining } = eligibility;

  const canCheckEligibility = Boolean(dateOfBirth && weight);

  const selectedConditions = splitNotes(medicalNotes);

  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  const currentValues: FormValues = {
    phone,
    province,
    bloodType,
    rh,
    dateOfBirth,
    gender,
    weight,
    height,
    hasChronicDisease,
    medicalNotes,
    isReady,
    lastDonateDate,
  };

  const isDirty =
    savedSnapshot !== null &&
    (JSON.stringify(currentValues) !== savedSnapshot || consentFile !== null);

  useEffect(() => {
    if (!isDirty) return;

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);

    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty]);

  const handleCancel = () => {
    if (
      isDirty &&
      !window.confirm("มีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?")
    ) {
      return;
    }

    router.push("/dashboard");
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/donor/profile/details", {
          credentials: "include",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้");
        }

        if (data.user) {
          setAccount({
            fullName: data.user.full_name,
            userName: data.user.user_name,
          });
        }

        const profile = data.profile as DonorProfileDetails | null;

        const loaded: FormValues = {
          phone: formatPhoneNumber(data.user?.phone ?? ""),
          province: profile?.province ?? "",
          bloodType: profile?.blood_type ?? "",
          rh: normalizeRh(profile?.rh_factor),
          dateOfBirth: profile?.date_of_birth ?? "",
          gender: profile?.gender === "หญิง" ? "หญิง" : "ชาย",
          weight: profile?.weight != null ? String(profile.weight) : "",
          height: profile?.height != null ? String(profile.height) : "",
          hasChronicDisease: Boolean(profile?.has_chronic_disease),
          medicalNotes: profile?.medical_notes ?? "",
          isReady: profile?.is_ready ?? true,
          lastDonateDate: profile?.last_donate_date ?? "",
        };

        setPhone(loaded.phone);
        setProvince(loaded.province);
        setBloodType(loaded.bloodType);
        setRh(loaded.rh);
        setDateOfBirth(loaded.dateOfBirth);
        setGender(loaded.gender);
        setWeight(loaded.weight);
        setHeight(loaded.height);
        setHasChronicDisease(loaded.hasChronicDisease);
        setMedicalNotes(loaded.medicalNotes);
        setIsReady(loaded.isReady);
        setLastDonateDate(loaded.lastDonateDate);
        setConsentFormPath(profile?.consent_form_url ?? "");
        setSavedSnapshot(JSON.stringify(loaded));
      } catch (error) {
        setErrorMsg(
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้"
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  useEffect(() => {
    const loadDonations = async () => {
      try {
        const response = await fetch("/api/donor/history", { credentials: "include" });
        if (!response.ok) return;
        const data = await response.json();
        const records = (data.records ?? []) as DonationRecordRow[];
        setDonations(records.filter((record) => record.status?.toUpperCase() === "COMPLETED"));
      } catch {
        // The blood test section just stays empty if history can't be loaded.
      }
    };

    loadDonations();
  }, []);

  const handleBloodTestChange = async (recordId: string, result: BloodTestResult) => {
    const previous = donations.find((record) => record.record_id === recordId)?.blood_test_result ?? "PENDING";
    const setResult = (value: string) =>
      setDonations((records) =>
        records.map((record) => (record.record_id === recordId ? { ...record, blood_test_result: value } : record)),
      );

    setResult(result);
    setBloodTestStatus((status) => ({ ...status, [recordId]: { state: "saving" } }));

    try {
      const response = await fetch(`/api/donor/donations/${recordId}/blood-test`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ result }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setBloodTestStatus((status) => ({ ...status, [recordId]: { state: "saved" } }));
    } catch (error) {
      setResult(previous);
      setBloodTestStatus((status) => ({
        ...status,
        [recordId]: {
          state: "error",
          message: error instanceof Error && error.message ? error.message : "บันทึกไม่สำเร็จ",
        },
      }));
    }
  };

  const handleReadinessToggle = async (nextValue: boolean) => {
    if (saving || isUpdatingReadiness) return;

    if (nextValue && !readinessEligibility.isEligible) {
      setErrorMsg(readinessEligibility.reasons.join(" "));
      setSuccessMsg("");
      return;
    }

    setIsUpdatingReadiness(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/donor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_ready: nextValue }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถอัปเดตสถานะได้");
      }
      if (typeof data.profile?.is_ready !== "boolean") {
        throw new Error("ไม่ได้รับสถานะผู้บริจาคกลับจากเซิร์ฟเวอร์");
      }

      setIsReady(data.profile.is_ready);
      setSavedSnapshot((snapshot) => {
        if (!snapshot) return snapshot;
        const savedValues = JSON.parse(snapshot) as FormValues;
        return JSON.stringify({ ...savedValues, isReady: data.profile.is_ready });
      });
      setSuccessMsg(
        data.profile.is_ready
          ? "เปิดสถานะพร้อมบริจาคแล้ว"
          : "ปิดสถานะพร้อมบริจาคแล้ว",
      );
    } catch (error) {
      console.error("Unable to update readiness:", error);
      setErrorMsg(
        error instanceof Error ? error.message : "ไม่สามารถอัปเดตสถานะได้",
      );
    } finally {
      setIsUpdatingReadiness(false);
    }
  };

  const toggleCondition = (condition: string) => {
    const items = splitNotes(medicalNotes);

    const next = items.includes(condition)
      ? items.filter((item) => item !== condition)
      : [...items, condition];

    setMedicalNotes(next.join(", ").slice(0, MAX_NOTES_LENGTH));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    setConsentFileError("");

    const isAllowedType = file && /\.(pdf|jpe?g)$/i.test(file.name);

    const error = !file
      ? ""
      : !isAllowedType
      ? "รองรับเฉพาะไฟล์ PDF หรือ JPG เท่านั้น"
      : file.size > MAX_FILE_SIZE_MB * 1024 * 1024
      ? `ขนาดไฟล์ต้องไม่เกิน ${MAX_FILE_SIZE_MB} MB`
      : "";

    if (error) {
      setConsentFileError(error);
      setConsentFile(null);
      e.target.value = "";
      return;
    }

    setConsentFile(file);
  };

  const openConsentForm = async () => {
    const viewer = window.open("", "_blank");

    try {
      const response = await fetch("/api/donor/profile/consent", {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      if (viewer) {
        viewer.location.href = data.url;
      } else {
        window.location.href = data.url;
      }
    } catch (error) {
      viewer?.close();

      setConsentFileError(
        error instanceof Error && error.message
          ? error.message
          : "ไม่สามารถเปิดไฟล์ได้"
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMsg("");
    setSuccessMsg("");

    if (!province) {
      setErrorMsg("กรุณาเลือกจังหวัดที่พำนักปัจจุบัน");
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.getElementById("profile-province")?.focus();
      return;
    }

    if (Number(weight) < 45) {
      setErrorMsg("น้ำหนักต้องไม่ต่ำกว่า 45 กิโลกรัม");
      return;
    }

    if (eligibility.requiresParentConsent && !consentFile && !consentFormPath) {
      setErrorMsg(
        "ผู้บริจาคอายุ 17 ปี ต้องแนบหนังสือยินยอมจากผู้ปกครองก่อนบันทึก"
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const submittedValues = currentValues;

    setSaving(true);

    try {
      let uploadedConsentPath: string | null = null;

      if (consentFile) {
        const formData = new FormData();

        formData.append("file", consentFile);

        const uploadResponse = await fetch("/api/donor/profile/consent", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          setErrorMsg(
            `แนบหนังสือยินยอมไม่สำเร็จ: ${
              uploadData.error || "กรุณาลองใหม่"
            }`
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });

          return;
        }

        uploadedConsentPath = uploadData.path;
      }

      const response = await fetch("/api/donor/profile/details", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          phone,
          province,
          bloodType,
          rh,
          dateOfBirth,
          gender,
          weight,
          height,
          hasChronicDisease,
          medicalNotes,
          isReady: isReady && !isCoolingDown,
          lastDonateDate,
          consentFormPath: uploadedConsentPath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      if (uploadedConsentPath) {
        setConsentFormPath(uploadedConsentPath);
        setConsentFile(null);
      }

      setSavedSnapshot(JSON.stringify(submittedValues));
      setSuccessMsg("บันทึกข้อมูลโปรไฟล์สำเร็จ");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
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
          min-h-screen bg-slate-50 pt-[116px] md:pt-16
          transition-all duration-300 ease-out
          ${isSidebarOpen ? "md:ml-64" : "md:ml-0"}
        `}
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              กำลังโหลดข้อมูลโปรไฟล์...
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:p-8"
            >
              <div className="space-y-6">
                {/* Account */}
                {account && (
                  <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/40 p-4 sm:p-5">
                    <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[#ea384c]">
                      <i className="fa-regular fa-user text-2xl"></i>
                      <i className="fa-solid fa-heart absolute bottom-1 right-1 text-[11px]"></i>
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-[#0e3b6c]">
                        {account.fullName}
                      </p>

                      <p className="truncate text-xs text-slate-400">
                        @{account.userName}
                      </p>

                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0e3b6c]">
                        <i className="fa-regular fa-circle-user"></i>
                        ผู้ใช้งานทั่วไป
                      </span>
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0e3b6c]">
                    <i className="fa-regular fa-user text-lg"></i>
                  </span>

                  <div>
                    <h1 className="text-xl font-black text-[#0e3b6c] sm:text-2xl">
                      ข้อมูลโปรไฟล์
                    </h1>

                    <p className="text-xs text-slate-500 sm:text-sm">
                      อัปเดตข้อมูลของคุณเพื่อให้ผู้ดูแลสามารถติดต่อคุณได้
                    </p>
                  </div>
                </div>

                {/* Messages */}
                {errorMsg && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-[#dc2626]">
                    <i className="fa-solid fa-circle-exclamation shrink-0 text-sm"></i>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700">
                    <i className="fa-solid fa-circle-check shrink-0 text-sm"></i>
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Contact */}
                <Section icon="fa-solid fa-phone" title="ข้อมูลติดต่อ">
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div>
                      <label
                        htmlFor="profile-phone"
                        className={LABEL_CLASS}
                      >
                        <i className="fa-solid fa-phone mr-3 text-slate-700"></i>
                        เบอร์โทรศัพท์ที่ติดต่อได้
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <input
                        id="profile-phone"
                        type="tel"
                        required
                        maxLength={12}
                        value={phone}
                        onChange={(e) =>
                          setPhone(formatPhoneNumber(e.target.value))
                        }
                        placeholder="เช่น 081-234-5678"
                        aria-describedby="profile-phone-hint"
                        className={INPUT_CLASS}
                      />

                      <p
                        id="profile-phone-hint"
                        className="mt-1 text-[11px] text-slate-400"
                      >
                        * เลข 4 ตัวท้ายใช้ยืนยันตัวตนเวลารีเซ็ตรหัสผ่าน
                        หากเปลี่ยนเบอร์ ให้ใช้เบอร์ใหม่ในครั้งถัดไป
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="profile-province"
                        className={LABEL_CLASS}
                      >
                        <i className="fa-solid fa-location-crosshairs mr-3 text-slate-700"></i>
                        จังหวัดที่พำนักปัจจุบัน
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <ProvinceSelect
                        id="profile-province"
                        value={province}
                        onChange={setProvince}
                        buttonClassName={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </Section>

                {/* Health */}
                <Section
                  icon="fa-solid fa-droplet"
                  title="ข้อมูลสุขภาพพื้นฐาน"
                >
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div>
                      <label
                        htmlFor="profile-blood-type"
                        className={LABEL_CLASS}
                      >
                        หมู่โลหิตหลัก (ABO)
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <select
                        id="profile-blood-type"
                        required
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">เลือกหมู่โลหิตหลัก</option>

                        {["A", "B", "AB", "O"].map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="profile-rh" className={LABEL_CLASS}>
                        หมู่โลหิตย่อย (Rh Factor)
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <select
                        id="profile-rh"
                        required
                        value={rh}
                        onChange={(e) => setRh(e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">เลือกหมู่โลหิตย่อย</option>
                        <option value="+">Rh+ (Positive)</option>
                        <option value="-">Rh- (Negative)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="profile-dob"
                        className={LABEL_CLASS}
                      >
                        <i className="fa-regular fa-calendar mr-3 text-slate-700"></i>
                        วัน/เดือน/ปีเกิด
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <input
                        id="profile-dob"
                        type="date"
                        required
                        max={today}
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className={DATE_INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <p id="profile-gender-label" className={LABEL_CLASS}>
                        <i className="fa-solid fa-venus-mars mr-3 text-slate-700"></i>
                        เพศกำเนิด
                        <span className="ml-1 text-red-500">*</span>
                      </p>

                      <div
                        role="radiogroup"
                        aria-labelledby="profile-gender-label"
                        className="flex h-[46px] items-center gap-6"
                      >
                        {["ชาย", "หญิง"].map((option) => (
                          <label
                            key={option}
                            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600"
                          >
                            <input
                              type="radio"
                              name="gender"
                              checked={gender === option}
                              onChange={() => setGender(option)}
                              className="size-4 accent-blue-600"
                            />

                            {option}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="profile-weight"
                        className={LABEL_CLASS}
                      >
                        <i className="fa-solid fa-weight-scale mr-3 text-slate-700"></i>
                        น้ำหนัก (กก.)
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <input
                        id="profile-weight"
                        type="number"
                        required
                        min={45}
                        max={300}
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="เช่น 60"
                        className={INPUT_CLASS}
                      />

                      <p className="mt-1 text-[11px] text-slate-400">
                        ต้องไม่ต่ำกว่า 45 กิโลกรัม
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="profile-height"
                        className={LABEL_CLASS}
                      >
                        <i className="fa-solid fa-ruler-vertical mr-3 text-slate-700"></i>
                        ส่วนสูง (ซม.)
                      </label>

                      <input
                        id="profile-height"
                        type="number"
                        min={100}
                        max={250}
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="เช่น 170"
                        className={INPUT_CLASS}
                      />

                      {bmi ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                          ดัชนีมวลกาย (BMI){" "}
                          <span className="font-bold text-[#0e3b6c]">
                            {bmi.value.toFixed(1)}
                          </span>{" "}
                          <span
                            className={`font-semibold ${bmi.level.className}`}
                          >
                            · {bmi.level.label}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-400">
                          ใช้สำหรับคำนวณค่าดัชนีมวลกาย (BMI)
                        </p>
                      )}
                    </div>
                  </div>
                </Section>

                {/* Chronic disease */}
                <Section
                  icon="fa-regular fa-file"
                  title="มีโรคประจำตัวหรือประวัติแพ้ยาหรือไม่?"
                >
                  <label className="mb-3 flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-[#0e3b6c]">
                    <input
                      type="checkbox"
                      checked={hasChronicDisease}
                      onChange={(e) =>
                        setHasChronicDisease(e.target.checked)
                      }
                      className="size-5 rounded accent-blue-600"
                    />
                    มี
                  </label>

                  {hasChronicDisease && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {COMMON_CONDITIONS.map((condition) => {
                        const isSelected =
                          selectedConditions.includes(condition);

                        return (
                          <button
                            key={condition}
                            type="button"
                            onClick={() => toggleCondition(condition)}
                            aria-pressed={isSelected}
                            className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-semibold transition ${
                              isSelected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-blue-400"
                            }`}
                          >
                            {condition}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <label
                    htmlFor="profile-medical-notes"
                    className="mb-1.5 block text-xs font-medium text-[#0e3b6c] sm:text-sm"
                  >
                    ระบุโรคประจำตัว / ยาที่ต้องรับประทานต่อเนื่อง
                  </label>

                  <div className="relative">
                    <textarea
                      id="profile-medical-notes"
                      value={medicalNotes}
                      onChange={(e) =>
                        setMedicalNotes(
                          e.target.value.slice(0, MAX_NOTES_LENGTH)
                        )
                      }
                      maxLength={MAX_NOTES_LENGTH}
                      rows={3}
                      disabled={!hasChronicDisease}
                      placeholder="เช่น เบาหวาน, ความดันโลหิตสูง, แพ้ยา..."
                      className={`${INPUT_CLASS} resize-none pb-7 disabled:cursor-not-allowed disabled:opacity-70`}
                    />

                    <span className="absolute bottom-3 right-4 text-[11px] text-slate-400">
                      {medicalNotes.length}/{MAX_NOTES_LENGTH}
                    </span>
                  </div>
                </Section>

                {/* Consent */}
                <Section
                  icon="fa-regular fa-file"
                  title="หนังสือยินยอมจากผู้ปกครอง"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-slate-600 sm:text-sm">
                      สำหรับผู้ที่มีอายุ 17 ปีบริบูรณ์
                    </p>

                    {eligibility.requiresParentConsent ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-600">
                        จำเป็นต้องแนบสำหรับคุณ
                      </span>
                    ) : dateOfBirth && calculateAge(dateOfBirth) >= 18 ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        ไม่จำเป็นสำหรับอายุของคุณ
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_240px]">
                    <label className="flex cursor-pointer items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-6 transition hover:border-blue-400 hover:bg-blue-50/40">
                      <i className="fa-solid fa-cloud-arrow-up text-3xl text-blue-600"></i>

                      <div className="min-w-0">
                        {consentFile ? (
                          <p className="truncate text-sm font-bold text-blue-600">
                            {consentFile.name}
                          </p>
                        ) : (
                          <p className="text-sm font-bold text-blue-600">
                            อัปโหลดไฟล์{" "}
                            <span className="font-normal text-slate-400">
                              (PDF, JPG)
                            </span>
                          </p>
                        )}

                        <p className="text-xs text-slate-400">
                          ขนาดไฟล์ไม่เกิน {MAX_FILE_SIZE_MB} MB
                        </p>
                      </div>

                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    <div className="flex items-center justify-center rounded-2xl bg-blue-50 p-4">
                      <a
                        href="/documents/parent_consent_form.pdf"
                        download
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-600 bg-white px-4 py-2.5 text-sm font-bold text-blue-600 transition hover:bg-blue-600 hover:text-white"
                      >
                        <i className="fa-solid fa-download"></i>
                        ดาวน์โหลดแบบฟอร์ม
                      </a>
                    </div>
                  </div>

                  {consentFileError && (
                    <p className="mt-2 text-xs text-red-600">
                      {consentFileError}
                    </p>
                  )}

                  {consentFile ? (
                    <p className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                      <i className="fa-solid fa-circle-info"></i>
                      ไฟล์จะถูกอัปโหลดเมื่อกด &quot;บันทึกข้อมูล&quot;
                    </p>
                  ) : consentFormPath ? (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700">
                      <i className="fa-solid fa-circle-check"></i>
                      แนบหนังสือยินยอมแล้ว

                      <button
                        type="button"
                        onClick={openConsentForm}
                        className="font-bold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                      >
                        เปิดดูไฟล์
                      </button>
                    </p>
                  ) : null}
                </Section>

                {/* Donation readiness */}
                <Section
                  icon="fa-regular fa-bell"
                  title="สถานะความพร้อมบริจาค"
                >
                  <div className="flex items-start gap-3">
                    <Toggle
                      label="พร้อมบริจาค"
                      checked={isReady && !isCoolingDown}
                      onChange={(nextValue) =>
                        handleReadinessToggle(isReady ? false : nextValue)
                      }
                      disabled={
                        saving ||
                        isUpdatingReadiness ||
                        (!isReady && !readinessEligibility.isEligible)
                      }
                      activeClass="peer-checked:bg-emerald-500"
                    />

                    <div>
                      <p className="text-sm font-bold text-[#0e3b6c]">
                        พร้อมบริจาค
                      </p>

                      <p className="text-xs text-slate-400">
                        {isCoolingDown
                          ? `อยู่ในระยะพักฟื้นอีก ${daysRemaining} วัน (เว้น 90 วันหลังบริจาค)`
                          : "หากเปิด จะได้รับแจ้งเตือนคำร้องขอบริจาคจากผู้ประสานงาน"}
                      </p>
                    </div>
                  </div>

                  {!canCheckEligibility ? (
                    <p className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      <i className="fa-solid fa-circle-info text-slate-400"></i>
                      กรอกวันเกิดและน้ำหนักเพื่อตรวจสอบเกณฑ์การบริจาค
                    </p>
                  ) : eligibility.isEligible ? (
                    <p className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      <i className="fa-solid fa-circle-check"></i>
                      ผ่านเกณฑ์ พร้อมบริจาคโลหิต
                    </p>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        ยังไม่สามารถบริจาคได้ในขณะนี้
                      </p>

                      <ul className="mt-1.5 list-disc space-y-0.5 pl-9 text-xs text-amber-700">
                        {eligibility.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Section>

                {/* Last donation */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <Section
                    icon="fa-regular fa-calendar"
                    title="วันที่บริจาคล่าสุด"
                  >
                    <input
                      type="date"
                      aria-label="วันที่บริจาคล่าสุด"
                      max={today}
                      value={lastDonateDate}
                      onChange={(e) => setLastDonateDate(e.target.value)}
                      className={DATE_INPUT_CLASS}
                    />
                  </Section>

                  <div className="flex min-h-[120px] items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <i className="fa-solid fa-clock-rotate-left shrink-0 text-xl text-slate-700"></i>

                    <p className="text-xs text-slate-500 sm:text-sm">
                      ระบบจะอัปเดตวันที่บริจาคล่าสุดโดยอัตโนมัติ
                      หรือคุณสามารถกรอกเองได้
                    </p>
                  </div>
                </div>

                {/* Blood test results */}
                <Section icon="fa-solid fa-vial" title="ผลตรวจเลือดจากการบริจาค">
                  <p className="mb-4 text-xs text-slate-500 sm:text-sm">
                    เลือกผลตามที่ได้รับแจ้งทาง SMS จากหน่วยรับบริจาค ระบบจะบันทึกให้ทันทีที่เลือก
                  </p>

                  {donations.length === 0 ? (
                    <p className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      <i className="fa-solid fa-circle-info text-slate-400"></i>
                      ยังไม่มีรายการบริจาคที่เสร็จสิ้น
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                      {donations.map((record) => {
                        const value = (record.blood_test_result ?? "PENDING") as BloodTestResult;
                        const option = BLOOD_TEST_OPTIONS.find((item) => item.value === value) ?? BLOOD_TEST_OPTIONS[0];
                        const status = bloodTestStatus[record.record_id];
                        const selectId = `blood-test-${record.record_id}`;

                        return (
                          <li
                            key={record.record_id}
                            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <label htmlFor={selectId} className="block truncate text-sm font-bold text-[#0e3b6c]">
                                {formatThaiDate(record.donation_date)} · {hospitalNameOf(record)}
                              </label>
                              <p className="text-xs text-slate-400">
                                {record.volume_ml ? `${record.volume_ml} มล.` : "ไม่ระบุปริมาณ"}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <select
                                id={selectId}
                                value={value}
                                disabled={status?.state === "saving"}
                                onChange={(e) => handleBloodTestChange(record.record_id, e.target.value as BloodTestResult)}
                                className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#65a1f2] disabled:opacity-60 ${option.className}`}
                              >
                                {BLOOD_TEST_OPTIONS.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>

                              <span className="w-20 text-xs" aria-live="polite">
                                {status?.state === "saving" && (
                                  <span className="text-slate-400">
                                    <i className="fa-solid fa-circle-notch fa-spin"></i> กำลังบันทึก
                                  </span>
                                )}
                                {status?.state === "saved" && (
                                  <span className="font-semibold text-emerald-600">
                                    <i className="fa-solid fa-check"></i> บันทึกแล้ว
                                  </span>
                                )}
                              </span>
                            </div>

                            {status?.state === "error" && (
                              <p className="text-xs text-red-600 sm:basis-full">{status.message}</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Section>

                {/* Buttons */}
                <div className="flex flex-col-reverse items-stretch justify-center gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:gap-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="min-w-36 rounded-xl border-2 border-slate-300 bg-white px-8 py-3 text-sm font-bold text-[#0e3b6c] transition hover:bg-slate-50"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    disabled={saving || !isDirty}
                    title={
                      !isDirty && !saving
                        ? "ยังไม่มีการเปลี่ยนแปลง"
                        : undefined
                    }
                    className="flex min-w-44 items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
                  >
                    {saving ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <i className="fa-regular fa-calendar-check"></i>
                        บันทึกข้อมูล
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="mt-16 sm:mt-24">
            <Footer />
          </div>
        </div>
      </main>
    </div>
  );
}