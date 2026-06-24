import { redirect } from 'next/navigation';
export default function Page({ params }: { params: { id: string } }) {
  redirect(`/admin/procurement/purchase-orders/${params.id}`);
}
