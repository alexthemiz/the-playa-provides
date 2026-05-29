import { createClient } from '@/utils/supabase/server'
import ClientPage from './client-page'

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, bio')
    .eq('username', username.toLowerCase())
    .single()

  return {
    title: profile ? `${profile.username} | The Playa Provides` : 'Profile | The Playa Provides',
    description: profile?.bio || `${profile?.username ?? username}'s gear sharing profile on The Playa Provides.`,
  }
}

export default function Page() {
  return <ClientPage />
}
