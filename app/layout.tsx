import './globals.css'
import Header from '../components/header'
import Footer from '../components/footer'
import FeedbackWidget from '../components/FeedbackWidget'
import Script from 'next/script'

export const metadata = {
  metadataBase: new URL('https://theplayaprovides.com'),
  title: 'The Playa Provides',
  description: 'A circular economy for the dust.',
  openGraph: {
    type: 'website',
    siteName: 'The Playa Provides',
    title: 'The Playa Provides',
    description: 'Peer-to-peer gear sharing for the Burning Man community.',
    images: [{ url: '/TPP_logo1.png', width: 1200, height: 630, alt: 'The Playa Provides' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Playa Provides',
    description: 'Peer-to-peer gear sharing for the Burning Man community.',
    images: ['/TPP_logo1.png'],
  },
}

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal?: React.ReactNode
}) {
  return (
    <html lang="en">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Arvo:ital,wght@0,400;0,700;1,400;1,700&family=Outfit:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <body style={{ backgroundColor: 'var(--paper)', color: 'var(--ink)', margin: 0 }}>
        {/* Google Analytics - Next.js Optimized Tracking */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-513K8Z20B4"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-513K8Z20B4');
          `}
        </Script>

        <Header />

        <main style={{ minHeight: '100vh', width: '100%' }}>
          {children}
          {modal}
        </main>

        <Footer />
        <FeedbackWidget />
      </body>
    </html>
  )
}