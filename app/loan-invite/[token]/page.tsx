import ClientPage from './client-page'

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ClientPage token={token} />
}
