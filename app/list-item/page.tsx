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
  const [isSubmitted, setIsSubmitted] = useState(false); // The Switch

  // 2. LOGIC (The Bouncer & Switch)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if required fields are filled
    if (!fullName || !itemName || !availability) {
      alert("Hold up! Please fill in your name, the item, and availability.");
      return;
    }

    // Flip the switch to show the Success Message
    setIsSubmitted(true);
  };

  // 3. UI (The Visuals)
  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md border border-gray-200">
        
        {isSubmitted ? (
          /* --- SUCCESS SCREEN --- */
          <div className="py-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-green-600">Item Submitted!</h1>
            <p className="text-gray-600 italic">"The Playa provides, and so do you."</p>
            
            <div className="bg-gray-50 p-4 rounded-md border border-gray-100 text-left">
              <p><strong>Item:</strong> {itemName}</p>
              <p><strong>Offer:</strong> {availability}</p>
            </div>

            <button 
              onClick={() => alert("Inventory page coming soon!")}
              className="block w-full text-orange-600 font-bold hover:underline"
            >
              Click here to see your inventory
            </button>

            <button 
              onClick={() => {
                // Reset everything to list a new item
                setIsSubmitted(false);
                setItemName('');
                setDescription('');
                setAvailability('');
              }} 
              className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline"
            >
              ← List another item
            </button>
          </div>
        ) : (
          /* --- THE FORM --- */
          <>
            <h1 className="text-3xl font-bold mb-6 text-orange-600">List Your Playa Gear</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Names */}
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

              {/* Category */}
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

              {/* Item */}
              <div>
                <label className="block font-bold mb-1">Item (Required)</label>
                <input type="text" required placeholder="e.g. Extra wide cruiser bike" className="w-full p-2 border rounded border-gray-300" value={itemName} onChange={(e) => setItemName(e.target.value)} />
              </div>

              {/* Availability */}
              <div className="space-y-2">
                <label className="block font-bold mb-1">Availability (Required)</label>
                {['You can keep it', 'You can borrow it', 'Not available'].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      name="availability" 
                      required 
                      value={option} 
                      checked={availability === option}
                      onChange={(e) => setAvailability(e.target.value)} 
                    />
                    <label>{option}</label>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold mb-1">Description</label>
                <textarea 
                  placeholder="Describe details..." 
                  className="w-full p-2 border rounded border-gray-300 h-32"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
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