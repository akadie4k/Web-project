import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. ตรวจสอบ Session และสิทธิ์
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("user_id, users(user_id, role, full_name, hospital_id)")
      .eq("token", token)
      .single();

    const userData = session?.users as unknown as {
      user_id: string;
      role: string;
      full_name: string;
      hospital_id?: string;
    };

    if (!session || !["hospital_admin", "system_admin"].includes(userData?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. หา hospital_id ของ Admin
    let hospitalId = userData?.hospital_id;

    if (!hospitalId) {
      const { data: staffRecord } = await supabaseAdmin
        .from("hospital_staff")
        .select("hospital_id")
        .eq("user_id", session.user_id)
        .maybeSingle();

      hospitalId = staffRecord?.hospital_id;
    }

    // 3. ดึงชื่อโรงพยาบาลและจังหวัดจากตาราง hospitals
    let dbHospitalName = "";
    let adminProvince = "";

    if (hospitalId) {
      const { data: hospitalData } = await supabaseAdmin
        .from("hospitals")
        .select("name, province")
        .eq("hospital_id", hospitalId)
        .maybeSingle();

      dbHospitalName = hospitalData?.name || "";
      adminProvince = hospitalData?.province || "";
    }

    // 4. ดึง donation_records พร้อม blood_requests และโรงพยาบาล (ใช้คอลัมน์ name และ province)
    const { data: records, error: recordsError } = await supabaseAdmin
      .from("donation_records")
      .select(`
        record_id,
        donor_id,
        donation_date,
        status,
        volume_ml,
        blood_requests (
          request_id,
          purpose,
          urgency_level,
          units_needed,
          hospital_id,
          hospitals (
            name,
            province
          )
        )
      `)
      .not("request_id", "is", null)
      .order("created_at", { ascending: false });

    if (recordsError) {
      return NextResponse.json({ error: recordsError.message }, { status: 500 });
    }

    // ถ้าแอดมินยังไม่ได้ผูก hospital_id ตรง ให้ใช้ชื่อโรงพยาบาลจากเคสแรกใน DB
    if (!dbHospitalName && records && records.length > 0) {
      const firstReq = Array.isArray(records[0]?.blood_requests)
        ? records[0]?.blood_requests[0]
        : records[0]?.blood_requests;

      const reqHospital = Array.isArray(firstReq?.hospitals)
        ? firstReq?.hospitals[0]
        : firstReq?.hospitals;

      dbHospitalName = reqHospital?.name || "";
      if (!adminProvince) {
        adminProvince = reqHospital?.province || "";
      }
    }

    if (!records || records.length === 0) {
      return NextResponse.json({
        donations: [],
        hospital_name: dbHospitalName,
      });
    }

    // กรองเฉพาะคำขอที่โรงพยาบาลอยู่ในจังหวัดเดียวกันกับ Admin
    const filteredRecords = adminProvince
      ? records.filter((record) => {
          const req = Array.isArray(record.blood_requests)
            ? record.blood_requests[0]
            : record.blood_requests;
          const hosp = Array.isArray(req?.hospitals)
            ? req?.hospitals[0]
            : req?.hospitals;

          return hosp?.province?.trim() === adminProvince.trim();
        })
      : records;

    const donorIds = Array.from(new Set(filteredRecords.map((r) => r.donor_id).filter(Boolean)));

    // 5. ดึง users และ donor_profiles (ใช้ UUID เดียวกัน)
    const [{ data: usersData }, { data: profilesData }] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("user_id, full_name, phone")
        .in("user_id", donorIds),
      supabaseAdmin
        .from("donor_profiles")
        .select("donor_id, blood_type, rh_factor, consent_form_url")
        .in("donor_id", donorIds),
    ]);

    const userMap = new Map((usersData || []).map((u) => [u.user_id, u]));
    const profileMap = new Map((profilesData || []).map((p) => [p.donor_id, p]));

    const donations = filteredRecords.map((record) => {
      const user = userMap.get(record.donor_id);
      const profile = profileMap.get(record.donor_id);
      const request = Array.isArray(record.blood_requests)
        ? record.blood_requests[0]
        : record.blood_requests;

      const consentUrl = profile?.consent_form_url ?? null;

      return {
        record_id: record.record_id,
        donation_date: record.donation_date,
        status: record.status,
        volume_ml: record.volume_ml,
        consent_accepted: Boolean(consentUrl),
        consent_document_url: consentUrl,
        donor: {
          donor_id: record.donor_id,
          full_name: user?.full_name || "ไม่ระบุชื่อ",
          phone: user?.phone || "-",
          blood_type: profile?.blood_type || "-",
          rh_factor: profile?.rh_factor || "+",
        },
        request: {
          request_id: request?.request_id,
          purpose: request?.purpose || "-",
          urgency_level: request?.urgency_level || "NORMAL",
          units_needed: request?.units_needed || 1,
        },
      };
    });

    return NextResponse.json({
      donations,
      hospital_name: dbHospitalName,
    });
  } catch (error) {
    console.error("GET /api/admin/donations error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}