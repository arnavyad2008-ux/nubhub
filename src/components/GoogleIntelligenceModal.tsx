import { useState, useEffect } from 'react';
import { X, Search, Globe, TrendingUp, Sparkles, Key, Check, Copy } from 'lucide-react';
import { api } from '../lib/api';
import type { GoogleInsight } from '../lib/types';
import { useToast } from './ToastContainer';

interface GoogleIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
}

export const GoogleIntelligenceModal: React.FC<GoogleIntelligenceModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'Cafes & Restaurants'
}) => {
  const { toast } = useToast();
  const [category, setCategory] = useState(initialCategory);
  const [location, setLocation] = useState('Downtown Metro');
  const [insights, setInsights] = useState<GoogleInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInsights(category, location);
    }
  }, [isOpen]);

  const loadInsights = async (cat: string, loc: string) => {
    setLoading(true);
    try {
      const data = await api.getGoogleInsights(cat, loc);
      setInsights(data);
    } catch (e: any) {
      toast({ type: 'error', title: 'Google Intel Error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyword(text);
    setTimeout(() => setCopiedKeyword(null), 2000);
    toast({ type: 'info', title: 'Copied to Clipboard', message: text });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">Google Search & Market Intelligence</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  REAL-TIME GROUNDING
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live Google Search intent, trending neighborhood queries & Local SEO keywords
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Location Bar */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Cafes & Restaurants"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Neighborhood / City</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Downtown Metro"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => loadInsights(category, location)}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Query Google Data</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              <span>Synthesizing Google Search queries & regional intent signals...</span>
            </div>
          ) : insights ? (
            <div className="space-y-6 animate-in fade-in">
              {/* Popular Search Queries */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    High-Volume Google Search Queries
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {insights.popularSearchQueries.map((q: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs text-slate-200"
                    >
                      <span className="font-medium truncate mr-2">"{q}"</span>
                      <button
                        onClick={() => handleCopy(q)}
                        className="text-slate-500 hover:text-teal-400 p-1 transition-colors"
                        title="Copy query"
                      >
                        {copiedKeyword === q ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Intent Trends */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Consumer Decision-Making Behavioral Patterns
                  </h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  {insights.customerIntentTrends.map((t: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Local SEO Keywords */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Recommended Local SEO Tags & Keywords
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {insights.localSeoKeywords.map((kw: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleCopy(kw)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
                    >
                      <span>{kw}</span>
                      <Copy className="w-3 h-3 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Competitive Insights */}
              <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-200">
                <strong className="text-white block mb-0.5">Competitive Advantage Intel:</strong>
                {insights.competitiveInsights}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
