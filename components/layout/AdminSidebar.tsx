'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import DonorNavbar from '@/components/layout/DonorNavbar';
import Footer from '@/components/layout/Footer';
import { basePath, Icon } from '@/components/ui/blood-request';

const items = [
  { label: 'Dashboard', icon: 'home' as const, href: '/admin/dashboard' },
  { label: 'Blood Request', icon: 'file' as const, href: '/admin/blood-requests' },
  { label: 'Notifications', icon: 'bell' as const },
  { label: 'History', icon: 'clock' as const },
  { label: 'Users', icon: 'users' as const },
  { label: 'Hospitals', icon: 'hospital' as const, href: '/admin/hospitals' }, // แก้ไขจาก /admin/hospital เป็น /admin/hospitals
  { label: 'Reports', icon: 'clock' as const },
  { label: 'Settings', icon: 'clock' as const },
];

export default function AdminSidebar({ children, userName }: { children: ReactNode; userName: string }) {
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen w-full bg-[#f3f7fb] font-sans text-[#0e3b6c]">
    <a className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:p-3" href="#blood-request-main">ข้ามไปยังเนื้อหา</a>
    {open && <button className="fixed inset-0 z-[55] bg-slate-900/40 md:hidden" type="button" aria-label="ปิดเมนู" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-[60] flex h-dvh w-64 flex-col overflow-y-auto border-r border-[#dee8f3] bg-[#fafdff] px-3 py-5 transition-transform duration-300 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`} aria-label="เมนูผู้ดูแล">
      <div className="mb-6 flex items-center justify-between gap-2 px-1">
        <Link className="flex min-w-0 items-center gap-2" href={basePath} onClick={() => setOpen(false)}>
          <Image className="h-11 w-9 shrink-0 object-contain" src="/logo_bloodConnect.svg" alt="BloodConnect" width={36} height={44} priority />
          <span className="min-w-0"><b className="block text-[21px] leading-tight text-[#0e3b6c]">Blood<span className="text-[#dc2626]">Connect</span></b><small className="block text-[9px] text-[#65a1f2]">Connect Lives Save Lives</small></span>
        </Link>
        <button type="button" className="text-xl text-slate-500 md:hidden" aria-label="ปิดเมนู" onClick={() => setOpen(false)}>×</button>
      </div>
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-white p-3">
        <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-[#36577e] text-2xl text-white">{userName.slice(0, 1).toUpperCase()}<i className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-emerald-500" /></span>
        <div className="min-w-0"><strong className="block break-words text-sm">{userName}</strong><small className="block text-xs text-[#6480a1]">เจ้าหน้าที่โรงพยาบาล</small><small className="text-xs text-emerald-600">● ออนไลน์</small></div>
      </div>
      <nav aria-label="เมนูหลัก" className="space-y-1">{items.map(item => item.href
        ? <Link key={item.label} className="flex min-h-12 items-center gap-4 rounded-lg border-l-2 border-[#dc2626] bg-[#fde9ed] px-4 text-sm font-semibold text-[#dc2626]" href={item.href} onClick={() => setOpen(false)}><Icon name={item.icon} />{item.label}</Link>
        : <span key={item.label} className="flex min-h-12 items-center gap-4 rounded-lg px-4 text-sm text-[#0e3b6c] opacity-70" aria-disabled="true"><Icon name={item.icon} />{item.label}</span>)}</nav>
      <div className="mt-auto px-3 pt-10">
        <strong className="text-lg leading-7">ทุกหยดเลือด<br />คือโอกาสให้ชีวิต</strong>
        <p className="mt-2 text-sm text-[#6480a1]">Give Blood<br />Give Hope</p>
        <div className="mt-3 h-20 overflow-hidden rounded-lg bg-[#ffedf1] text-center text-6xl text-[#f6a8b4]" aria-hidden="true">♥</div>
        <div className="mt-5 flex items-center gap-2 text-xs"><Image src="/logo_bloodConnect.svg" alt="" width={24} height={28} /><span>BloodConnect<small className="block text-[10px] text-[#6480a1]">© 2026 All rights reserved.</small></span></div>
      </div>
    </aside>
    <div className="flex min-h-screen flex-col md:ml-64">
      <DonorNavbar onMenuClick={() => setOpen(true)} />
      <main id="blood-request-main" className="mx-auto w-full max-w-[1800px] flex-1 px-3 pb-8 pt-[116px] sm:px-6 md:pt-20">{children}</main>
      <Footer />
    </div>
  </div>;
}