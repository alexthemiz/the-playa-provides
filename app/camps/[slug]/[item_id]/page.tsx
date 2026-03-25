import { redirect } from 'next/navigation';

export default function CampItemRedirect({
  params,
}: {
  params: { slug: string; item_id: string };
}) {
  redirect(`/find-items/${params.item_id}`);
}
