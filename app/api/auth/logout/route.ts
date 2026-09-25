import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (token) {
      // delete session from db
      await supabaseAdmin.from('sessions').delete().eq('token', token);
    }

    // Clear Cookie (Browser side)
    cookieStore.delete('token');

    return NextResponse.json({ message: 'ออกจากระบบสำเร็จ' });
  } catch (err: unknown) {
    console.error('Logout Error:', err);
    return NextResponse.json({ error: 'ไม่สามารถออกจากระบบได้' }, { status: 500 });
  }
}
