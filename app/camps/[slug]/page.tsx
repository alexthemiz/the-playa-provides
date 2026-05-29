import { createClient } from '@/utils/supabase/server'
import ClientPage from './client-page'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: camp } = await supabase
    .from('camps')
    .select('display_name, description')
    .eq('slug', slug)
    .single()

  return {
    title: camp ? `${camp.display_name} | The Playa Provides` : 'Camp | The Playa Provides',
    description: camp?.description || `${camp?.display_name ?? 'This camp'} on The Playa Provides gear sharing platform.`,
  }
}

export default function Page() {
  return <ClientPage />
}
