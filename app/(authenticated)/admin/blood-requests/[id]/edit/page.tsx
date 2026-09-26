import { notFound, redirect } from 'next/navigation';
import EditRequest from '@/components/ui/EditRequest';
import { getBloodRequestForUser, getHospitalForUser } from '../../data';
import { requireHospitalAdmin } from '@/lib/requireHospitalAdmin';
import { effectiveBloodRequestStatus } from '@/types/database';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireHospitalAdmin();
  const [request, hospital] = await Promise.all([
    getBloodRequestForUser(user, id),
    getHospitalForUser(user),
  ]);

  if (!request) notFound();

  // สถานะที่จบแล้วจริงๆ ห้ามแก้ไข
  if (request.status === 'FULFILLED' || request.status === 'CANCELLED') {
    redirect(`/admin/blood-requests/${id}`);
  }

  const isExpired = effectiveBloodRequestStatus(request.status, request.date) === 'EXPIRED';

  return (
    <EditRequest
      request={request}
      hospital={hospital}
      isExpired={isExpired}
    />
  );
}
