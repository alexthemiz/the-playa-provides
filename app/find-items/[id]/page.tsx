"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabaseClient"; 
import Link from "next/link";
import { ArrowLeft, Share2, Mail, MapPin, User } from "lucide-react";

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchItem();
  }, [id]);

  async function fetchItem() {
    setLoading(true);
    
    // 1. Fetch the Item
    const { data: itemData, error: itemError } = await supabase
      .from("gear_items")
      .select("*")
      .eq("id", id)
      .single();

    if (itemError) {
      console.error("Item Fetch Error:", itemError.message);
      setItem(null);
      setLoading(false);
      return;
    }

    // 2. Fetch the Profile
    if (itemData.user_id) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("preferred_name")
        .eq("id", itemData.user_id)
        .single();
      
      if (profileData) itemData.profiles = profileData;
    }

    // 3. NEW: Fetch the Location (using location_id from the item)
    if (itemData.location_id) {
      const { data: locationData } = await supabase
        .from("locations")
        .select("city, state, zip_code")
        .eq("id", itemData.location_id)
        .single();
      
      if (locationData) itemData.locations = locationData;
    }

    console.log("Success! Full Data Stack:", itemData);
    setItem(itemData);
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-center">Loading The Playa Provides...</div>;

  if (!item) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Item not found</h1>
        <Link href="/find-items">
          <button className="inline-flex items-center px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
          </button>
        </Link>
      </div>
    );
  }

return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/find-items" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card border rounded-xl overflow-hidden shadow-sm">
        {/* Image Section - Shows the first image in the array */}
        <div className="aspect-square bg-muted flex items-center justify-center border-r">
          {item.image_urls && item.image_urls.length > 0 ? (
            <img src={item.image_urls[0]} alt={item.item_name} className="object-cover w-full h-full" />
          ) : (
            <div className="text-center p-4">
               <span className="text-muted-foreground italic block">No Image Provided</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-8 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{item.item_name}</h1>
              <button 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>

            {/* Location & Owner Row */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-orange-500" />
                <span>{item.locations?.city}, {item.locations?.state}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4 text-blue-500" />
                <span>{item.profiles?.preferred_name || "Anonymous"}</span>
              </div>
            </div>

            <p className="text-lg mb-6 leading-relaxed">
              {item.description || "No description provided."}
            </p>

            {/* Quick Details Grid */}
            <div className="grid grid-cols-2 gap-4 border-t pt-6 text-sm">
              <div>
                <span className="block text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Condition</span>
                <span className="font-medium">{item.condition || "Not specified"}</span>
              </div>
              <div>
                <span className="block text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Status</span>
                <span className="font-medium text-green-600">{item.availability_status}</span>
              </div>
              <div>
                <span className="block text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Category</span>
                <span className="font-medium">{item.category}</span>
              </div>
              <div>
                <span className="block text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Pickup By</span>
                <span className="font-medium">{item.pickup_by || "Flexible"}</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button className="w-full h-12 text-lg font-semibold bg-black text-white rounded-md shadow-md hover:opacity-90 transition-all flex items-center justify-center">
              <Mail className="mr-2 h-5 w-5" /> Request from {item.profiles?.preferred_name || "Owner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}