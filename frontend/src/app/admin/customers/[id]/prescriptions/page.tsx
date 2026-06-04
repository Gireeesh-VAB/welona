'use client';

import { useParams } from 'next/navigation';
import ModulePageHeader from '@/components/admin-customers/ModulePageHeader';
import PrescriptionsTab from '@/components/admin-customers/PrescriptionsTab';

/** Prescriptions sub-page for a customer. */
export default function CustomerPrescriptionsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <ModulePageHeader customerId={id} title="Prescriptions" />
      <PrescriptionsTab customerId={id} />
    </div>
  );
}
