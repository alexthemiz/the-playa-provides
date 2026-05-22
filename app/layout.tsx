import './globals.css'
import Header from '../components/header'
import Footer from '../components/footer'
import FeedbackWidget from '../components/FeedbackWidget'
import Script from 'next/script'

export const metadata = {
  title: 'The Playa Provides',
  description: 'A circular economy for the dust.',
  openGraph: {
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