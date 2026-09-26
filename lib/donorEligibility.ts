export interface DonorProfileData {
  weight?: number | null;
  date_of_birth?: string | null;
  last_donate_date?: string | null;
  is_ready?: boolean | null;
  consent_form_url?: string | null;
}

export interface EligibilityResult {
  isEligible: boolean;
  isCoolingDown: boolean;
  daysRemaining: number;
  requiresParentConsent: boolean;
  reasons: string[];
}

export const MIN_DONOR_AGE = 17;
export const MAX_DONOR_AGE = 70;

export const PARENT_CONSENT_MESSAGE =
  'เปิดรับบริจาคโลหิตสำหรับผู้ที่มีอายุ 18-60 ปี (หากอายุ 17 ปีบริบูรณ์ ต้องมีหนังสือยินยอมจากผู้ปกครอง)';

export function calculateAge(dateOfBirth: string, today = new Date()): number {
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export function canReceiveDonationRequests(profile?: DonorProfileData | null): boolean {
  return evaluateDonorEligibility(profile).isEligible;
}

/**
 * ตรวจสอบเงื่อนไขทางการแพทย์และความปลอดภัยของผู้บริจาคโลหิต
 */
export function evaluateDonorEligibility(profile?: DonorProfileData | null): EligibilityResult {
  const reasons: string[] = [];
  let isCoolingDown = false;
  let daysRemaining = 0;
  let requiresParentConsent = false;

  if (!profile) {
    return {
      isEligible: false,
      isCoolingDown: false,
      daysRemaining: 0,
      requiresParentConsent: false,
      reasons: ['ไม่พบข้อมูลโปรไฟล์ผู้บริจาค'],
    };
  }

  // 1. ตรวจสอบสถานะความพร้อมบริจาค
  if (profile.is_ready === false) {
    reasons.push('สถานะของคุณถูกตั้งเป็นไม่พร้อมบริจาคในขณะนี้');
  }

  // 2. ตรวจสอบน้ำหนัก >= 45 กก.
  if (typeof profile.weight === 'number' && profile.weight < 45) {
    reasons.push('น้ำหนักไม่ผ่านเกณฑ์ขั้นต่ำ (ต้องไม่ต่ำกว่า 45 กก.)');
  }

  // 3. คำนวณอายุและตรวจสอบเกณฑ์ (17–70 ปี / ครั้งแรก <= 60 ปี)
  if (profile.date_of_birth) {
    const age = calculateAge(profile.date_of_birth);

    if (age < MIN_DONOR_AGE || age > MAX_DONOR_AGE) {
      reasons.push('อายุไม่อยู่ในเกณฑ์ที่สามารถบริจาคได้ (17–70 ปี)');
    } else {
      if (age === 17) {
        requiresParentConsent = true;
        if (!profile.consent_form_url) {
          reasons.push('อายุ 17 ปีต้องมีหนังสือยินยอมจากผู้ปกครอง');
        }
      }
      // บริจาคครั้งแรก (ไม่มี last_donate_date) ต้องอายุไม่เกิน 60 ปี
      const isFirstTime = !profile.last_donate_date;
      if (isFirstTime && age > 60) {
        reasons.push('ผู้บริจาคครั้งแรกต้องมีอายุไม่เกิน 60 ปี');
      }
    }
  } else {
    reasons.push('ไม่พบวันเกิดผู้บริจาค');
  }

  // 4. ตรวจสอบระยะพักฟื้น 90 วัน
  if (profile.last_donate_date) {
    const lastDonated = new Date(`${profile.last_donate_date}T00:00:00`);
    const nextEligibleDate = new Date(lastDonated);
    nextEligibleDate.setDate(nextEligibleDate.getDate() + 90);

    const today = new Date();
    const diffTime = nextEligibleDate.getTime() - today.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    isCoolingDown = daysRemaining > 0;

    if (isCoolingDown) {
      reasons.push(`อยู่ในช่วงพักฟื้นหลังการบริจาค (เหลืออีก ${daysRemaining} วัน)`);
    }
  }

  return {
    isEligible: reasons.length === 0,
    isCoolingDown,
    daysRemaining,
    requiresParentConsent,
    reasons,
  };
}
