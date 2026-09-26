import { redirect } from 'next/navigation';
import { getCurrentUser } from './auth';

export async function requireHospitalAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'hospital_admin') {
    redirect('/dashboard');
  }

  return user;
}