import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Send, AlertTriangle, Calendar, Shield } from 'lucide-react';

interface RequestModalProps {
  item: any;
  onClose: () => void;
}

export default function RequestModal({ item, onClose }: RequestModalProps) {
  const [message, setMessage] = useState(`Hi! I'm interested in your ${item.item_name}. Is it still available?`);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendRequest = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-request-email', {
        body: {
          itemId: item.id,
          ownerId: item.user_id,
          message: message,
          itemName: item.item_name,
        },
      });

      if (error) throw error;
      setSent(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to send request.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Request {item.item_name}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {sent ? (
            <div className="py-12 text-center">
              <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold">Message Sent!</h3>
              <p className="text-gray-500">The owner will receive an email shortly.</p>
            </div>
          ) : (
            <>
              {/* --- NEW: BORROWING DETAILS SECTION --- */}
              <div className="space-y-4 mb-6 border-b pb-6">
                
                {/* Dates Section */}
                {(item.pickup_by || item.return_by) && (
                  <div className="flex gap-4 text-sm text-gray-700">
                    {item.pickup_by && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Pick up: <strong>{new Date(item.pickup_by).toLocaleDateString()}</strong></span>
                      </div>
                    )}
                    {item.return_by && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Return: <strong>{new Date(item.return_by).toLocaleDateString()}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Return Terms */}
                {item.return_terms && (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Return Condition</h4>
                    <p className="text-sm text-gray-800 italic">"{item.return_terms}"</p>
                  </div>
                )}

                {/* Financial Agreements */}
                {(item.damage_price || item.loss_price) && (
                  <div className="grid grid-cols-2 gap-3">
                    {item.damage_price && (
                      <div className="flex items-start gap-2 p-2 rounded-lg border border-orange-100 bg-orange-50/30">
                        <Shield className="w-4 h-4 text-orange-500 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">Damage</span>
                          <span className="text-sm font-bold text-gray-900">${Math.round(item.damage_price)}</span>
                        </div>
                      </div>
                    )}
                    {item.loss_price && (
                      <div className="flex items-start gap-2 p-2 rounded-lg border border-red-100 bg-red-50/30">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">Loss</span>
                          <span className="text-sm font-bold text-gray-900">${Math.round(item.loss_price)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* --- END OF NEW SECTION --- */}

              <p className="text-sm text-gray-600 mb-4">
                Send a message to the owner to coordinate the handoff.
              </p>
              <textarea
                className="w-full border rounded-xl p-3 h-24 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                onClick={handleSendRequest}
                disabled={sending || !message.trim()}
                className="w-full mt-4 bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {sending ? 'Sending...' : 'Send Request'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}