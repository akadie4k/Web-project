import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    console.log("Test from check api : ", token);



    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Find token in sessions with users (join)
    const { data: sessionData, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        token,
        expires_at,
        users (
          user_id,
          user_name,
          full_name,
          role,
          hospital_id
        )
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !sessionData || !sessionData.users) {
      // if Session expires or incorrect clear Cookie
      cookieStore.delete('session_token');
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: sessionData.users,
    });
  } catch (err: unknown) {
    console.error('Check Session Error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}
