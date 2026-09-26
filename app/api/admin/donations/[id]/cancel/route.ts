import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(
<<<<<<< HEAD
  request: Request,
  { params }: { params: Promise<{ id: string }> } // เปลี่ยนเป็น Promise<{ id: string }>
) {
  try {
    const resolvedParams = await params; // await เพื่อดึงค่า params ออกมา
    const recordId = resolvedParams.id;
=======
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: recordId } = await params;
>>>>>>> upstream/main
    const body = await request.json();
    const { reason } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'ไม่พบรหัสบันทึกการบริจาค' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('donation_records')
      .update({
        status: 'CANCELLED',
        notes: reason || 'ปฏิเสธโดยเจ้าหน้าที่โรงพยาบาล',
      })
      .eq('record_id', recordId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, donation: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}