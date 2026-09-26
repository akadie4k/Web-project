import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionToken } from "@/lib/session";
import { effectiveBloodRequestStatus } from "@/types/database";
import { canReceiveDonationRequests, PARENT_CONSENT_MESSAGE } from "@/lib/donorEligibility";

// =========================================
// POST /api/donations
// =========================================
export async function POST(request: Request) {
  try {
    console.log("===== DONATE API =====");

    // =========================================
    // 1. ตรวจสอบ Session
    // =========================================
    const token = await getSessionToken();

    if (!token) {
      return NextResponse.json(
        {
          error: "Please login first.",
        },
        { status: 401 }
      );
    }

    // =========================================
    // 2. หา User จาก Session
    // =========================================
    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from("sessions")
      .select("user_id, expires_at")
      .eq("token", token)
      .single();

    if (sessionError || !session) {
      console.error("SESSION ERROR:", sessionError);

      return NextResponse.json(
        {
          error: "Invalid session.",
          details: sessionError?.message,
          code: sessionError?.code,
          hint: sessionError?.hint,
        },
        { status: 401 }
      );
    }

    // =========================================
    // 3. ตรวจสอบ Session หมดอายุ
    // =========================================
    if (
      session.expires_at &&
      new Date(session.expires_at) < new Date()
    ) {
      return NextResponse.json(
        {
          error: "Session expired.",
        },
        { status: 401 }
      );
    }

    const userId = session.user_id;

    const { data: donorProfile, error: donorProfileError } = await supabaseAdmin
      .from("donor_profiles")
      .select("date_of_birth, consent_form_url")
      .eq("donor_id", userId)
      .maybeSingle();

    if (donorProfileError) {
      return NextResponse.json({ error: "ไม่สามารถตรวจสอบสิทธิ์ผู้บริจาคได้" }, { status: 500 });
    }

    if (!canReceiveDonationRequests(donorProfile)) {
      return NextResponse.json({ error: PARENT_CONSENT_MESSAGE }, { status: 403 });
    }

    console.log("USER ID:", userId);

    // =========================================
    // 4. รับ request_id
    // =========================================
    const body = await request.json();

    const requestId = body?.request_id;

    console.log("REQUEST ID:", requestId);

    if (!requestId) {
      return NextResponse.json(
        {
          error: "request_id is required.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 5. หา Blood Request
    // =========================================
    const {
      data: bloodRequest,
      error: requestError,
    } = await supabaseAdmin
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
        created_at
      `)
      .eq("request_id", requestId)
      .single();

    if (requestError) {
      console.error(
        "BLOOD REQUEST ERROR:",
        requestError
      );

      return NextResponse.json(
        {
          error: "Failed to find blood request.",
          details: requestError.message,
          code: requestError.code,
          hint: requestError.hint,
        },
        { status: 500 }
      );
    }

    if (!bloodRequest) {
      return NextResponse.json(
        {
          error: "Blood request not found.",
        },
        { status: 404 }
      );
    }

    console.log(
      "BLOOD REQUEST:",
      bloodRequest
    );

    // =========================================
    // 6. ตรวจสอบ Status
    // =========================================
    const currentStatus =
      effectiveBloodRequestStatus(
        bloodRequest.status,
        bloodRequest.target_date
      );

    console.log(
      "CURRENT STATUS:",
      currentStatus
    );

    if (currentStatus !== "OPEN") {
      return NextResponse.json(
        {
          error:
            "This blood request is no longer available.",
          current_status: currentStatus,
        },
        { status: 409 }
      );
    }


    // =========================================
    // 7. ตรวจสอบว่าผู้บริจาคมีการตอบรับที่ยังใช้งานอยู่หรือไม่
    // รายการที่ยกเลิกแล้วต้องไม่ขัดขวางการตอบรับใหม่
    // =========================================
    const {
      data: existingDonation,
      error: existingDonationError,
    } = await supabaseAdmin
      .from("donation_records")
      .select("record_id, status")
      .eq("request_id", requestId)
      .eq("donor_id", userId)
      .in("status", ["ACCEPTED", "PENDING"])
      .maybeSingle();

    if (existingDonationError) {
      console.error(
        "CHECK DONATION ERROR:",
        existingDonationError
      );

      return NextResponse.json(
        {
          error:
            "Failed to check existing donation.",
          details:
            existingDonationError.message,
          code:
            existingDonationError.code,
          hint:
            existingDonationError.hint,
        },
        { status: 500 }
      );
    }

    if (existingDonation) {
      return NextResponse.json(
        {
          error:
            "You have already accepted this blood request.",
        },
        { status: 409 }
      );
    }

    // =========================================
    // 8. INSERT Donation
    // =========================================
    console.log(
      "INSERT INTO donation_records..."
    );

    const {
      data: donation,
      error: donationError,
    } = await supabaseAdmin
      .from("donation_records")
      .insert({
        request_id: requestId,
        donor_id: userId,
        status: "ACCEPTED",

        // เพิ่ม donation_date
        donation_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (donationError) {
      console.error(
        "DONATION INSERT ERROR:",
        donationError
      );

      return NextResponse.json(
        {
          error:
            "Failed to create donation.",
          details:
            donationError.message,
          code:
            donationError.code,
          hint:
            donationError.hint,
        },
        { status: 500 }
      );
    }

    console.log(
      "DONATION CREATED:",
      donation
    );

    // =========================================
    // 9. Update Blood Request
    // =========================================
    const {
      error: updateError,
    } = await supabaseAdmin
      .from("blood_requests")
      .update({
        status: "IN_PROGRESS",
      })
      .eq(
        "request_id",
        requestId
      );

    if (updateError) {
      console.error(
        "UPDATE REQUEST ERROR:",
        updateError
      );
    }

    // =========================================
    // 10. Success
    // =========================================
    console.log(
      "===== DONATE SUCCESS ====="
    );

    return NextResponse.json(
      {
        message:
          "Donation accepted successfully.",
        donation,
        request: bloodRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "DONATE API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}