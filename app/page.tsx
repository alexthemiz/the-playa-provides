import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h1 className="text-5xl font-bold mb-6">The Playa Provides</h1>
      <p className="text-xl mb-8 max-w-2xl text-gray-600">
        The ultimate peer-to-peer gear sharing network for the dust. 
        Don't let good gear sit in storage—share the magic.
      </p>
      <div className="flex gap-4">
        <Link href="/list-item" className="bg-black text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition">
          List Your Gear
        </Link>
        <Link href="/about" className="border border-black px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition">
          How it Works
        </Link>
      </div>
    </div>
  );
}