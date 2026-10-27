import React, { useState } from 'react';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, Smartphone, X } from 'lucide-react';

interface RazorpayModalProps {
  isOpen: boolean;
  purpose: 'seeker_fee' | 'owner_fee';
  onClose: () => void;
  onSuccess: (method: 'upi' | 'razorpay', referenceId: string) => Promise<void>;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  purpose,
  onClose,
  onSuccess,
}) => {
  const [method, setMethod] = useState<'upi' | 'razorpay'>('upi');
  const [upiId, setUpiId] = useState('user@okaxis');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const title =
    purpose === 'seeker_fee'
      ? 'Unlock Owner Phone Numbers'
      : 'Owner Listing Registration';

  const subtitle =
    purpose === 'seeker_fee'
      ? 'One-time ₹49 registration fee to view verified owner phone numbers.'
      : 'One-time ₹49 registration fee to publish and manage your listing.';

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (method === 'upi' && (!upiId.includes('@') || upiId.trim().length < 5)) {
      setError('Enter a valid UPI ID (e.g. mobile@upi)');
      return;
    }

    setProcessing(true);
    try {
      const refId = `RZP_${Date.now().toString().slice(-8)}`;
      await onSuccess(method, refId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#141A15]/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-[#DCEAD7] p-6 sm:p-8 shadow-xl">
        <div className="w-10 h-1.5 bg-[#DCEAD7] rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-medium text-[#5C6B5E]">
              RENTBOX Checkout · Razorpay Secured
            </p>
            <h3 className="text-xl font-bold text-[#141A15] mt-1">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#5C6B5E] hover:text-[#141A15] hover:bg-[#EAF4E7] transition-colors cursor-pointer"
            aria-label="Close payment modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#EAF4E7] rounded-2xl p-4 mb-6 flex items-center justify-between border border-[#CFE3C8]">
          <div>
            <p className="text-xs text-[#417545] font-semibold">One-Time Registration Fee</p>
            <p className="text-sm font-medium text-[#141A15] mt-0.5">{subtitle}</p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <span className="text-2xl font-bold font-mono tabular-nums text-[#417545]">
              ₹49
            </span>
          </div>
        </div>

        <form onSubmit={handlePay} className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-[#5C6B5E] mb-2">
              Select Payment Method
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('upi')}
                className={`min-h-[48px] px-4 py-3 rounded-2xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                  method === 'upi'
                    ? 'border-[#417545] bg-[#EAF4E7] text-[#141A15]'
                    : 'border-[#DCEAD7] bg-white text-[#5C6B5E] hover:bg-[#F5FAF3]'
                }`}
              >
                <Smartphone className="w-5 h-5 text-[#417545] shrink-0" />
                <div>
                  <div className="text-sm font-semibold whitespace-nowrap">UPI Instant</div>
                  <div className="text-xs text-[#5C6B5E]">GPay · PhonePe</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod('razorpay')}
                className={`min-h-[48px] px-4 py-3 rounded-2xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                  method === 'razorpay'
                    ? 'border-[#417545] bg-[#EAF4E7] text-[#141A15]'
                    : 'border-[#DCEAD7] bg-white text-[#5C6B5E] hover:bg-[#F5FAF3]'
                }`}
              >
                <CreditCard className="w-5 h-5 text-[#417545] shrink-0" />
                <div>
                  <div className="text-sm font-semibold whitespace-nowrap">Razorpay</div>
                  <div className="text-xs text-[#5C6B5E]">Card · Netbanking</div>
                </div>
              </button>
            </div>
          </div>

          {method === 'upi' ? (
            <div>
              <label className="block text-xs font-semibold text-[#141A15] mb-1.5">
                Enter UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okaxis"
                maxLength={50}
                className="w-full h-12 px-4 rounded-xl border border-[#DCEAD7] text-sm text-[#141A15] focus:outline-none focus:border-[#417545]"
                required
              />
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#F5FAF3] border border-[#DCEAD7] text-xs text-[#5C6B5E] flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#417545] shrink-0" />
              <span>
                Razorpay Express Checkout will process ₹49 and activate your account immediately.
              </span>
            </div>
          )}

          {error && (
            <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={processing}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-full bg-[#417545] hover:bg-[#356139] disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {processing ? (
              <span>Processing ₹49...</span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay ₹49 with {method === 'upi' ? 'UPI' : 'Razorpay'}</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-[#5C6B5E]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#417545]" />
            <span>Instant activation · Zero brokerage</span>
          </div>
        </form>
      </div>
    </div>
  );
};
