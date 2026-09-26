import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';

export async function POST() {
  try {
    // delete session from db
    // Clear Cookie (Browser side)
    await destroySession();

    return NextResponse.json({ message: 'ออกจากระบบสำเร็จ' });
  } catch (err: any) {
    console.error('Logout Error:', err);
    return NextResponse.json({ error: 'ไม่สามารถออกจากระบบได้' }, { status: 500 });
  }
}