import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Send, AlertTriangle, Calendar, Shield } from 'lucide-react';

interface RequestModalProps {
  item: any;
  onClose: () => void;
}

function buildInitialMessage(item: any): string {
  const terms: string[] = [];
  if (item.pickup_by) terms.push(`• Pick up by: ${new Date(item.pickup_by).toLocaleDateString()}`);
  if (item.return_by) terms.push(`• Return by: ${new Date(item.return_by).toLocaleDateString()}`);
  if (item.damage_price) terms.push(`• Damage agreement: $${item.damage_price}`);
  if (item.loss_price) terms.push(`• Loss agreement: $${item.loss_price}`);
  if (item.return_terms) terms.push(`• Condition: "${item.return_terms}"`);
  if (terms.length > 0) {
    return `Hi! I'm interested in your ${item.item_name}.\n\nI've reviewed and accept the terms:\n${terms.join('\n')}\n\nIs it still available?`;
  }
  return `Hi! I'm interested in your ${item.item_name}. Is it still available?`;
}

export default function RequestModal({ item, onClose }: RequestModalProps) {
  const [message, setMessage] = useState(() => buildInitialMessage(item));
  const [pickupDate, setPickupDate] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');

  useEffect(() => {
    async function getRequesterInfo() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setRequesterEmail(user.email || '');
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_name, contact_email')
        .eq('id', user.id)
        .maybeSingle();
      if (profile) {
        setRequesterName(profile.preferred_name || '');
        if (profile.contact_email) setRequesterEmail(profile.contact_email);
      }
    }
    getRequesterInfo();
  }, []);

  const handleSendRequest = async () => {
    setSending(true);
    setSendError('');
    try {
      const fullMessage = pickupDate
        ? `Desired pickup date: ${new Date(pickupDate + 'T12:00:00').toLocaleDateString()}\n\n${message}`
        : message;

      const { data, error } = await supabase.functions.invoke('send-request-email', {
        body: {
          itemId: item.id,
          ownerId: item.user_id,
          message: fullMessage,
          itemName: item.item_name,
          requesterName,
          requesterEmail,
        },
      });

      if (error) throw error;
      setSent(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Error:', err);
      setSendError('Something went wrong sending your request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 2000 }}>
      <div className="bg-white rounded-2xl max-w-md w-full overflow-y-auto max-h-[90vh] shadow-2xl">
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
              {/* --- BORROWING TERMS --- */}
              {(item.pickup_by || item.return_by || item.return_terms || item.damage_price || item.loss_price) && (
                <div className="flex gap-3 mb-5">
                  {(item.pickup_by || item.return_by || item.damage_price || item.loss_price) && (
                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 flex-1 space-y-2">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Borrowing Terms</h4>
                      {item.pickup_by && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>Pick up by: <strong>{new Date(item.pickup_by).toLocaleDateString()}</strong></span>
                        </div>
                      )}
                      {item.return_by && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>Return by: <strong>{new Date(item.return_by).toLocaleDateString()}</strong></span>
                        </div>
                      )}
                      {item.damage_price && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Shield className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <span>Damage agreement: <strong>${Math.round(item.damage_price)}</strong></span>
                        </div>
                      )}
                      {item.loss_price && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span>Loss agreement: <strong>${Math.round(item.loss_price)}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                  {item.return_terms && (
                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 flex-1">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Return Condition</h4>
                      <p className="text-sm text-gray-800 italic">"{item.return_terms}"</p>
                    </div>
                  )}
                </div>
              )}
              {/* --- END BORROWING TERMS --- */}

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">When I'd like to pick up by</label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
                  style={{ color: '#111' }}
                />
              </div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Message to owner</label>
              <textarea
                className="w-full border rounded-xl p-3 h-32 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ color: '#111' }}
              />
              {sendError && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '12px', textAlign: 'center' as const }}>
                  {sendError}
                </p>
              )}
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