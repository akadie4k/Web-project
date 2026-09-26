import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const cleanUsername = String(username ?? '').trim();
    const cleanPassword = String(password ?? '').trim();

    if (!cleanUsername || !cleanPassword) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
    }

    // 1. Find Username
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('user_id, user_name, full_name, password_hash, role')
      .eq('user_name', cleanUsername)
      .maybeSingle(); 

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // 2. Check Password
    const isPasswordValid = await bcrypt.compare(cleanPassword, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // 3. Create Session Token and Set Expired 7 days
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // 4. Save into sessions
    const { error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        token: sessionToken,
        user_id: user.user_id,
        expires_at: expiresAt,
      });

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // 5. Save Cookie to Browser (httpOnly)
    const cookieStore = await cookies();

    cookieStore.set('token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(expiresAt),
    });

    // 6. Check User Have Donor Profile 
    let hasProfile = true;
    if (user.role !== 'hospital_admin' && user.role !== 'system_admin') {
      const { data: donorProfile } = await supabaseAdmin
        .from('donor_profiles') 
        .select('donor_id')
        .eq('donor_id', user.user_id)
        .maybeSingle();

      hasProfile = Boolean(donorProfile);
    }

    return NextResponse.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      has_profile: hasProfile,
      user: {
        user_id: user.user_id,
        user_name: user.user_name,
        full_name: user.full_name,
        role: user.role,
        has_profile: hasProfile,
      },
    });
  } catch (err: any) {
    console.error('Login API Error:', err);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}