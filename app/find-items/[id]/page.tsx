'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ArrowLeft, Share2, Mail, MapPin, User, ChevronLeft, ChevronRight, Package, ShieldCheck, Clock } from "lucide-react";
import ImageSlider from '@/components/ImageSlider';
export default function ItemDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchItemDetails();
  }, [id]);

  async function fetchItemDetails() {
    setLoading(true);
    // Fetch the gear item
    const { data: gearData, error } = await supabase
      .from('gear_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !gearData) {
      console.error("Error fetching item:", error);
      setLoading(false);
      return;
    }

    // Fetch Profile and Location manually for full data stack
    const { data: profile } = await supabase.from('profiles').select('preferred_name').eq('id', gearData.user_id).single();
    const { data: location } = await supabase.from('locations').select('city, state, zip_code').eq('id', gearData.location_id).single();

    setItem({
      ...gearData,
      profiles: profile,
      locations: location
    });
    setLoading(false);
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Loading gear details...</div>;
  if (!item) return <div className="p-20 text-center">Item not found.</div>;

  const mailtoLink = `mailto:?subject=Interest in: ${item.item_name}&body=Hi ${item.profiles?.preferred_name || 'there'}, I saw your ${item.item_name} on the Find Items app...`;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-screen">
      {/* Navigation */}
      <Link href="/find-items" className="inline-flex items-center text-sm text-gray-400 hover:text-cyan-400 mb-8 transition-colors group">
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
        Back to Inventory
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-[#0a0a0a] border border-[#222] rounded-3xl overflow-hidden shadow-2xl">
        
{/* Left: Image Slider Section */}
<div className="bg-[#111] aspect-square lg:aspect-auto">
  <ImageSlider images={item.image_urls} aspectRatio="aspect-auto h-full" />
</div>

        {/* Right: Content Section */}
        <div className="p-8 md:p-12 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4 border border-cyan-500/20">
                  {item.category}
                </span>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2 leading-tight">
                  {item.item_name}
                </h1>
              </div>
              <button 
                onClick={copyLink}
                className="p-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-2xl transition-all active:scale-95"
                title="Share Item"
              >
                <Share2 className="h-5 w-5 text-gray-300" />
              </button>
            </div>

            {/* Location & Owner Row */}
            <div className="flex flex-wrap gap-6 mb-8 py-4 border-y border-[#222]">
              <div className="flex items-center gap-2 text-gray-300">
                <MapPin className="h-5 w-5 text-orange-500" />
                <span className="font-medium">{item.locations?.city}, {item.locations?.state}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <User className="h-5 w-5 text-cyan-400" />
                <span className="font-medium">Owner: {item.profiles?.preferred_name || "Anonymous"}</span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Description</h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                {item.description || "No additional description provided for this gear."}
              </p>
            </div>

            {/* Quick Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-2">
              <DetailItem icon={<ShieldCheck className="h-4 w-4" />} label="Condition" value={item.condition || "Used"} />
              <DetailItem icon={<Package className="h-4 w-4" />} label="Status" value={item.availability_status} />
              <DetailItem icon={<Clock className="h-4 w-4" />} label="Pickup" value={item.pickup_by ? `By ${item.pickup_by}` : "Flexible"} />
            </div>
          </div>

          <div className="mt-12">
            <a 
              href={mailtoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-16 text-lg font-bold bg-cyan-500 hover:bg-cyan-400 text-black rounded-2xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center active:scale-[0.98]"
            >
              <Mail className="mr-3 h-6 w-6" /> Request from {item.profiles?.preferred_name || "Owner"}
            </a>
            <p className="text-center text-gray-500 text-xs mt-4 uppercase tracking-tighter">
              Securely connects you via email
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-500">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-gray-200 font-semibold">{value}</span>
    </div>
  );
}