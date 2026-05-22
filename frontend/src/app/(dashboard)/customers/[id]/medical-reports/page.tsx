'use client';

import { useParams } from 'next/navigation';
import ModulePageHeader from '@/components/customers/ModulePageHeader';
import MedicalReportsTab from '@/components/customers/MedicalReportsTab';

/** Medical Reports sub-page for a customer. */
export default function CustomerMedicalReportsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <ModulePageHeader customerId={id} title="Medical Reports" />
      <MedicalReportsTab customerId={id} />
    </div>
  );
}
