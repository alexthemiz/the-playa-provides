import Link from 'next/link'

export default function Header() {
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl hover:opacity-80 transition">
          The Playa Provides
        </Link>
        
        {/* Navigation Links */}
        <nav className="flex gap-6 items-center">
          <Link href="/gear-feed" className="text-sm font-medium hover:text-blue-600 transition">
            Search for Gear
          </Link>
          <Link href="/list-item" className="text-sm font-medium hover:text-blue-600 transition">
            Share your Gear
          </Link>
          <Link href="/profile" className="text-sm font-medium hover:text-blue-600 transition">
            My Inventory
          </Link>
          <Link href="/settings" className="text-sm font-medium hover:text-blue-600 transition">
            Settings
          </Link>
          
          {/* Action Button */}
          <Link 
            href="/login" 
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition ml-2"
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  )
}