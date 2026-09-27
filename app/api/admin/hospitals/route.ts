import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireHospitalAdmin } from "@/lib/requireHospitalAdmin";

export async function GET() {
  try {
    const admin = await requireHospitalAdmin();
    if (!admin || !admin.hospital_id) {
      return NextResponse.json({ error: "ไม่พบสิทธิ์ผู้ดูแลโรงพยาบาล" }, { status: 403 });
    }

    const { data: hospital, error } = await supabaseAdmin
      .from("hospitals")
      .select("*")
      .eq("hospital_id", admin.hospital_id)
      .single();

    if (error || !hospital) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสถานพยาบาล" }, { status: 404 });
    }

    return NextResponse.json({ hospital });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireHospitalAdmin();
    if (!admin || !admin.hospital_id) {
      return NextResponse.json({ error: "ไม่ได้รับอนุญาต หรือไม่พบ hospital_id" }, { status: 403 });
    }

    const body = await request.json();
    const { address, contact_phone, contact_person, operating_hours } = body;

    // อัปเดตเฉพาะคอลัมน์ที่มีอยู่จริงในตาราง hospitals เท่านั้น
    const { data: updatedHospital, error } = await supabaseAdmin
      .from("hospitals")
      .update({
        address: address ?? null,
        contact_phone: contact_phone ?? null,
        contact_person: contact_person ?? null,
        operating_hours: operating_hours ?? null,
      })
      .eq("hospital_id", admin.hospital_id)
      .select()
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ hospital: updatedHospital });
  } catch (err: any) {
    console.error("PUT Error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}