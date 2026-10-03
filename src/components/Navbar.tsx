import {
  Compass,
  Store,
  ShieldAlert,
  Globe,
  UserCheck,
  Search
} from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenMerchantDashboard: () => void;
  onOpenSuperAdmin: () => void;
  onOpenGoogleIntel: () => void;
  currentUser: any;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenMerchantDashboard,
  onOpenSuperAdmin,
  onOpenGoogleIntel,
  currentUser,
  searchQuery,
  onSearchChange
}) => {
  const isSuperAdmin = currentUser?.role === 'superadmin';

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo & Live Sync Indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Compass className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white font-sans">
                  Nub<span className="text-emerald-400">Hub</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
              </div>
              <span className="hidden sm:block text-[11px] text-slate-400 font-medium">
                Hyper-Local Discovery & Multi-Criteria Reviews
              </span>
            </div>
          </div>

          {/* Center Search Input */}
          <div className="flex-1 max-w-xl mx-2 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search verified businesses, services, or locations..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Right Action Hub */}
          <div className="flex items-center gap-2.5">
            {/* Google Search Intel Trigger */}
            <button
              onClick={onOpenGoogleIntel}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-teal-400 border border-slate-800 text-xs font-semibold transition-all hover:scale-102"
              title="Query Google Search Trends & Local SEO Keywords"
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>Google Intel</span>
            </button>

            {/* Superadmin Button (if role or demo access) */}
            {isSuperAdmin && (
              <button
                onClick={onOpenSuperAdmin}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all"
                title="Superadmin Governance, Live Audit Feed & Anti-Abuse"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Superadmin</span>
              </button>
            )}

            {/* Merchant Portal / Auth Trigger */}
            {currentUser ? (
              <button
                onClick={onOpenMerchantDashboard}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all shadow-md shadow-emerald-950/20"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono">{currentUser.phone}</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/20 transition-all hover:scale-102 active:scale-98"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Merchant Portal</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="py-2 pb-3 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search local businesses..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
