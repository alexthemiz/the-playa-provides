import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t mt-20">
      <div className="max-w-7xl mx-auto py-10 px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} The Playa Provides. All rights reserved.
        </p>
        <nav className="flex gap-6 text-sm text-gray-600">
          <Link href="/about" className="hover:text-black transition">About</Link>
          <Link href="/terms" className="hover:text-black transition">Terms & Conditions</Link>
          <Link href="/privacy" className="hover:text-black transition">Privacy Policy</Link>
        </nav>
      </div>
    </footer>
  )
}