'use client';

import React from 'react';

export default function ListItemPage() {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-orange-600">List Your Playa Gear</h1>
      
      <form className="space-y-6 bg-white p-6 rounded-lg shadow-md border border-gray-200 text-black">
        
        {/* Burner Name */}
        <div>
          <label className="block font-bold mb-1">Burner Name</label>
          <input type="text" placeholder="Your Playa name" className="w-full p-2 border rounded" />
        </div>

        {/* Item Name */}
        <div>
          <label className="block font-bold mb-1">Item Name</label>
          <input type="text" placeholder="e.g. Extra wide cruiser bike" className="w-full p-2 border rounded" />
        </div>
        
        {/* Category */}
        <div>
          <label className="block font-bold mb-1">Category</label>
          <select className="w-full p-2 border rounded">
            <option>Shelter (Tents/Shade)</option>
            <option>Power & Lighting</option>
            <option>Bicycles & Parts</option>
            <option>Kitchen & Water</option>
            <option>Costumes & Camp Decor</option>
            <option>Tools & Hardware</option>
            <option>Other Playa Essentials</option>
          </select>
        </div>

        {/* Description - This replaces the need for subcategories! */}
        <div>
          <label className="block font-bold mb-1">Details / Description</label>
          <textarea 
            placeholder="Tell us more! (e.g. missing a kickstand, needs a 5lb propane tank, fits 3 people...)" 
            className="w-full p-2 border rounded h-24"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block font-bold mb-1">Location / Pickup Info</label>
          <input type="text" placeholder="e.g. 4:30 & J or Reno (Pre-event)" className="w-full p-2 border rounded" />
        </div>

        <button type="submit" className="w-full bg-orange-600 text-white p-3 rounded font-bold hover:bg-orange-700 transition">
          Post to The Playa Provides
        </button>
      </form>
    </div>
  );
}