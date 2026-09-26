import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    console.log("Test from check api : ", token);

    if (!token) {
      return NextResponse.json({ user: null, has_profile: false }, { status: 401 });
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
      cookieStore.delete('token');
      return NextResponse.json({ user: null, has_profile: false }, { status: 401 });
    }

    const user = Array.isArray(sessionData.users)
      ? sessionData.users[0]
      : sessionData.users;

    // Check User Have Donor Profile
    let hasProfile = true;
    if (user.role !== 'hospital_admin' && user.role !== 'system_admin') {
      const { data: donorProfile } = await supabaseAdmin
        .from('donors_profiles')
        .select('donor_id')
        .eq('donor_id', user.user_id)
        .maybeSingle();

      hasProfile = Boolean(donorProfile);
    }

    return NextResponse.json({
      user: {
        ...user,
        has_profile: hasProfile,
      },
      has_profile: hasProfile,
    });
  } catch (err: any) {
    console.error('Check Session Error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}