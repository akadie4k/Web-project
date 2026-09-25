import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recordId } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'ไม่พบ ID ของรายการบริจาค' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('donation_records')
      .update({
        status: 'CANCELLED',
        notes: reason || 'ปฏิเสธโดยโรงพยาบาล',
      })
      .eq('record_id', recordId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, donation: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
