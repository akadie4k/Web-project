import { NextResponse } from "next/server";

import { getDonorSessionUser } from "@/lib/donorSession";
import { evaluateDonorEligibility } from "@/lib/donorEligibility";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const user = await getDonorSessionUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const [profileResult, recordsResult] = await Promise.all([
    supabaseAdmin
      .from("donor_profiles")
      .select("donor_id, blood_type, rh_factor, weight, date_of_birth, last_donate_date, is_ready, consent_form_url")
      .eq("donor_id", user.user_id)
      .maybeSingle(),
    supabaseAdmin
      .from("donation_records")
      .select(`
        record_id,
        donor_id,
        request_id,
        donation_date,
        volume_ml,
        blood_test_result,
        status,
        notes,
        created_at,
        blood_requests (
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
            province
          )
        )
      `)
      .eq("donor_id", user.user_id)
      .order("donation_date", { ascending: false }),
  ]);

  const error = profileResult.error ?? recordsResult.error;

  if (error) {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดประวัติการบริจาค", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    user,
    profile: profileResult.data,
    eligibility: evaluateDonorEligibility(profileResult.data),
    records: recordsResult.data ?? [],
  });
}
