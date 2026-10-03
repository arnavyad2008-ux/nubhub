import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Globe,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import type { Business } from './lib/types';
import { api } from './lib/api';
import { socket } from './lib/socket';
import { ToastProvider, useToast } from './components/ToastContainer';
import { Navbar } from './components/Navbar';
import { BusinessCard } from './components/BusinessCard';
import { BusinessDetailModal } from './components/BusinessDetailModal';
import { ReviewFormModal } from './components/ReviewFormModal';
import { MerchantAuthModal } from './components/MerchantAuthModal';
import { MerchantDashboardModal } from './components/MerchantDashboardModal';
import { SuperAdminModal } from './components/SuperAdminModal';
import { GoogleIntelligenceModal } from './components/GoogleIntelligenceModal';
import { QRCodeModal } from './components/QRCodeModal';
import { ZeroState } from './components/ZeroState';
import { BusinessCardSkeleton } from './components/LoadingSkeleton';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const CATEGORIES = [
  'All',
  'Cafes & Restaurants',
  'Fitness & Gyms',
  'Salons & Spas',
  'Auto Services',
  'Home Repairs',
  'Retail',
  'Healthcare',
  'Professional Services'
];

function MainApp() {
  const { toast } = useToast();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Authenticated Merchant / Superadmin State
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('nh_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Modal States
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [ratingBusiness, setRatingBusiness] = useState<Business | null>(null);
  const [qrBusiness, setQrBusiness] = useState<Business | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMerchantDashOpen, setIsMerchantDashOpen] = useState(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(false);
  const [isGoogleIntelOpen, setIsGoogleIntelOpen] = useState(false);

  // Initial Fetch & Real-Time Socket Listeners
  useEffect(() => {
    loadBusinesses();

    // Check if session token still valid
    const token = localStorage.getItem('nh_token');
    if (token) {
      api.getMerchantMe()
        .then((data) => {
          setCurrentUser((prev: any) => ({
            ...prev,
            role: data.role,
            phone: data.phone,
            hasBusiness: Boolean(data.business),
            business: data.business
          }));
        })
        .catch(() => {
          localStorage.removeItem('nh_token');
          localStorage.removeItem('nh_user');
          setCurrentUser(null);
        });
    }

    // Real-Time Socket.io event listeners
    const handleBusinessCreated = (newBiz: Business) => {
      setBusinesses((prev) => {
        // Prevent duplicate insertions
        if (prev.some((b) => b.id === newBiz.id)) return prev;
        return [newBiz, ...prev];
      });
      toast({
        type: 'success',
        title: 'New Business Registered Live',
        message: `${newBiz.name} was just added to ${newBiz.category}.`
      });
    };

    const handleBusinessUpdated = (updatedBiz: Business) => {
      setBusinesses((prev) =>
        prev.map((b) => (b.id === updatedBiz.id ? { ...b, ...updatedBiz } : b))
      );
      if (activeBusiness && activeBusiness.id === updatedBiz.id) {
        setActiveBusiness(updatedBiz);
      }
    };

    socket.on('business:created', handleBusinessCreated);
    socket.on('business:updated', handleBusinessUpdated);

    // Supabase Realtime integration
    let supabaseChannel: any = null;
    if (isSupabaseConfigured) {
      supabaseChannel = supabase
        .channel('public:businesses')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, (payload: any) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            handleBusinessCreated(payload.new as Business);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            handleBusinessUpdated(payload.new as Business);
          }
        })
        .subscribe();
    }

    return () => {
      socket.off('business:created', handleBusinessCreated);
      socket.off('business:updated', handleBusinessUpdated);
      if (supabaseChannel) {
        supabase.removeChannel(supabaseChannel);
      }
    };
  }, []);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const data = await api.getBusinesses();
      const list = data.businesses || [];
      setBusinesses(list);

      // Deep-link handling: if URL contains ?biz=<id> (from scanning a QR code!)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const bizId = params.get('biz');
        const action = params.get('action');
        if (bizId) {
          const match = list.find((b: Business) => b.id === bizId);
          if (match) {
            setActiveBusiness(match);
            if (action === 'review') {
              setRatingBusiness(match);
              toast({
                type: 'info',
                title: 'QR Code Scanned',
                message: `Directly rating ${match.name}`
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load businesses:', err);
      toast({
        type: 'error',
        title: 'Network Sync Error',
        message: 'Could not load directory listings. Retrying...'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtered Businesses according to Category & Search
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      const matchesCategory =
        selectedCategory === 'All' || b.category.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [businesses, selectedCategory, searchQuery]);

  // Aggregate Real Stats for Discovery Header
  const verifiedCount = useMemo(
    () => businesses.filter((b) => b.is_verified).length,
    [businesses]
  );
  const openCount = useMemo(
    () => businesses.filter((b) => b.is_open).length,
    [businesses]
  );
  const totalReviewsCount = useMemo(
    () => businesses.reduce((acc, b) => acc + (b.review_count || 0), 0),
    [businesses]
  );

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    setCurrentUser(null);
    setIsMerchantDashOpen(false);
    toast({
      type: 'info',
      title: 'Signed Out',
      message: 'Merchant session cleared securely.'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenMerchantDashboard={() => setIsMerchantDashOpen(true)}
        onOpenSuperAdmin={() => setIsSuperAdminOpen(true)}
        onOpenGoogleIntel={() => setIsGoogleIntelOpen(true)}
        currentUser={currentUser}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Hero Section & Discovery Dashboard */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Banner Card */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Production-Grade Hyper-Local Ecosystem</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Discover Local Merchants with{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Multi-Criteria Service Ratings
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Real-time operational status, verified contact channels, direct WhatsApp communication,
              and dimension-specific service reviews evaluated on every visit.
            </p>

            {/* Quick Live Stats Ticker */}
            <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 backdrop-blur-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Registered Businesses
                </span>
                <span className="text-2xl font-black text-white mt-0.5 block font-mono">
                  {businesses.length}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 backdrop-blur-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Verified Merchants
                </span>
                <span className="text-2xl font-black text-emerald-400 mt-0.5 block font-mono">
                  {verifiedCount}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 backdrop-blur-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Currently Open Now
                </span>
                <span className="text-2xl font-black text-teal-400 mt-0.5 block font-mono flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  {openCount}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 backdrop-blur-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Authentic Reviews
                </span>
                <span className="text-2xl font-black text-amber-400 mt-0.5 block font-mono">
                  {totalReviewsCount}
                </span>
              </div>
            </div>

            {/* Merchant Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (currentUser) {
                    setIsMerchantDashOpen(true);
                  } else {
                    setIsAuthOpen(true);
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {currentUser?.hasBusiness ? 'Open Merchant Dashboard' : 'Register Your Business Free'}
                </span>
              </button>

              <button
                onClick={() => setIsGoogleIntelOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs border border-slate-700 transition-all hover:scale-102"
              >
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                <span>Explore Google Search Trends</span>
              </button>
            </div>
          </div>
        </section>

        {/* Category Filter Carousel / Chips */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Explore Categories
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'business' : 'businesses'} found
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20 scale-102'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* Business Grid / Zero States */}
        <section className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <BusinessCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredBusinesses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBusinesses.map((biz) => (
                <BusinessCard
                  key={biz.id}
                  business={biz}
                  onSelect={(b) => setActiveBusiness(b)}
                  onRate={(b) => setRatingBusiness(b)}
                  onShowQR={(b) => setQrBusiness(b)}
                />
              ))}
            </div>
          ) : searchQuery ? (
            <ZeroState
              type="no_search_results"
              searchQuery={searchQuery}
              onAction={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              actionLabel="Clear Search Filters"
            />
          ) : (
            /* Non-Negotiable Core Principle: Zero Fake Data, Polished Zero-State */
            <ZeroState
              type="no_businesses"
              category={selectedCategory}
              onAction={() => {
                if (currentUser) {
                  setIsMerchantDashOpen(true);
                } else {
                  setIsAuthOpen(true);
                }
              }}
              actionLabel="Add Your Business Today"
            />
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">NubHub Portal</span>
            <span>•</span>
            <span>Zero Mock Data • Real-Time WebSockets • Multi-Criteria Review Engine • Storefront QR Codes</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsGoogleIntelOpen(true)}
              className="hover:text-emerald-400 transition-colors"
            >
              Google Intel
            </button>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="hover:text-emerald-400 transition-colors"
            >
              Merchant Phone Auth
            </button>
            <button
              onClick={() => setIsSuperAdminOpen(true)}
              className="hover:text-rose-400 transition-colors"
            >
              Superadmin Feed
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {activeBusiness && (
        <BusinessDetailModal
          business={activeBusiness}
          isOpen={Boolean(activeBusiness)}
          onClose={() => setActiveBusiness(null)}
          onOpenReviewForm={() => {
            setRatingBusiness(activeBusiness);
          }}
          onShowQR={(b) => setQrBusiness(b)}
          currentMerchantPhone={currentUser?.phone}
        />
      )}

      {qrBusiness && (
        <QRCodeModal
          business={qrBusiness}
          isOpen={Boolean(qrBusiness)}
          onClose={() => setQrBusiness(null)}
        />
      )}

      {ratingBusiness && (
        <ReviewFormModal
          business={ratingBusiness}
          isOpen={Boolean(ratingBusiness)}
          onClose={() => setRatingBusiness(null)}
          onSuccess={() => {
            // Reload businesses to reflect updated averages
            loadBusinesses();
          }}
        />
      )}

      {isAuthOpen && (
        <MerchantAuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            setIsMerchantDashOpen(true);
          }}
        />
      )}

      {isMerchantDashOpen && (
        <MerchantDashboardModal
          isOpen={isMerchantDashOpen}
          onClose={() => setIsMerchantDashOpen(false)}
          user={currentUser}
          onLogout={handleLogout}
          onBusinessUpdated={(updatedBiz) => {
            setCurrentUser((prev: any) => ({
              ...prev,
              hasBusiness: true,
              business: updatedBiz
            }));
            setBusinesses((prev) =>
              prev.some((b) => b.id === updatedBiz.id)
                ? prev.map((b) => (b.id === updatedBiz.id ? updatedBiz : b))
                : [updatedBiz, ...prev]
            );
          }}
        />
      )}

      {isSuperAdminOpen && (
        <SuperAdminModal
          isOpen={isSuperAdminOpen}
          onClose={() => setIsSuperAdminOpen(false)}
          businesses={businesses}
          onBusinessUpdated={(updatedBiz) => {
            setBusinesses((prev) =>
              prev.map((b) => (b.id === updatedBiz.id ? updatedBiz : b))
            );
          }}
        />
      )}

      {isGoogleIntelOpen && (
        <GoogleIntelligenceModal
          isOpen={isGoogleIntelOpen}
          onClose={() => setIsGoogleIntelOpen(false)}
          initialCategory={selectedCategory === 'All' ? 'Cafes & Restaurants' : selectedCategory}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
