'use client';

import React, { useState } from 'react';

export default function ListItemPage() {
  // 1. STATE (Memory Bins)
  const [fullName, setFullName] = useState('');
  const [burnerName, setBurnerName] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Shelter (Tents/Shade)');
  const [description, setDescription] = useState('');
  const [availability, setAvailability] = useState('');

  // 2. LOGIC (The Bouncer)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if required fields are filled
    if (!fullName || !itemName || !availability) {
      alert("Hold up! Please fill in your name, the item, and availability.");
      return;
    }

    alert(`Success!\nItem: ${itemName}\nCategory: ${category}\nOffer: ${availability}\nPosted by: ${fullName} (${burnerName})`);
    
    // Clear the form after submission
    setFullName('');
    setBurnerName('');
    setItemName('');
    setAvailability('');
    setDescription('');
  };

  // 3. UI (The Visuals)
  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h1 className="text-3xl font-bold mb-6 text-orange-600">List Your Playa Gear</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1">Name (Required)</label>
              <input 
                type="text" 
                required 
                className="w-full p-2 border rounded border-gray-300" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Burner or Preferred Name</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded border-gray-300" 
                value={burnerName} 
                onChange={(e) => setBurnerName(e.target.value)} 
              />
            </div>
          </div>

          {/* Section 2: Category */}
          <div>
            <label className="block font-bold mb-1">Category</label>
            <select 
              className="w-full p-2 border rounded border-gray-300" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Shelter (Tents/Shade)</option>
              <option>Power & Lighting</option>
              <option>Bicycles & Parts</option>
              <option>Kitchen & Water</option>
              <option>Costumes & Camp Decor</option>
              <option>Tools & Hardware</option>
              <option>Other Playa Essentials</option>
            </select>
          </div>

          {/* Section 3: Item */}
          <div>
            <label className="block font-bold mb-1">Item (Required)</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. Extra wide cruiser bike" 
              className="w-full p-2 border rounded border-gray-300" 
              value={itemName} 
              onChange={(e) => setItemName(e.target.value)} 
            />
          </div>

          {/* Section 4: Availability (Radio Buttons) */}
          <div className="space-y-2">
            <label className="block font-bold mb-1">Availability (Required)</label>
            
            <div className="flex items-center space-x-2">
              <input 
                type="radio" 
                id="keep" 
                name="availability" 
                required
                value="You can keep it" 
                checked={availability === "You can keep it"}
                onChange={(e) => setAvailability(e.target.value)}
              />
              <label htmlFor="keep">You can keep it</label>
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="radio" 
                id="borrow" 
                name="availability" 
                value="You can borrow it" 
                checked={availability === "You can borrow it"}
                onChange={(e) => setAvailability(e.target.value)}
              />
              <label htmlFor="borrow">You can borrow it</label>
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="radio" 
                id="not-available" 
                name="availability" 
                value="Not available" 
                checked={availability === "Not available"}
                onChange={(e) => setAvailability(e.target.value)}
              />
              <label htmlFor="not-available">Not available</label>
            </div>
          </div>

          {/* Section 5: Description */}
          <div>
            <label className="block font-bold mb-1">Description</label>
            <textarea 
              placeholder="Describe the condition, size, or any special instructions..." 
              className="w-full p-2 border rounded border-gray-300 h-32"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="w-full bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 transition"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}