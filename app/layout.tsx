import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Header from '../components/header'
import Footer from '../components/footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'The Playa Provides',
  description: 'Burner-to-Burner marketplace for the playa and beyond.',
}

export default function RootLayout({
  children,
  modal, // ADDED THIS
}: {
  children: React.ReactNode
  modal: React.ReactNode // ADDED THIS
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          {modal} {/* ADDED THIS: This is where the popup "lives" */}
          <Footer />
        </div>
      </body>
    </html>
  )
}