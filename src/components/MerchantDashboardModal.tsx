import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Store,
  Sparkles,
  Save,
  Send,
  TrendingUp,
  BrainCircuit,
  MessageSquare,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Printer,
  Download,
  Copy,
  Check
} from 'lucide-react';
import type { Business, Review, BusinessMetrics } from '../lib/types';
import { api } from '../lib/api';
import { useToast } from './ToastContainer';

interface MerchantDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onLogout: () => void;
  onBusinessUpdated: (biz: Business) => void;
}

const CATEGORIES = [
  'Cafes & Restaurants',
  'Fitness & Gyms',
  'Salons & Spas',
  'Auto Services',
  'Home Repairs',
  'Retail',
  'Healthcare',
  'Professional Services'
];

export const MerchantDashboardModal: React.FC<MerchantDashboardModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  onBusinessUpdated
}) => {
  const { toast } = useToast();
  const [business, setBusiness] = useState<Business | null>(user?.business || null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'analytics' | 'reviews' | 'ai_insights' | 'qr'>('profile');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrCopied, setQrCopied] = useState(false);

  // Business Edit form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'Cafes & Restaurants',
    description: '',
    address: '',
    phone: '',
    is_open: true,
    socials: {
      instagram: '',
      whatsapp: '',
      facebook: '',
      website: ''
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Gemini AI state
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, { options: any[]; sentiment_summary: string }>>({});
  const [loadingAiReviewId, setLoadingAiReviewId] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (user?.business) {
      setBusiness(user.business);
      setFormData({
        name: user.business.name || '',
        category: user.business.category || 'Cafes & Restaurants',
        description: user.business.description || '',
        address: user.business.address || '',
        phone: user.business.phone || user.phone,
        is_open: Boolean(user.business.is_open),
        socials: {
          instagram: user.business.socials?.instagram || '',
          whatsapp: user.business.socials?.whatsapp || '',
          facebook: user.business.socials?.facebook || '',
          website: user.business.socials?.website || ''
        }
      });

      // Load reviews & metrics
      api.getBusiness(user.business.id).then((b) => {
        setBusiness(b.business);
        setMetrics(b.metrics);
      });

      api.getReviews(user.business.id).then((r) => {
        setReviews(r.reviews);
      });

      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
      QRCode.toDataURL(`${origin}/?biz=${user.business.id}&action=review`, {
        width: 350,
        margin: 2,
        color: { dark: '#020617', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      }).then(setQrDataUrl).catch(console.error);
    } else {
      // Pre-fill phone for new registration
      setFormData((prev) => ({ ...prev, phone: user?.phone || '' }));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Handle registration of new business
  const handleRegisterBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      const res = await api.createBusiness(formData);
      setBusiness(res.business);
      onBusinessUpdated(res.business);
      toast({
        type: 'success',
        title: 'Business Bound Successfully',
        message: `${res.business.name} is now permanently linked to ${user.phone}!`
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Registration Error',
        message: err.message
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle updating existing business profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setIsSaving(true);
    try {
      const res = await api.updateBusiness(business.id, formData);
      setBusiness(res.business);
      onBusinessUpdated(res.business);
      toast({
        type: 'success',
        title: 'Profile Updated Live',
        message: 'Your modifications have synced across all active clients.'
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Update Failed',
        message: err.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Instant operational status toggle (Open Now / Closed)
  const handleToggleStatus = async () => {
    if (!business) return;
    const newStatus = !business.is_open;
    try {
      const res = await api.updateBusiness(business.id, { is_open: newStatus });
      setBusiness(res.business);
      setFormData((prev) => ({ ...prev, is_open: newStatus }));
      onBusinessUpdated(res.business);
      toast({
        type: 'info',
        title: newStatus ? 'Business Marked Open' : 'Business Marked Closed',
        message: `Real-time status updated to: ${newStatus ? 'Open Now' : 'Closed'}`
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Status Toggle Failed', message: err.message });
    }
  };

  // Gemini AI Reply generator
  const handleGenerateAiReplies = async (review: Review) => {
    if (!business) return;
    setLoadingAiReviewId(review.id);
    try {
      const suggestions = await api.getAiReplySuggestions(business.name, review);
      setAiSuggestions((prev) => ({ ...prev, [review.id]: suggestions }));
      toast({
        type: 'success',
        title: 'Gemini AI Replies Ready',
        message: 'Generated 3 contextual response drafts based on customer sentiment.'
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'AI Assistant Error', message: err.message });
    } finally {
      setLoadingAiReviewId(null);
    }
  };

  const handlePublishReply = async (reviewId: string) => {
    const text = replyInputs[reviewId];
    if (!text || !text.trim()) return;

    try {
      const res = await api.replyToReview(reviewId, text.trim());
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? res.review : r)));
      setReplyInputs((prev) => ({ ...prev, [reviewId]: '' }));
      toast({
        type: 'success',
        title: 'Official Reply Published',
        message: 'Your reply is now live on the public review thread.'
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Reply Failed', message: err.message });
    }
  };

  const handleLoadAiInsights = async () => {
    if (!business) return;
    setLoadingInsights(true);
    try {
      const data = await api.getAiInsights(business.id);
      setAiInsights(data);
    } catch (err: any) {
      toast({ type: 'error', title: 'Insights Error', message: err.message });
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">
                  {business ? business.name : 'Merchant Business Onboarding'}
                </h3>
                {business?.is_verified && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Bound to Phone: <span className="font-mono text-emerald-400">{user?.phone}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {business && (
              <button
                onClick={handleToggleStatus}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  business.is_open
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    business.is_open ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span>{business.is_open ? 'Open Now' : 'Closed Currently'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* If no business is bound yet: Guided Onboarding Registration */}
        {!business ? (
          <div className="p-6 md:p-8 overflow-y-auto space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <strong className="text-white text-sm block">Welcome to NubHub Merchant Network</strong>
                Your phone is authenticated. Register your official business listing to start collecting verified multi-criteria ratings, managing operational hours, and accessing AI tools.
              </div>
            </div>

            <form onSubmit={handleRegisterBusiness} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Blue Mist Artisan Cafe"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Physical Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. 742 Evergreen Terrace, Sector 4"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Public Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    WhatsApp Chat Number (Digits with country code)
                  </label>
                  <input
                    type="text"
                    value={formData.socials.whatsapp}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socials: { ...formData.socials, whatsapp: e.target.value }
                      })
                    }
                    placeholder="e.g. 15551234567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Highlight specialty services, parking, signature dishes or guarantees..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-102 active:scale-98"
                >
                  {isRegistering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Binding Listing...</span>
                    </>
                  ) : (
                    <>
                      <Store className="w-4 h-4" />
                      <span>Publish & Link Business Listing</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Bound Merchant Management Suite */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs */}
            <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex items-center gap-6 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'profile'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Profile & Social Links</span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'analytics'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Service Analytics ({reviews.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'reviews'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Review Moderation & AI Reply</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('ai_insights');
                  if (!aiInsights) handleLoadAiInsights();
                }}
                className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'ai_insights'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <BrainCircuit className="w-4 h-4" />
                <span>Gemini Intelligence</span>
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'qr'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Storefront QR Kit</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              {/* TAB 1: Profile & Socials */}
              {activeTab === 'profile' && (
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Business Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Physical Address
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Description & Services
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {/* Social & Direct Contact Links */}
                  <div className="pt-2 border-t border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Live Customer Contact & Social Media Handlers
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          WhatsApp Direct Chat (Country code + phone)
                        </label>
                        <input
                          type="text"
                          value={formData.socials.whatsapp}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              socials: { ...formData.socials, whatsapp: e.target.value }
                            })
                          }
                          placeholder="e.g. 15551234567"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Instagram Handle / URL</label>
                        <input
                          type="text"
                          value={formData.socials.instagram}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              socials: { ...formData.socials, instagram: e.target.value }
                            })
                          }
                          placeholder="@yourbrand or https://instagram.com/..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Facebook Page URL</label>
                        <input
                          type="text"
                          value={formData.socials.facebook}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              socials: { ...formData.socials, facebook: e.target.value }
                            })
                          }
                          placeholder="https://facebook.com/..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Official Website</label>
                        <input
                          type="text"
                          value={formData.socials.website}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              socials: { ...formData.socials, website: e.target.value }
                            })
                          }
                          placeholder="https://example.com"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 transition-all hover:scale-102 active:scale-98"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Saving Changes...' : 'Save & Sync Profile'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: Service Analytics */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-xs text-slate-400">Overall Rating</span>
                      <div className="text-2xl font-bold text-white mt-1">
                        {metrics?.overall_avg && metrics.overall_avg > 0 ? `${metrics.overall_avg} ★` : '—'}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-xs text-slate-400">Total Reviews</span>
                      <div className="text-2xl font-bold text-white mt-1">
                        {metrics?.total_reviews || 0}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-xs text-slate-400">Operational Status</span>
                      <div className="text-base font-bold text-emerald-400 mt-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {business.is_open ? 'Open Now' : 'Closed'}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-xs text-slate-400">Badge Status</span>
                      <div className="text-base font-bold text-teal-400 mt-1.5">
                        {business.is_verified ? 'Verified Merchant' : 'Standard Listing'}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Criteria Dimension Performance */}
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      Service Dimension Performance Breakdown
                    </h4>
                    <p className="text-xs text-slate-400">
                      Monitor specific metrics (e.g. food quality vs speed) to pinpoint where customer experience excels or needs operational adjustments.
                    </p>

                    {metrics && Object.keys(metrics.dimension_averages).length > 0 ? (
                      <div className="space-y-4 pt-2">
                        {Object.entries(metrics.dimension_averages).map(([dim, avg]) => {
                          const percentage = Math.round((avg / 5) * 100);
                          const isHigh = avg >= 4.0;
                          return (
                            <div key={dim} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200 capitalize">
                                  {dim.replace('_', ' ')}
                                </span>
                                <span className={`font-bold ${isHigh ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {avg.toFixed(1)} / 5.0 ({percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isHigh
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                      : 'bg-gradient-to-r from-amber-500 to-amber-400'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 py-4">
                        Zero reviews logged yet. Your dimension breakdown will automatically graph here upon first review.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Review Moderation & AI Reply Copilot */}
              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        Customer Reviews & Moderation
                      </h4>
                      <p className="text-xs text-slate-400">
                        Publish official responses or flag suspicious competitor review attacks
                      </p>
                    </div>
                  </div>

                  {reviews.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 text-slate-400 text-xs">
                      No reviews logged yet. Promote your NubHub page to receive verified ratings!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((rev) => {
                        const suggestions = aiSuggestions[rev.id];

                        return (
                          <div
                            key={rev.id}
                            className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{rev.author_name}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                                  {rev.service_type}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {new Date(rev.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <span className="font-bold text-emerald-400 text-sm">{rev.overall_rating}★</span>
                            </div>

                            <p className="text-xs text-slate-300">"{rev.comment}"</p>

                            {/* Existing Reply */}
                            {rev.owner_reply ? (
                              <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/20 text-xs text-emerald-300">
                                <strong>Your Published Reply:</strong> {rev.owner_reply}
                              </div>
                            ) : (
                              /* Reply Action + Gemini Suggestions */
                              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-400">
                                    Official Merchant Response
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateAiReplies(rev)}
                                    disabled={loadingAiReviewId === rev.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-semibold transition-all"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>
                                      {loadingAiReviewId === rev.id
                                        ? 'Gemini Generating...'
                                        : 'Gemini AI Suggested Replies'}
                                    </span>
                                  </button>
                                </div>

                                {/* Gemini AI Suggestions List */}
                                {suggestions && (
                                  <div className="p-3 rounded-xl bg-slate-900/90 border border-teal-500/30 space-y-2 animate-in fade-in">
                                    <div className="text-[11px] text-teal-300 font-medium">
                                      Sentiment: {suggestions.sentiment_summary}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                      {suggestions.options.map((opt: any, idx: number) => (
                                        <div
                                          key={idx}
                                          onClick={() =>
                                            setReplyInputs((prev) => ({ ...prev, [rev.id]: opt.text }))
                                          }
                                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-teal-500/50 cursor-pointer transition-all space-y-1"
                                        >
                                          <span className="text-[10px] font-bold text-teal-400 uppercase">
                                            {opt.tone}
                                          </span>
                                          <p className="text-[11px] text-slate-300 line-clamp-3">{opt.text}</p>
                                          <span className="text-[10px] text-emerald-400 block pt-0.5">
                                            Click to apply
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={replyInputs[rev.id] || ''}
                                    onChange={(e) =>
                                      setReplyInputs((prev) => ({ ...prev, [rev.id]: e.target.value }))
                                    }
                                    placeholder="Write your official response..."
                                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                                  />
                                  <button
                                    onClick={() => handlePublishReply(rev.id)}
                                    disabled={!replyInputs[rev.id]?.trim()}
                                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Publish</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Gemini Intelligence & Synthesis */}
              {activeTab === 'ai_insights' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-teal-400" />
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                          Gemini Business Intelligence Analysis
                        </h4>
                        <p className="text-xs text-slate-400">
                          Automated multi-criteria review synthesis & actionable operational improvements
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleLoadAiInsights}
                      disabled={loadingInsights}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingInsights ? 'animate-spin' : ''}`} />
                      <span>Regenerate Analysis</span>
                    </button>
                  </div>

                  {loadingInsights ? (
                    <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                      <span>Gemini analyzing service ratings and customer comments...</span>
                    </div>
                  ) : aiInsights ? (
                    <div className="space-y-4 animate-in fade-in">
                      <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-200">
                        <strong className="text-white text-sm block mb-1">Executive Summary</strong>
                        {aiInsights.summary}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            Key Service Strengths
                          </h5>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {aiInsights.strengths?.map((s: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                            Areas for Operational Improvement
                          </h5>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {aiInsights.areas_for_improvement?.map((s: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                          Action Items Recommended by Gemini
                        </h5>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {aiInsights.action_items?.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Click "Regenerate Analysis" to synthesize reviews.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: Storefront QR Kit */}
              {activeTab === 'qr' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        Official Storefront & Tabletop QR Standee
                      </h4>
                      <p className="text-xs text-slate-400">
                        Display this QR code at checkout, dining tables, or receipts to capture verified multi-criteria ratings on NubHub.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Visual Preview */}
                    <div className="p-6 rounded-2xl bg-white text-slate-950 shadow-2xl border border-slate-200 text-center space-y-3 max-w-xs mx-auto w-full">
                      <span className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-700 block">
                        NubHub Verified Merchant
                      </span>
                      <h4 className="text-lg font-black tracking-tight text-slate-950">
                        {business.name}
                      </h4>
                      <p className="text-[11px] text-slate-600 line-clamp-1">{business.address}</p>

                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl inline-block shadow-inner">
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="QR Standee"
                            className="w-48 h-48 mx-auto rounded-xl"
                          />
                        ) : (
                          <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-xl text-xs text-slate-400">
                            Generating QR...
                          </div>
                        )}
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-900 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                        <Sparkles className="w-3 h-3 text-emerald-700" />
                        <span>Scan to Rate Service on NubHub</span>
                      </div>
                    </div>

                    {/* Controls & Kit Downloads */}
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                          Direct Rating Web Destination
                        </h5>
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                          <span className="font-mono text-emerald-400 text-xs truncate">
                            {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'}/?biz={business.id}&action=review
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
                              navigator.clipboard.writeText(`${origin}/?biz=${business.id}&action=review`);
                              setQrCopied(true);
                              setTimeout(() => setQrCopied(false), 2000);
                              toast({ type: 'success', title: 'URL Copied', message: 'Rating URL copied to clipboard!' });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shrink-0 flex items-center gap-1.5"
                          >
                            {qrCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{qrCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                          Printable Standee Actions
                        </h5>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!qrDataUrl) return;
                              const a = document.createElement('a');
                              a.href = qrDataUrl;
                              a.download = `${business.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_qr.png`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              toast({ type: 'success', title: 'PNG Saved', message: 'High-res QR Code downloaded.' });
                            }}
                            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-700"
                          >
                            <Download className="w-4 h-4 text-teal-400" />
                            <span>Download PNG</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
                          >
                            <Printer className="w-4 h-4" />
                            <span>Print Tabletop Flyer</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                        <strong>Pro Tip:</strong> Businesses displaying tabletop QR codes receive 4.2x more authentic customer reviews, boosting your search rank on NubHub.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 px-6 md:px-8 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
