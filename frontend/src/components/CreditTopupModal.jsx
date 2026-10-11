import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../services/api.js';
import { selectCurrentUser, updateUserCredits } from '../redux/slices/authSlice.js';

const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 100,
    price: '₹99',
    unitPrice: '₹0.99 / credit',
    badge: 'Starter',
    icon: '🌱',
    highlight: false,
    perks: [
      '100 Conversational Chats',
      '50 Web Search Queries',
      '50 Code Generations',
      'Standard model queue',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Creator',
    credits: 500,
    price: '₹399',
    unitPrice: '₹0.80 / credit',
    discount: 'Save 20%',
    badge: 'Most Popular',
    icon: '⚡',
    highlight: true,
    perks: [
      '100 Interactive Slide Decks (PPT)',
      '160 Executive Print PDFs',
      '250 Web Searches with Grounding',
      'Priority multi-agent execution',
      'Zero cooldown between requests',
    ],
  },
  {
    id: 'creator',
    name: 'Studio Ultra',
    credits: 1500,
    price: '₹999',
    unitPrice: '₹0.66 / credit',
    discount: 'Save 33%',
    badge: 'Best Value',
    icon: '👑',
    highlight: false,
    perks: [
      '300 Complete Slide Decks (PPT)',
      '500 Multi-page PDF Reports',
      '750 Code & Vision Tasks',
      'Ultra-fast priority processing',
      'Direct developer support',
    ],
  },
];

export const CreditTopupModal = ({ isOpen, onClose, onCreditsUpdated }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const [loadingPack, setLoadingPack] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Lock background scroll + close on Escape while modal is open
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (packageId) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setLoadingPack(packageId);

      // 1. Ensure Razorpay checkout script is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setErrorMessage('Could not load Razorpay SDK. Please check your internet connection.');
        setLoadingPack(null);
        return;
      }

      // 2. Create Order on Backend
      const orderRes = await api.post('/api/payments/create-order', { packageId });
      const orderData = orderRes.data;

      if (!orderData?.success) {
        throw new Error(orderData?.message || 'Failed to initialize payment order');
      }

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Cortex AI Studio',
        description: `Top-up ${orderData.credits} Agent Credits`,
        order_id: orderData.orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#9333ea', // Sleek Cortex purple
        },
        modal: {
          ondismiss: () => {
            setLoadingPack(null);
          },
        },
        handler: async function (response) {
          try {
            setLoadingPack(packageId);
            // 4. Verify Payment with Cryptographic HMAC Signature
            const verifyRes = await api.post('/api/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              packageId,
            });

            if (verifyRes.data?.success) {
              const newBalance = verifyRes.data.credits;
              dispatch(updateUserCredits(newBalance));
              onCreditsUpdated?.(newBalance);
              setSuccessMessage(`Payment verified! ${newBalance} credits now available in your account.`);
              setTimeout(() => {
                onClose();
                setSuccessMessage(null);
              }, 2000);
            } else {
              setErrorMessage(verifyRes.data?.message || 'Payment verification failed.');
            }
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr);
            setErrorMessage(
              verifyErr.response?.data?.message || 'Payment verification failed on the server.'
            );
          } finally {
            setLoadingPack(null);
          }
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (resp) {
        console.error('Razorpay payment failed:', resp.error);
        setErrorMessage(resp.error?.description || 'Payment was declined or cancelled.');
        setLoadingPack(null);
      });
      paymentObject.open();
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Payment initiation failed.');
      setLoadingPack(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Top-up agent credits"
    >
      
      {/* Outer Modal Container with Glow Borders */}
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-4xl bg-[#090c15] border border-white/[0.12] rounded-3xl shadow-[0_0_100px_rgba(147,51,234,0.18)] p-6 sm:p-8 overflow-hidden my-auto">
        
        {/* Dynamic Background Ambient Glow Orbs */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-purple-600/20 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-600/20 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-600/5 rounded-full blur-[130px] pointer-events-none" />

        {/* Modal Top Header Bar */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                Instant Credit Top-Up
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">&bull;</span>
              <span className="text-xs text-slate-400 hidden sm:inline">Pay as you go</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              Power Up Your Cortex AI
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Unlock interactive 16:9 presentation slide decks, executive PDF whitepapers, and real-time deep web citations.
            </p>
          </div>

          {/* Right Header: Current Balance Badge & Close Button */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Live Balance Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] backdrop-blur-md">
              <span className="text-purple-400 text-sm">⚡</span>
              <div className="text-right">
                <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Your Balance</p>
                <p className="text-sm font-bold text-white font-mono">{user?.credits ?? 50} Credits</p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-400 hover:text-white transition-all cursor-pointer border border-white/[0.06] hover:rotate-90 duration-200"
              aria-label="Close modal"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dynamic Alerts */}
        {errorMessage && (
          <div className="relative z-10 mt-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs sm:text-sm text-red-200 flex items-center gap-3 animate-in fade-in">
            <span className="text-base shrink-0">⚠️</span>
            <span className="flex-1 leading-snug">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="relative z-10 mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm text-emerald-200 flex items-center gap-3 animate-in fade-in">
            <span className="text-base shrink-0">🎉</span>
            <span className="flex-1 font-medium">{successMessage}</span>
          </div>
        )}

        {/* 3 Tier Pricing Cards Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 group ${
                pkg.highlight
                  ? 'bg-gradient-to-b from-purple-950/60 via-[#111322] to-[#0a0d18] border-2 border-purple-500/60 shadow-[0_0_40px_rgba(168,85,247,0.22)] md:-translate-y-1.5'
                  : 'bg-white/[0.025] hover:bg-white/[0.045] border border-white/[0.09] hover:border-white/[0.22] hover:-translate-y-1'
              }`}
            >
              {/* Highlight Glow Tag on Most Popular */}
              {pkg.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-md shadow-purple-600/40 flex items-center gap-1">
                  <span>🔥</span> {pkg.badge}
                </div>
              )}

              {/* Card Header & Price */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{pkg.icon}</span>
                    <h3 className="text-base font-bold text-white tracking-tight">{pkg.name}</h3>
                  </div>
                  {pkg.discount && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      {pkg.discount}
                    </span>
                  )}
                  {!pkg.highlight && !pkg.discount && (
                    <span className="text-[10px] font-semibold text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-full">
                      {pkg.badge}
                    </span>
                  )}
                </div>

                {/* Big Credit Number */}
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
                    {pkg.credits.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold uppercase text-purple-300 tracking-wider">
                    Credits
                  </span>
                </div>

                {/* Price Display */}
                <div className="mt-2 flex items-baseline justify-between border-b border-white/[0.06] pb-3">
                  <div className="text-2xl font-bold text-white font-mono">{pkg.price}</div>
                  <div className="text-[11px] text-slate-400 font-medium">{pkg.unitPrice}</div>
                </div>

                {/* Perks Checklist */}
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">What you get:</p>
                  <ul className="space-y-1.5">
                    {pkg.perks.map((perk, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-tight">
                        <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-6 pt-2">
                <button
                  disabled={loadingPack !== null}
                  onClick={() => handleCheckout(pkg.id)}
                  className={`w-full py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    pkg.highlight
                      ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-purple-600/35 hover:shadow-purple-600/50'
                      : 'bg-white/[0.07] hover:bg-white/[0.14] text-white border border-white/[0.1] hover:border-white/[0.25]'
                  }`}
                >
                  {loadingPack === pkg.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Opening Razorpay...</span>
                    </>
                  ) : (
                    <>
                      <span>Top-up {pkg.credits} Credits</span>
                      <span className="text-xs opacity-75">&rarr;</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sleek Trust & Security Footer */}
        <div className="relative z-10 pt-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Razorpay Secured (256-bit SSL)
            </span>
            <span className="text-slate-600 hidden sm:inline">&bull;</span>
            <span className="text-slate-400">Simulated UPI & Test Cards</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-purple-300">
              ⚡ Instant Redis Activation
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400">
              Test Mode Active
            </span>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default CreditTopupModal;
