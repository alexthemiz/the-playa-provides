import { createClient } from '@/utils/supabase/server'
import ClientPage from './client-page'

async function getPreview(token: string) {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_informal_loan_preview', { p_token: token })
  return data?.[0] ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const preview = await getPreview(token)
  return {
    title: preview ? `${preview.owner_display_name} lent you ${preview.item_name} | The Playa Provides` : 'Loan Invite | The Playa Provides',
    description: preview ? `View the terms and claim this loan from ${preview.owner_display_name}.` : 'A loan invite from The Playa Provides.',
    openGraph: {
      images: preview?.item_image_url ? [preview.item_image_url] : undefined,
    },
  }
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ClientPage token={token} />
}
