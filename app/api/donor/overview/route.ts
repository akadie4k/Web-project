import { NextResponse } from "next/server";

import { getDonorSessionUser } from "@/lib/donorSession";
import { evaluateDonorEligibility } from "@/lib/donorEligibility";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bangkokToday } from "@/types/database";

const normalizeRh = (rh?: string | null) => {
  const value = rh?.trim().toUpperCase();

  if (value === "+" || value?.startsWith("POS")) return "+";
  if (value === "-" || value?.startsWith("NEG")) return "-";

  return null;
};

export async function GET() {
  const user = await getDonorSessionUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("donor_profiles")
    .select("donor_id, blood_type, rh_factor, province, is_ready, last_donate_date, date_of_birth, consent_form_url")
    .eq("donor_id", user.user_id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลผู้บริจาค", details: profileError.message },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json({ error: "ไม่พบข้อมูลผู้บริจาค" }, { status: 404 });
  }

  const eligibility = evaluateDonorEligibility(profile);
  const canReceiveRequests = eligibility.isEligible;

  const [openRequestsResult, activeDonationResult] = await Promise.all([
    supabaseAdmin
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
      .gte("target_date", bangkokToday())
      .eq("blood_type", profile.blood_type)
      .eq("hospitals.province", profile.province)
      .order("created_at", { ascending: false })
      .limit(3),
    supabaseAdmin
      .from("donation_records")
      .select("record_id, request_id, status, created_at")
      .eq("donor_id", user.user_id)
      .in("status", ["ACCEPTED", "PENDING"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (openRequestsResult.error || activeDonationResult.error) {
    const error = openRequestsResult.error ?? activeDonationResult.error;
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลแดชบอร์ด", details: error?.message },
      { status: 500 },
    );
  }

  const matchedRequests = (canReceiveRequests ? openRequestsResult.data ?? [] : []).filter(
    (request) => normalizeRh(request.rh_factor) === normalizeRh(profile.rh_factor),
  );

  let activeRequest = null;
  const activeDonation = activeDonationResult.data;

  if (activeDonation?.request_id) {
    const { data, error } = await supabaseAdmin
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
          name,
          province
        )
      `)
      .eq("request_id", activeDonation.request_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "ไม่สามารถโหลดภารกิจปัจจุบัน", details: error.message },
        { status: 500 },
      );
    }

    activeRequest = {
      ...data,
      donation_record_id: activeDonation.record_id,
      donation_status: activeDonation.status,
    };
  }

  return NextResponse.json({ user, profile, matchedRequests, activeRequest, canReceiveRequests, eligibility });
}
