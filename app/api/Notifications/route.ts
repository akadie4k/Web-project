import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bangkokToday } from "@/types/database";

// =====================================================
// GET /api/auth/requests
// ดึงคำร้องขอเลือดสำหรับ Donor ที่ Login อยู่
// =====================================================
export async function GET() {
  try {
    // 1. ตรวจสอบ Session
    const token = await getSessionToken();

    if (!token) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    // 2. หา session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .select("user_id, expires_at")
      .eq("token", token)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session ไม่ถูกต้อง" }, { status: 401 });
    }

    // 3. ตรวจสอบ Session หมดอายุ
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: "Session หมดอายุ กรุณา Login ใหม่" }, { status: 401 });
    }

    // 4. ดึงข้อมูล User พร้อม Donor Profile
    const [userRes, profileRes] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("user_id, user_name, full_name, role")
        .eq("user_id", session.user_id)
        .single(),
      supabaseAdmin
        .from("donor_profiles")
        .select("blood_type, rh_factor, province, last_donate_date, is_ready")
        .eq("donor_id", session.user_id)
        .single(),
    ]);

    const user = userRes.data;
    const profile = profileRes.data;

    if (userRes.error || !user) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้" }, { status: 404 });
    }

    if (user.role !== "donor") {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" }, { status: 403 });
    }

    // 5. ตรวจสอบระยะพักฟื้น 90 วัน
    let isCoolingDown = false;
    let daysRemaining = 0;

    if (profile?.last_donate_date) {
      const lastDonated = new Date(`${profile.last_donate_date}T00:00:00`);
      const nextEligibleDate = new Date(lastDonated);
      nextEligibleDate.setDate(nextEligibleDate.getDate() + 90);

      const today = new Date();
      const diffTime = nextEligibleDate.getTime() - today.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      isCoolingDown = daysRemaining > 0;
    }

    // ถ้ายังอยู่ในระยะพักฟื้น 90 วัน ไม่ต้องส่งเคสเปิดให้กดบริจาค (หรือส่ง array เปล่า)
    if (isCoolingDown) {
      return NextResponse.json({
        user: {
          user_id: user.user_id,
          user_name: user.user_name,
          full_name: user.full_name,
          role: user.role,
        },
        profile,
        isCoolingDown: true,
        daysRemaining,
        requests: [], //  บล็อกไม่ให้มีเคสขึ้นมากดบริจาคได้
      });
    }

    // 6. ดึง Blood Requests ที่ยังไม่หมดอายุ
    let query = supabaseAdmin
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
        hospitals (
          name,
          province,
          address,
          contact_phone,
          contact_person
        )
      `)
      .eq("status", "OPEN")
      .gte("target_date", bangkokToday())
      .order("created_at", { ascending: false });

    // (แนะนำ) กรองให้ตรงกับกรุ๊ปเลือดของผู้ใช้
    if (profile?.blood_type) {
      query = query.eq("blood_type", profile.blood_type);
    }

    const { data: requests, error: requestsError } = await query;

    if (requestsError) {
      return NextResponse.json(
        { error: "Failed to fetch blood requests", details: requestsError.message },
        { status: 500 }
      );
    }

    // 7. ส่งข้อมูลกลับ
    return NextResponse.json({
      user: {
        user_id: user.user_id,
        user_name: user.user_name,
        full_name: user.full_name,
        role: user.role,
      },
      profile,
      isCoolingDown: false,
      daysRemaining: 0,
      requests: requests ?? [],
    });
  } catch (error) {
    console.error("GET /api/auth/Notifications error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}