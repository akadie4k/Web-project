import 'server-only';

import type { AuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { bangkokToday, effectiveBloodRequestStatus, type BloodRequest, type Hospital } from '@/types/database';
import type { RequestView } from '@/components/ui/blood-request';

type HospitalRow = {
  name: string;
  address: string;
  province: string;
  contact_phone: string;
  contact_person: string | null;
};

type DonationRecordRow = {
  record_id: string;
  status: string;
  volume_ml: number | null;
};

type BloodRequestRow = Omit<BloodRequest, 'hospitals' | 'donation_records'> & {
  hospitals: HospitalRow | HospitalRow[] | null;
  donation_records: DonationRecordRow[] | null;
};

const requestColumns = `
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
  hospitals (
    name,
    address,
    province,
    contact_phone,
    contact_person
  ),
  donation_records (
    record_id,
    status,
    volume_ml
  )
`;

const urgencyOrder: Record<BloodRequest['urgency_level'], number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
};

const statusOrder: Record<ReturnType<typeof effectiveBloodRequestStatus>, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  EXPIRED: 2,
  FULFILLED: 3,
  CANCELLED: 4,
};

function getHospital(relation: BloodRequestRow['hospitals']) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function bloodLabel(type: BloodRequest['blood_type'], rh: BloodRequest['rh_factor']) {
  const factor = rh === 'Positive' || rh === '+' ? '+' : '-';
  return `${type}${factor}`;
}

function toRequestView(row: BloodRequestRow): RequestView {
  const hospital = getHospital(row.hospitals);
  if (!hospital) throw new Error(`ไม่พบข้อมูลโรงพยาบาลของคำร้อง ${row.request_id}`);

  return {
    id: row.request_id,
    hospitalId: row.hospital_id,
    hospital: hospital.name,
    province: hospital.province,
    blood: bloodLabel(row.blood_type, row.rh_factor),
    units: row.units_needed,
    urgency: row.urgency_level,
    status: row.status,
    date: row.target_date,
    target_date: row.target_date,
    createdAt: row.created_at,
    address: hospital.address,
    contact: hospital.contact_person || 'ไม่ระบุ',
    phone: hospital.contact_phone,
    purpose: row.purpose,
    responseCount: row.donation_records?.length ?? 0,
  };
}

function scopedHospitalId(user: AuthUser) {
  if (user.hospital_id) return user.hospital_id;
  if (user.role === 'system_admin') return null;
  throw new Error('บัญชีเจ้าหน้าที่ยังไม่ได้ผูกกับโรงพยาบาล');
}

export async function getHospitalForUser(user: AuthUser): Promise<Hospital> {
  const hospitalId = user.hospital_id;
  if (!hospitalId) throw new Error('บัญชีนี้ยังไม่ได้ผูกกับโรงพยาบาล จึงไม่สามารถสร้างคำร้องได้');

  const { data, error } = await supabaseAdmin
    .from('hospitals')
    .select('hospital_id,name,address,province,contact_phone,contact_person,created_at')
    .eq('hospital_id', hospitalId)
    .single();

  if (error) throw new Error(`โหลดข้อมูลโรงพยาบาลไม่สำเร็จ: ${error.message}`);
  return data as Hospital;
}

export async function getBloodRequestsForUser(user: AuthUser): Promise<RequestView[]> {
  const hospitalId = scopedHospitalId(user);
  let query = supabaseAdmin
    .from('blood_requests')
    .select(requestColumns)
    .order('created_at', { ascending: false });

  if (hospitalId) query = query.eq('hospital_id', hospitalId);
  const { data, error } = await query;
  if (error) throw new Error(`โหลดคำร้องขอเลือดไม่สำเร็จ: ${error.message}`);

  const today = bangkokToday();
  return ((data ?? []) as unknown as BloodRequestRow[])
    .map(toRequestView)
    .sort((a, b) => statusOrder[effectiveBloodRequestStatus(a.status, a.date, today)]
      - statusOrder[effectiveBloodRequestStatus(b.status, b.date, today)]
      || urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      || b.createdAt.localeCompare(a.createdAt)
      || a.id.localeCompare(b.id));
}

export async function getBloodRequestForUser(user: AuthUser, requestId: string): Promise<RequestView | null> {
  const hospitalId = scopedHospitalId(user);
  let query = supabaseAdmin
    .from('blood_requests')
    .select(requestColumns)
    .eq('request_id', requestId);

  if (hospitalId) query = query.eq('hospital_id', hospitalId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`โหลดรายละเอียดคำร้องไม่สำเร็จ: ${error.message}`);

  return data ? toRequestView(data as unknown as BloodRequestRow) : null;
}
