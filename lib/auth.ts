import { redirect } from 'next/navigation';
import { supabaseAdmin } from './supabaseAdmin';
import { getSessionToken } from './session';

export interface AuthUser {
  user_id: string;
  user_name: string;
  full_name: string;
  role: 'donor' | 'hospital_admin';
  hospital_id?: string | null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

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

  if (error || !sessionData?.users) return null;

  return (sessionData.users as unknown) as AuthUser;
}

export async function requireAuth(allowedRoles?: string[]) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect('/dashboard');
  }
  return user;
}