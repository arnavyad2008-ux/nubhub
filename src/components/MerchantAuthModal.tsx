import { useState, useEffect } from 'react';
import { X, ShieldCheck, KeyRound, ArrowRight, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from './ToastContainer';

interface MerchantAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
}

const COUNTRY_CODES = [
  { code: '+1', country: 'US / CA' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'India' },
  { code: '+61', country: 'Australia' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+971', country: 'UAE' },
  { code: '+65', country: 'Singapore' },
  { code: '+81', country: 'Japan' }
];

export const MerchantAuthModal: React.FC<MerchantAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess
}) => {
  const { toast } = useToast();
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');

  // Turnstile / reCAPTCHA simulation state
  const [turnstilePassed, setTurnstilePassed] = useState(true);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 60-second cooldown timer
  const [cooldown, setCooldown] = useState(0);

  // Simulated OTP notification code for tester convenience
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((c) => Math.max(0, c - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const fullPhone = `${countryCode}${phoneNumber.replace(/[^0-9]/g, '')}`;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (phoneNumber.trim().length < 5) {
      setErrorMessage('Please enter a valid mobile number');
      return;
    }

    if (!turnstilePassed) {
      setErrorMessage('Please complete the anti-bot verification challenge.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await api.requestOtp(fullPhone);
      setStep('verify');
      setCooldown(res.cooldownSeconds || 60);

      if (res.simulatedCode) {
        setSimulatedOtp(res.simulatedCode);
        setOtpCode(res.simulatedCode); // Auto-fill for convenience while displaying code
      }

      toast({
        type: 'info',
        title: 'SMS OTP Dispatched',
        message: res.simulatedCode
          ? `Code sent to ${fullPhone} (Test Mode OTP: ${res.simulatedCode})`
          : `Code dispatched to ${fullPhone}`
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch OTP');
      toast({
        type: 'error',
        title: 'OTP Request Denied',
        message: err.message
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMessage('Please enter the 6-digit OTP code');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await api.verifyOtp(fullPhone, otpCode.trim());

      localStorage.setItem('nh_token', res.token);
      localStorage.setItem('nh_user', JSON.stringify(res.user));

      toast({
        type: 'success',
        title: 'Authenticated Successfully',
        message: res.user.hasBusiness
          ? 'Welcome back! Opening your merchant management suite.'
          : 'Phone verified! Let’s register your authentic business listing.'
      });

      onAuthSuccess(res.user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP');
      toast({
        type: 'error',
        title: 'Authentication Failed',
        message: err.message
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Merchant & Admin Portal</h3>
              <p className="text-xs text-slate-400">Passwordless Phone OTP Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Phone Number
                </label>
                <div className="flex rounded-xl bg-slate-950 border border-slate-800 overflow-hidden focus-within:border-emerald-500">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-slate-900 text-white text-xs font-medium px-3 py-2.5 border-r border-slate-800 focus:outline-none"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.country})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="9876543210"
                    className="flex-1 px-3.5 py-2.5 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Rate limits: Max 3 OTP/hr per phone, 5/hr per IP with 60s cooldown.
                </p>
              </div>

              {/* Bot Shield / Turnstile Simulation */}
              <div
                onClick={() => setTurnstilePassed(!turnstilePassed)}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      turnstilePassed
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                        : 'border-slate-600 bg-slate-900'
                    }`}
                  >
                    {turnstilePassed && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">
                    Cloudflare Turnstile Verified
                  </span>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>

              <button
                type="submit"
                disabled={isSendingOtp || cooldown > 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-102 active:scale-98"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* Simulated OTP Notification Banner */}
              {simulatedOtp && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white">Live SMS Simulation:</span>
                    <p className="text-[11px] text-emerald-400">
                      Your single-use passcode is <strong className="text-white text-sm font-mono tracking-widest">{simulatedOtp}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(simulatedOtp)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] hover:bg-emerald-400"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Enter 6-Digit Passcode
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Change Phone
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.5em] font-mono font-bold text-xl px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Cooldown & Resend */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                {cooldown > 0 ? (
                  <span>Resend code in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    className="text-emerald-400 font-semibold hover:underline"
                  >
                    Resend New Code
                  </button>
                )}
                <span>Target: {fullPhone}</span>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-102 active:scale-98"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Continue</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Test Access */}
          <div className="pt-3 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-500 block mb-2">
              For testing Superadmin Governance: use phone ending in <code className="text-emerald-400">88888</code>
            </span>
            <button
              type="button"
              onClick={() => {
                setCountryCode('+1');
                setPhoneNumber('5550088888');
              }}
              className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors underline"
            >
              Fill Superadmin Demo Phone (+1 555-008-8888)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
