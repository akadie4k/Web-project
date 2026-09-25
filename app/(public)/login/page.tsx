'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const successMessage = searchParams.get('registered') === 'true' ? 'สร้างบัญชีผู้ใช้งานสำเร็จแล้ว กรุณาเข้าสู่ระบบ' : '';
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        setIsLoading(false);
        return;
      }

      // นำทางตามประเภทผู้ใช้งาน
      if (data.user?.role === 'hospital_admin' || data.user?.role === 'system_admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch {
      setErrorMessage('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-[#ea384c] selection:text-white flex flex-col justify-start sm:justify-center items-center p-4 pt-6 sm:p-6">
      {/* ปุ่มย้อนกลับหน้าหลัก */}
      <div className="w-full max-w-[480px] mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#0e3b6c] transition"
        >
          <i className="fa-solid fa-arrow-left text-xs"></i>
          <span>กลับสู่หน้าหลัก</span>
        </Link>
      </div>

      {/* Main Card Container */}
      <main className="w-full max-w-[480px] bg-white rounded-3xl p-6 sm:p-10 border-2 border-slate-200 shadow-sm">
        
        {/* Brand Logo Header */}
        <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
          <Link href="/" className="flex items-center gap-3 select-none">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
              <Image
                src="/logo_bloodConnect.svg"
                alt="BloodConnect Logo"
                width={44}
                height={44}
                className="w-10 h-10 sm:w-11 sm:h-11 shrink-0"
                priority
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
            เข้าสู่ระบบ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ยินดีต้อนรับกลับสู่ศูนย์ประสานงานโลหิตฉุกเฉิน
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-700 font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-check shrink-0 text-emerald-600"></i>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-[#dc2626] font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation shrink-0"></i>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-xs sm:text-sm font-bold text-[#0e3b6c] mb-1.5">
              ชื่อผู้ใช้ (Username)
            </label>
            <div className="relative flex items-center">
              <i className="fa-solid fa-user text-slate-400 absolute left-4 text-sm"></i>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="กรอกชื่อผู้ใช้ของคุณ"
                required
                className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-[#0e3b6c] placeholder-slate-400 focus:outline-none focus:border-[#65a1f2] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-xs sm:text-sm font-bold text-[#0e3b6c] mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative flex items-center">
              <i className="fa-solid fa-lock text-slate-400 absolute left-4 text-sm"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="กรอกรหัสผ่าน"
                required
                className="w-full pl-11 pr-11 py-3 sm:py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-[#0e3b6c] placeholder-slate-400 focus:outline-none focus:border-[#65a1f2] focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none text-sm"
                aria-label="ดูรหัสผ่าน"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end pt-1">
            <Link
              href="/change-password"
              className="text-xs font-semibold text-slate-500 hover:text-[#ea384c] hover:underline transition"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>

          {/* Submit CTA Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-[0.99] text-white text-sm sm:text-base font-bold rounded-2xl shadow-md transition duration-150 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>กำลังเข้าสู่ระบบ...</span>
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Links */}
        <div className="mt-6 sm:mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            ยังไม่มีบัญชีผู้ใช้งาน?{' '}
            <Link
              href="/register"
              className="font-bold text-[#dc2626] hover:underline inline-flex items-center gap-1 ml-1"
            >
              สมัครสมาชิกใหม่
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400">กำลังโหลด...</div>}>
      <LoginForm />
    </Suspense>
  );
}
