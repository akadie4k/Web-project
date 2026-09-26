import { NextResponse } from "next/server";

import { getDonorSessionUser } from "@/lib/donorSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Must match the CHECK constraint on donation_records.blood_test_result.
const BLOOD_TEST_RESULTS = ["PASSED", "FAILED", "PENDING"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDonorSessionUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = String(body?.result ?? "").toUpperCase();

  if (!BLOOD_TEST_RESULTS.includes(result)) {
    return NextResponse.json({ error: "ผลตรวจเลือดไม่ถูกต้อง" }, { status: 400 });
  }

  const { data: donation, error: findError } = await supabaseAdmin
    .from("donation_records")
    .select("record_id, status")
    .eq("record_id", id)
    .eq("donor_id", user.user_id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: "ไม่สามารถตรวจสอบรายการบริจาคได้", details: findError.message }, { status: 500 });
  }
  if (!donation) {
    return NextResponse.json({ error: "ไม่พบรายการบริจาคนี้" }, { status: 404 });
  }
  if (String(donation.status).toUpperCase() !== "COMPLETED") {
    return NextResponse.json({ error: "กรอกผลตรวจเลือดได้เฉพาะรายการที่บริจาคเสร็จแล้ว" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("donation_records")
    .update({ blood_test_result: result })
    .eq("record_id", id)
    .eq("donor_id", user.user_id)
    .select("record_id, blood_test_result")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "ไม่สามารถบันทึกผลตรวจเลือดได้", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ record: data });
}
