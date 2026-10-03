import type { Business, Review, BusinessMetrics, AuditLog, SecurityRule, ActiveSession, GoogleInsight } from './types';

const BASE_URL = window.location.port === '5173' ? 'http://localhost:3001/api' : '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('nh_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Public Discovery
  async getBusinesses(params?: { search?: string; category?: string }): Promise<{ businesses: Business[] }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category) searchParams.append('category', params.category);
    const res = await fetch(`${BASE_URL}/businesses?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to load businesses');
    return res.json();
  },

  async getBusiness(id: string): Promise<{ business: Business; metrics: BusinessMetrics }> {
    const res = await fetch(`${BASE_URL}/businesses/${id}`);
    if (!res.ok) throw new Error('Failed to load business');
    return res.json();
  },

  async getReviews(businessId: string): Promise<{ reviews: Review[] }> {
    const res = await fetch(`${BASE_URL}/businesses/${businessId}/reviews`);
    if (!res.ok) throw new Error('Failed to load reviews');
    return res.json();
  },

  async submitReview(businessId: string, reviewData: {
    author_name: string;
    overall_rating: number;
    service_ratings: Record<string, number>;
    service_type: string;
    comment: string;
  }): Promise<{ success: boolean; review: Review; metrics: BusinessMetrics; business: Business; message?: string }> {
    const res = await fetch(`${BASE_URL}/businesses/${businessId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit review');
    return data;
  },

  // Auth & OTP
  async requestOtp(phone: string): Promise<{ success: boolean; message: string; cooldownSeconds: number; simulatedCode?: string }> {
    const res = await fetch(`${BASE_URL}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
    return data;
  },

  async verifyOtp(phone: string, code: string): Promise<{
    success: boolean;
    token: string;
    user: {
      phone: string;
      role: string;
      hasBusiness: boolean;
      business: Business | null;
    };
  }> {
    const res = await fetch(`${BASE_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verification failed');
    return data;
  },

  async logout(): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    localStorage.removeItem('nh_token');
    localStorage.removeItem('nh_user');
    return res.json();
  },

  // Merchant Portal
  async getMerchantMe(): Promise<{ phone: string; role: string; business: Business | null }> {
    const res = await fetch(`${BASE_URL}/merchant/me`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Session invalid');
    return res.json();
  },

  async createBusiness(businessData: Partial<Business>): Promise<{ success: boolean; business: Business }> {
    const res = await fetch(`${BASE_URL}/merchant/business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(businessData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register business');
    return data;
  },

  async updateBusiness(id: string, updates: Partial<Business>): Promise<{ success: boolean; business: Business }> {
    const res = await fetch(`${BASE_URL}/merchant/business/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update business');
    return data;
  },

  async replyToReview(reviewId: string, reply: string): Promise<{ success: boolean; review: Review }> {
    const res = await fetch(`${BASE_URL}/merchant/reviews/${reviewId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reply })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reply to review');
    return data;
  },

  async flagReview(reviewId: string, reason: string): Promise<{ success: boolean; review: Review; message: string }> {
    const res = await fetch(`${BASE_URL}/merchant/reviews/${reviewId}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to flag review');
    return data;
  },

  async getAiReplySuggestions(businessName: string, review: Review): Promise<{
    options: { tone: string; text: string }[];
    sentiment_summary: string;
  }> {
    const res = await fetch(`${BASE_URL}/merchant/ai/reply-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ businessName, review })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate AI replies');
    return data;
  },

  async getAiInsights(businessId: string): Promise<{
    summary: string;
    strengths: string[];
    areas_for_improvement: string[];
    action_items: string[];
  }> {
    const res = await fetch(`${BASE_URL}/merchant/ai/insights/${businessId}`, {
      headers: { ...getAuthHeader() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load insights');
    return data;
  },

  // Superadmin Governance
  async getAdminAuditLogs(): Promise<{ logs: AuditLog[] }> {
    const res = await fetch(`${BASE_URL}/admin/audit-logs`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to load audit logs');
    return res.json();
  },

  async getSecurityRules(): Promise<{ rules: SecurityRule[] }> {
    const res = await fetch(`${BASE_URL}/admin/security-rules`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to load security rules');
    return res.json();
  },

  async addSecurityRule(rule: { rule_type: string; target_value: string; reason: string }): Promise<{ success: boolean; rule: SecurityRule }> {
    const res = await fetch(`${BASE_URL}/admin/security-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(rule)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add rule');
    return data;
  },

  async removeSecurityRule(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/admin/security-rules/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to delete rule');
    return res.json();
  },

  async getAdminSessions(): Promise<{ sessions: ActiveSession[] }> {
    const res = await fetch(`${BASE_URL}/admin/sessions`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to load sessions');
    return res.json();
  },

  async revokeAdminSession(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/admin/sessions/${id}/revoke`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to revoke session');
    return res.json();
  },

  async toggleBusinessVerification(id: string, is_verified: boolean): Promise<{ success: boolean; business: Business }> {
    const res = await fetch(`${BASE_URL}/admin/businesses/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ is_verified })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update verification status');
    return data;
  },

  async moderateDispute(reviewId: string, action: 'hide' | 'keep' | 'unflag'): Promise<{ success: boolean; review: Review }> {
    const res = await fetch(`${BASE_URL}/admin/reviews/${reviewId}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to moderate dispute');
    return data;
  },

  // Google Search & Local Insights
  async getGoogleInsights(category: string, location: string): Promise<GoogleInsight> {
    const res = await fetch(`${BASE_URL}/google/insights?category=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}`);
    if (!res.ok) throw new Error('Failed to load Google insights');
    return res.json();
  }
};
