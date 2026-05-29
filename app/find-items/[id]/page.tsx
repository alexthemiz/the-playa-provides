import { createClient } from '@/utils/supabase/server'
import ClientPage from './client-page'

async function getItem(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('gear_items')
    .select('item_name, description, image_urls')
    .eq('id', id)
    .single()
  return data
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getItem(id)
  return {
    title: item ? `${item.item_name} | The Playa Provides` : 'Item | The Playa Provides',
    description: item?.description || 'Gear available in the Burning Man community gear share.',
    openGraph: {
      images: item?.image_urls?.[0] ? [item.image_urls[0]] : undefined,
    },
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getItem(id)

  const jsonLd = item
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: item.item_name,
        description: item.description || '',
        image: item.image_urls?.[0] || '',
        offers: {
          '@type': 'Offer',
          availability: 'https://schema.org/InStock',
          price: '0',
          priceCurrency: 'USD',
        },
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ClientPage params={params} />
    </>
  )
}
