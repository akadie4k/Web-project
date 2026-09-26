import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// =====================================================
// PATCH /api/Notifications/:id
// แก้ไขคำร้องขอเลือด
// =====================================================
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // ตรวจสอบว่ามี request นี้จริงหรือไม่
    const { data: existingRequest, error: findError } =
      await supabaseAdmin
        .from("blood_requests")
        .select("request_id")
        .eq("request_id", id)
        .single();

    if (findError || !existingRequest) {
      return NextResponse.json(
        {
          error: "Blood request not found",
        },
        { status: 404 }
      );
    }

    // สร้างข้อมูลที่จะ update
    const updateData: Record<string, unknown> = {};

    if (body.hospital_id !== undefined) {
      updateData.hospital_id = body.hospital_id;
    }

    if (body.blood_type !== undefined) {
      updateData.blood_type = body.blood_type;
    }

    if (body.rh_factor !== undefined) {
      updateData.rh_factor = body.rh_factor;
    }

    if (body.units_needed !== undefined) {
      updateData.units_needed = body.units_needed;
    }

    if (body.urgency_level !== undefined) {
      updateData.urgency_level = body.urgency_level;
    }

    if (body.purpose !== undefined) {
      updateData.purpose = body.purpose;
    }

    if (body.target_date !== undefined) {
      updateData.target_date = body.target_date;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // ถ้าไม่มีข้อมูลให้แก้
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error: "No fields to update",
        },
        { status: 400 }
      );
    }

    // Update
    const { data, error } = await supabaseAdmin
      .from("blood_requests")
      .update(updateData)
      .eq("request_id", id)
      .select(`
        *,
        hospitals (
          name,
          province,
          address,
          contact_phone,
          contact_person
        )
      `)
      .single();

    if (error) {
      console.error("PATCH /api/Notifications/[id] error:", error);

      return NextResponse.json(
        {
          error: "Failed to update blood request",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Blood request updated successfully",
      request: data,
    });
  } catch (error) {
    console.error("PATCH API error:", error);

    return NextResponse.json(
      {
        error: "Invalid request data",
      },
      { status: 400 }
    );
  }
}

// =====================================================
// DELETE /api/requests/:id
// ลบคำร้องขอเลือด
// =====================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ตรวจสอบว่ามี request นี้จริงหรือไม่
    const { data: existingRequest, error: findError } =
      await supabaseAdmin
        .from("blood_requests")
        .select("request_id")
        .eq("request_id", id)
        .single();

    if (findError || !existingRequest) {
      return NextResponse.json(
        {
          error: "Blood request not found",
        },
        { status: 404 }
      );
    }

    // ลบข้อมูล
    const { error } = await supabaseAdmin
      .from("blood_requests")
      .delete()
      .eq("request_id", id);

    if (error) {
      console.error("DELETE /api/Notifications/[id] error:", error);

      return NextResponse.json(
        {
          error: "Failed to delete blood request",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Blood request deleted successfully",
      request_id: id,
    });
  } catch (error) {
    console.error("DELETE API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}