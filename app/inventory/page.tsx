'use client';

import React from 'react';
import Link from 'next/link';

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-orange-600">My Inventory</h1>
          <Link 
            href="/list-item" 
            className="bg-orange-600 text-white px-4 py-2 rounded font-bold hover:bg-orange-700"
          >
            + List New Item
          </Link>
        </div>

        <div className="bg-white p-12 rounded-lg shadow-md border border-gray-200 text-center">
          <p className="text-gray-500 text-lg">Your inventory is empty... for now.</p>
          <p className="text-gray-400 italic mt-2">The Playa provides when you do!</p>
        </div>
      </div>
    </div>
  );
}