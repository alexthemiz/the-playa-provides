'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function ListItemPage() {
  // 1. STATE
  const [fullName, setFullName] = useState('');
  const [burnerName, setBurnerName] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Shelter (Tents/Shade)');
  const [description, setDescription] = useState('');
  const [availability, setAvailability] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // New Location State
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [locationType, setLocationType] = useState('Home');

  // 2. LOGIC
  const handleZipChange = async (val: string) => {
    setZip(val);
    if (val.length === 5) {
      try {
        const response = await fetch(`https://api.zippopotam.us/us/${val}`);
        if (response.ok) {
          const data = await response.json();
          const place = data.places[0];
          setCity(place['place name']);
          setState(place['state abbreviation']);
        }
      } catch (error) {
        console.error("Zip lookup failed", error);
      }
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. The Bouncer (Check required fields)
    if (!fullName || !itemName || !availability) {
      alert("Please fill in the required fields (Name, Item, and Availability).");
      return;
    }

    // 2. The Cloud Upload
    // We tell Supabase: "Insert this object into the 'gear_items' table"
    const { data, error } = await supabase
      .from('gear_items')
      .insert([
        { 
          full_name: fullName,
          burner_name: burnerName,
          item_name: itemName,
          category: category,
          description: description,
          availability: availability,
          zip_code: zip,
          city: city,
          state: state,
          location_type: locationType
        },
      ]);

    if (error) {
      console.error("Error uploading to Supabase:", error.message);
      alert("Something went wrong saving to the cloud: " + error.message);
    } else {
      // 3. Success! Flip the switch
      setIsSubmitted(true);
    }
  };

  // 3. UI
  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md border border-gray-200">
        
        {isSubmitted ? (
          <div className="py-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-green-600">Item Submitted!</h1>
            <p className="text-gray-600 italic">"The Playa provides, and so do you."</p>
            
            <div className="bg-gray-50 p-4 rounded-md border border-gray-100 text-left space-y-2">
              <p><strong>Item:</strong> {itemName}</p>
              <p><strong>Location:</strong> {city}, {state} ({locationType})</p>
            </div>

            <Link href="/inventory" className="block w-full bg-gray-100 text-orange-600 font-bold py-3 rounded-md hover:bg-gray-200 text-center">
              Click here to see your inventory
            </Link>

            <button onClick={() => { setIsSubmitted(false); setItemName(''); setZip(''); setCity(''); setState(''); }} 
                    className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline">
              ← List another item
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-6 text-orange-600">List Your Playa Gear</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Name (Required)</label>
                  <input type="text" required className="w-full p-2 border rounded border-gray-300" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="block font-bold mb-1">Burner/Preferred Name</label>
                  <input type="text" className="w-full p-2 border rounded border-gray-300" value={burnerName} onChange={(e) => setBurnerName(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Category</label>
                <select className="w-full p-2 border rounded border-gray-300" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>Shelter (Tents/Shade)</option>
                  <option>Power & Lighting</option>
                  <option>Bicycles & Parts</option>
                  <option>Kitchen & Water</option>
                  <option>Costumes & Camp Decor</option>
                  <option>Tools & Hardware</option>
                  <option>Other Playa Essentials</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Item (Required)</label>
                <input type="text" required placeholder="e.g. Extra wide cruiser bike" className="w-full p-2 border rounded border-gray-300" value={itemName} onChange={(e) => setItemName(e.target.value)} />
              </div>

{/* LOCATION SECTION */}
<div className="bg-orange-50 p-4 rounded-md border border-orange-100 space-y-4">
  <h3 className="font-bold text-orange-800 text-sm uppercase">Item Location (Default World)</h3>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="col-span-1">
      <label className="block text-xs font-bold mb-1">Zip Code</label>
      <input 
        type="text" 
        maxLength={5} 
        className="w-full p-2 border rounded border-gray-300" 
        value={zip} 
        onChange={(e) => handleZipChange(e.target.value)} 
        placeholder="Optional"
      />
    </div>
    <div className="col-span-2">
      <label className="block text-xs font-bold mb-1">City</label>
      <input 
        type="text" 
        className="w-full p-2 border rounded border-gray-300 bg-white" 
        value={city} 
        onChange={(e) => setCity(e.target.value)} 
      />
    </div>
    <div className="col-span-1">
      <label className="block text-xs font-bold mb-1">State</label>
      <input 
        type="text" 
        placeholder="e.g. CA"
        className="w-full p-2 border rounded border-gray-300 bg-white" 
        value={state} 
        onChange={(e) => setState(e.target.value)} // Now they can type here!
      />
    </div>
  </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Location Type</label>
                  <select className="w-full p-2 border rounded border-gray-300" value={locationType} onChange={(e) => setLocationType(e.target.value)}>
                    <option>Home</option>
                    <option>Business</option>
                    <option>Storage Unit</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold mb-1">Availability (Required)</label>
                {['You can keep it', 'You can borrow it', 'Not available'].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <input type="radio" name="availability" required value={option} checked={availability === option} onChange={(e) => setAvailability(e.target.value)} />
                    <label>{option}</label>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold mb-1">Description</label>
                <textarea placeholder="Describe details..." className="w-full p-2 border rounded border-gray-300 h-32" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <button type="submit" className="w-full bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 transition">
                Submit
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}