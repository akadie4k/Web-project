'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function ChangePasswordPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [last4Digits, setLast4Digits] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (last4Digits.trim().length !== 4) {
      setErrorMsg('กรุณากรอกเลข 4 ตัวท้ายของเบอร์โทรศัพท์ให้ครบถ้วน');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          last4Digits: last4Digits.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
      } else {
        setSuccessMsg('เปลี่ยนรหัสผ่านสำเร็จ กำลังพากลับไปหน้าเข้าสู่ระบบ...');
        setTimeout(() => {
          router.push('/login');
        }, 1800);
      }
    } catch {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-[#ea384c] selection:text-white flex flex-col justify-center items-center p-4 sm:p-6 relative">
      <div className="w-full max-w-[480px] mb-4">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#0e3b6c] transition"
        >
          <i className="fa-solid fa-arrow-left text-xs"></i>
          <span>กลับไปหน้าเข้าสู่ระบบ</span>
        </Link>
      </div>

      <main className="w-full max-w-[480px] bg-white rounded-3xl p-6 sm:p-10 border-2 border-slate-200 shadow-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
          <Link href="/" className="flex items-center gap-3 select-none">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
              <Image 
                src="/logo_bloodConnect.svg" 
                alt="BloodConnect Logo" 
                width={44} 
                height={44} 
                className="w-10 h-10 sm:w-11 sm:h-11 shrink-0"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-[#0e3b6c]">
                Blood<span className="text-[#ea384c]">Connect</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#65a1f2] tracking-wider mt-1 uppercase">
                CONNECT LIVES SAVE LIVES
              </span>
            </div>
          </Link>
        </div>

        {/* Title */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-[#0e3b6c] tracking-tight">
            ตั้งรหัสผ่านใหม่
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            ยืนยันตัวตนด้วยเลข 4 ตัวท้ายของเบอร์โทรศัพท์ที่ลงทะเบียน
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-[#dc2626]">
            <i className="fa-solid fa-circle-exclamation shrink-0 text-sm"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-emerald-700">
            <i className="fa-solid fa-circle-check shrink-0 text-sm"></i>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-xs sm:text-sm font-bold text-[#0e3b6c] mb-1.5">
              ชื่อผู้ใช้ (Username)
            </label>
            <div className="relative flex items-center">
              <i className="fa-solid fa-user text-slate-400 absolute left-4 text-sm"></i>
              <input 
                type="text" 
                id="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ชื่อผู้ใช้ที่ต้องการเปลี่ยนรหัส" 
                required
                disabled={loading}
                className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-[#0e3b6c] placeholder-slate-400 focus:outline-none focus:border-[#65a1f2] focus:bg-white disabled:opacity-60 transition"
              />
            </div>
          </div>

          {/* 4 Digits Verification */}
          <div>
            <label htmlFor="last4Digits" className="block text-xs sm:text-sm font-bold text-[#0e3b6c] mb-1.5">
              เลข 4 ตัวท้ายของเบอร์โทรศัพท์
            </label>
            <div className="relative flex items-center">
              <i className="fa-solid fa-phone text-slate-400 absolute left-4 text-sm"></i>
              <input 
                type="text" 
                id="last4Digits" 
                maxLength={4}
                value={last4Digits}
                onChange={(e) => setLast4Digits(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="เช่น 1246" 
                required
                disabled={loading}
                className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-[#0e3b6c] placeholder-slate-400 tracking-widest focus:outline-none focus:border-[#65a1f2] focus:bg-white disabled:opacity-60 transition"
              />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="new-password" className="block text-xs sm:text-sm font-bold text-[#0e3b6c] mb-1.5">
              รหัสผ่านใหม่ (New Password)
            </label>
            <div className="relative flex items-center">
              <i className="fa-solid fa-key text-slate-400 absolute left-4 text-sm"></i>
              <input 
                type={showPassword ? 'text' : 'password'}
                id="new-password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กำหนดรหัสผ่านใหม่อย่างน้อย 6 ตัว" 
                required
                disabled={loading}
                className="w-full pl-11 pr-11 py-2.5 sm:py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-[#0e3b6c] placeholder-slate-400 focus:outline-none focus:border-[#65a1f2] focus:bg-white disabled:opacity-60 transition"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 text-slate-400 hover:text-slate-600 text-sm focus:outline-none"
                aria-label="ดูรหัสผ่าน"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-password" className="block text-xs sm:text-sm font-bold text-[#0e3b6c] mb-1.5">
              ยืนยันรหัสผ่านใหม่ (Confirm Password)
            </label>
            <div className="relative flex items-center">
              <i className="fa-solid fa-shield-halved text-slate-400 absolute left-4 text-sm"></i>
              <input 
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirm-password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง" 
                required
                disabled={loading}
                className="w-full pl-11 pr-11 py-2.5 sm:py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-[#0e3b6c] placeholder-slate-400 focus:outline-none focus:border-[#65a1f2] focus:bg-white disabled:opacity-60 transition"
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-4 text-slate-400 hover:text-slate-600 text-sm focus:outline-none"
                aria-label="ดูรหัสผ่าน"
              >
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#dc2626] hover:bg-[#b91c1c] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold rounded-2xl shadow-md transition duration-150 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : (
                <span>ยืนยันการเปลี่ยนรหัสผ่าน</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}