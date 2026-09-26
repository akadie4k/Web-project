import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { destroySession } from '@/lib/session';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, last4Digits, password, confirmPassword } = body;

    // 1. ตรวจสอบความครบถ้วนของข้อมูล
    if (!username || !last4Digits || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();
    const cleanLast4 = last4Digits.trim();

    if (cleanLast4.length !== 4) {
      return NextResponse.json(
        { error: 'กรุณากรอกเลขท้ายเบอร์โทรศัพท์ให้ครบ 4 หลัก' },
        { status: 400 }
      );
    }

    // 2. ค้นหาผู้ใช้ พร้อมดึง password_hash มาตรวจสอบ
    const { data: userProfile, error: queryErr } = await supabaseAdmin
      .from('users')
      .select('user_id, user_name, phone, password_hash')
      .ilike('user_name', cleanUsername)
      .maybeSingle();

    if (queryErr) {
      console.error('[DB Query Error]:', queryErr);
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการตรวจสอบฐานข้อมูล' },
        { status: 500 }
      );
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' },
        { status: 404 }
      );
    }

    // 3. ตรวจสอบเลข 4 ตัวท้ายของเบอร์โทรศัพท์
    const storedPhone = (userProfile.phone || '').replace(/[^0-9]/g, '');

    if (!storedPhone || storedPhone.slice(-4) !== cleanLast4) {
      return NextResponse.json(
        { error: 'เลข 4 ตัวท้ายไม่ตรงกับเบอร์โทรศัพท์ที่เคยลงทะเบียนไว้' },
        { status: 400 }
      );
    }

    // 4. ตรวจสอบว่ารหัสผ่านใหม่ตรงกับรหัสผ่านเดิมหรือไม่ (แบบ Google)
    if (userProfile.password_hash) {
      const isSamePassword = await bcrypt.compare(password, userProfile.password_hash);
      if (isSamePassword) {
        return NextResponse.json(
          { error: 'กรุณาตั้งรหัสผ่านใหม่ที่ไม่เคยใช้กับบัญชีนี้ และต้องแตกต่างจากรหัสผ่านเดิม' },
          { status: 400 }
        );
      }
    }

    // 5. Hash รหัสผ่านใหม่ก่อนบันทึก
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(password, salt);

    // 6. อัปเดต password_hash ใหม่ลงตาราง users
    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('user_id', userProfile.user_id);

    if (updateErr) {
      console.error('[DB Update Error]:', updateErr);
      return NextResponse.json(
        { error: updateErr.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ' },
        { status: 500 }
      );
    }

    // 7. สร้าง Response และสั่งล้าง Session Cookie ทิ้งทันที
    await destroySession();

    // ลบ cookie ของ session
    return NextResponse.json(
      { success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว' },
      { status: 200 }
    );

  } catch (err) {
    console.error('[Server Error]:', err);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}