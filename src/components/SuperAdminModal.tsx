import { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Activity,
  UserX,
  Ban,
  RefreshCw,
  Building
} from 'lucide-react';
import type { AuditLog, SecurityRule, ActiveSession, Business } from '../lib/types';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { useToast } from './ToastContainer';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  onBusinessUpdated: (biz: Business) => void;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({
  isOpen,
  onClose,
  businesses,
  onBusinessUpdated
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'activity' | 'sessions' | 'rules' | 'verification'>('activity');

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [rules, setRules] = useState<SecurityRule[]>([]);
  const [loading, setLoading] = useState(true);

  // New Rule Form
  const [newRuleType, setNewRuleType] = useState<'BLOCKED_IP' | 'BLOCKED_PHONE' | 'SHADOWBANNED'>('BLOCKED_IP');
  const [newRuleTarget, setNewRuleTarget] = useState('');
  const [newRuleReason, setNewRuleReason] = useState('');
  const [isAddingRule, setIsAddingRule] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    loadData();

    socket.emit('join:admin');

    const handleAuditEvent = (event: any) => {
      setAuditLogs((prev) => [
        {
          id: Math.random().toString(),
          actor_phone: event.actor_phone,
          event_type: event.event_type,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          metadata: event.metadata,
          created_at: event.timestamp || new Date().toISOString()
        },
        ...prev
      ]);
    };

    socket.on('admin:audit_event', handleAuditEvent);

    return () => {
      socket.off('admin:audit_event', handleAuditEvent);
    };
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsRes, sessRes, rulesRes] = await Promise.all([
        api.getAdminAuditLogs().catch(() => ({ logs: [] })),
        api.getAdminSessions().catch(() => ({ sessions: [] })),
        api.getSecurityRules().catch(() => ({ rules: [] }))
      ]);

      setAuditLogs(logsRes.logs || []);
      setSessions(sessRes.sessions || []);
      setRules(rulesRes.rules || []);
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.revokeAdminSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast({
        type: 'success',
        title: 'Session Revoked',
        message: 'Active merchant session was immediately terminated.'
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Action Failed', message: err.message });
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleTarget.trim()) return;

    setIsAddingRule(true);
    try {
      const res = await api.addSecurityRule({
        rule_type: newRuleType,
        target_value: newRuleTarget.trim(),
        reason: newRuleReason.trim() || 'Manual superadmin rule'
      });
      setRules((prev) => [res.rule, ...prev]);
      setNewRuleTarget('');
      setNewRuleReason('');
      toast({
        type: 'success',
        title: 'Security Rule Active',
        message: `Applied ${newRuleType} on ${res.rule.target_value}`
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Rule Error', message: err.message });
    } finally {
      setIsAddingRule(false);
    }
  };

  const handleRemoveRule = async (id: string) => {
    try {
      await api.removeSecurityRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast({
        type: 'info',
        title: 'Rule Removed',
        message: 'Security enforcement has been lifted.'
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Removal Failed', message: err.message });
    }
  };

  const handleToggleVerification = async (business: Business) => {
    const newStatus = !business.is_verified;
    try {
      const res = await api.toggleBusinessVerification(business.id, newStatus);
      onBusinessUpdated(res.business);
      toast({
        type: 'success',
        title: newStatus ? 'Business Verified' : 'Verification Revoked',
        message: `${business.name} is now ${newStatus ? 'Verified Merchant' : 'Standard Listing'}`
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Verification Error', message: err.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">Superadmin Governance Suite</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  ANTI-ABUSE PROTOCOL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audit Logging • Session Control • Security Rules & Shadowbanning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Feeds"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'activity'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Audit Feed ({auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <UserX className="w-4 h-4" />
            <span>Active Sessions ({sessions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'rules'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>Security Rules & Shield ({rules.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'verification'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Merchant Verification Badges ({businesses.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          {/* TAB 1: Live Audit Activity Feed */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Real-time authentication and security events streaming via WebSockets</span>
                <span>Audit retention: Persistent SQLite</span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No audit logs captured in this session yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => {
                    const isAlert =
                      log.event_type.includes('FAIL') ||
                      log.event_type.includes('BLOCKED') ||
                      log.event_type.includes('FLAG');

                    return (
                      <div
                        key={log.id}
                        className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isAlert
                            ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              isAlert
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {log.event_type}
                          </span>
                          <div>
                            <span className="font-semibold text-white font-mono">
                              {log.actor_phone || 'Anonymous'}
                            </span>
                            <span className="text-slate-400 ml-2">IP: {log.ip_address || '—'}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 shrink-0 font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Active Sessions & Multi-IP tracking */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Active authenticated merchant sessions across devices</span>
                <span>Immediate 1-Click Revocation</span>
              </div>

              {sessions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No active sessions found.
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono">{sess.phone}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-teal-400 font-semibold">
                            {sess.role}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          IP: <span className="font-mono text-slate-300">{sess.ip_address}</span> • Signed in:{' '}
                          {new Date(sess.created_at).toLocaleTimeString()}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all hover:scale-105"
                      >
                        Revoke Session
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Security Rules & Anti-Abuse Shield */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              {/* Add New Rule Form */}
              <form onSubmit={handleAddRule} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Enforce New Blacklist or Shadowban
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Rule Type</label>
                    <select
                      value={newRuleType}
                      onChange={(e: any) => setNewRuleType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    >
                      <option value="BLOCKED_IP">BLOCKED_IP (IP Address)</option>
                      <option value="BLOCKED_PHONE">BLOCKED_PHONE (Mobile Number)</option>
                      <option value="SHADOWBANNED">SHADOWBANNED (Silent Flag)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Target Value</label>
                    <input
                      type="text"
                      required
                      value={newRuleTarget}
                      onChange={(e) => setNewRuleTarget(e.target.value)}
                      placeholder="e.g. 192.168.1.1 or +1555..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Reason</label>
                    <input
                      type="text"
                      value={newRuleReason}
                      onChange={(e) => setNewRuleReason(e.target.value)}
                      placeholder="e.g. Repeated OTP spam attempt"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isAddingRule}
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-all"
                  >
                    Add Security Rule
                  </button>
                </div>
              </form>

              {/* Rules List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Enforcement Rules
                </h4>
                {rules.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No active security rules configured.
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {rule.rule_type}
                          </span>
                          <span className="font-mono font-bold text-white">{rule.target_value}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{rule.reason}</p>
                      </div>

                      <button
                        onClick={() => handleRemoveRule(rule.id)}
                        className="px-3 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Business Verification Manager */}
          {activeTab === 'verification' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Manage verified badge credentials across registered merchants</span>
              </div>

              {businesses.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Zero businesses registered yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {businesses.map((biz) => (
                    <div
                      key={biz.id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{biz.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-teal-400">
                            {biz.category}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Owner: <span className="font-mono text-slate-300">{biz.owner_phone}</span> •{' '}
                          {biz.address}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleVerification(biz)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          biz.is_verified
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-emerald-500 hover:text-slate-950'
                        }`}
                      >
                        {biz.is_verified ? 'Revoke Verified Badge' : 'Grant Verified Badge'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
