import './globals.css'
import Header from '../components/header'
import Footer from '../components/footer'
import Script from 'next/script'

export const metadata = {
  title: 'The Playa Provides',
  description: 'A circular economy for the dust.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-[#2D241E]">
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
        
        <main className="min-h-screen bg-white w-full">
          {children}
        </main>
        
        <Footer />
      </body>
    </html>
  )
}