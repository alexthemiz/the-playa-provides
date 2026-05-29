import { Metadata } from 'next'
import ClientPage from './client-page'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ClientPage />
}
