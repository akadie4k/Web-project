import { NextResponse } from "next/server";

import { evaluateDonorEligibility } from "@/lib/donorEligibility";
import { getDonorSessionUser } from "@/lib/donorSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(request: Request) {
  const user = await getDonorSessionUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body.is_ready !== "boolean") {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  if (body.is_ready) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("donor_profiles")
      .select("weight, date_of_birth, last_donate_date, consent_form_url")
      .eq("donor_id", user.user_id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: "ไม่สามารถตรวจสอบสิทธิ์ผู้บริจาคได้", details: profileError.message },
        { status: 500 },
      );
    }

    if (!profile) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้บริจาค" }, { status: 404 });
    }

    const eligibility = evaluateDonorEligibility(profile);
    if (!eligibility.isEligible) {
      return NextResponse.json(
        { error: eligibility.reasons.join(" "), eligibility },
        { status: 403 },
      );
    }
  }

  const { data, error } = await supabaseAdmin
    .from("donor_profiles")
    .update({ is_ready: body.is_ready })
    .eq("donor_id", user.user_id)
    .select("donor_id, blood_type, rh_factor, province, is_ready, last_donate_date")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตสถานะได้", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile: data });
}
