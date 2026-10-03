import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'nubhub.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency & performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize Database Tables matching strict production schema
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      owner_phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      socials TEXT DEFAULT '{"instagram": "", "whatsapp": "", "facebook": "", "website": ""}',
      is_open INTEGER DEFAULT 1,
      is_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      overall_rating REAL NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
      service_ratings TEXT NOT NULL,
      service_type TEXT NOT NULL,
      comment TEXT NOT NULL,
      submitter_ip TEXT,
      is_flagged INTEGER DEFAULT 0,
      flag_reason TEXT,
      owner_reply TEXT,
      owner_replied_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_phone TEXT,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS security_rules (
      id TEXT PRIMARY KEY,
      rule_type TEXT NOT NULL,
      target_value TEXT NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      role TEXT DEFAULT 'merchant',
      ip_address TEXT,
      user_agent TEXT,
      is_revoked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS otp_requests (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      verified INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    -- Indices for quick lookup and real-time responsiveness
    CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
    CREATE INDEX IF NOT EXISTS idx_businesses_owner_phone ON businesses(owner_phone);
    CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_submitter_ip ON reviews(submitter_ip);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_security_rules_target ON security_rules(target_value);
  `);
}

initDb();

export interface BusinessRecord {
  id: string;
  owner_phone: string;
  name: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  socials: string; // JSON string
  is_open: number; // 0 or 1
  is_verified: number; // 0 or 1
  created_at: string;
}

export interface ReviewRecord {
  id: string;
  business_id: string;
  author_name: string;
  overall_rating: number;
  service_ratings: string; // JSON string
  service_type: string;
  comment: string;
  submitter_ip: string | null;
  is_flagged: number; // 0 or 1
  flag_reason: string | null;
  owner_reply: string | null;
  owner_replied_at: string | null;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  actor_phone: string | null;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: string | null; // JSON string
  created_at: string;
}

export interface SecurityRuleRecord {
  id: string;
  rule_type: string;
  target_value: string;
  reason: string | null;
  created_at: string;
}

// Business Queries
export function getAllBusinesses(search?: string, category?: string) {
  let query = `
    SELECT b.*,
      COALESCE(AVG(r.overall_rating), 0) as avg_rating,
      COUNT(r.id) as review_count
    FROM businesses b
    LEFT JOIN reviews r ON b.id = r.business_id AND r.is_flagged != 2 -- 2 means hidden by admin
    WHERE 1=1
  `;
  const params: any[] = [];

  if (category && category !== 'All') {
    query += ` AND b.category = ?`;
    params.push(category);
  }

  if (search && search.trim() !== '') {
    query += ` AND (b.name LIKE ? OR b.description LIKE ? OR b.address LIKE ? OR b.category LIKE ?)`;
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  query += ` GROUP BY b.id ORDER BY b.is_verified DESC, b.created_at DESC`;

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(row => {
    let parsedSocials = { instagram: '', whatsapp: '', facebook: '', website: '' };
    try {
      parsedSocials = JSON.parse(row.socials || '{}');
    } catch (e) {}

    return {
      ...row,
      socials: parsedSocials,
      is_open: Boolean(row.is_open),
      is_verified: Boolean(row.is_verified),
      avg_rating: Number(Number(row.avg_rating || 0).toFixed(1)),
      review_count: Number(row.review_count || 0)
    };
  });
}

export function getBusinessById(id: string) {
  const row = db.prepare(`
    SELECT b.*,
      COALESCE(AVG(r.overall_rating), 0) as avg_rating,
      COUNT(r.id) as review_count
    FROM businesses b
    LEFT JOIN reviews r ON b.id = r.business_id AND r.is_flagged != 2
    WHERE b.id = ?
    GROUP BY b.id
  `).get(id) as any;

  if (!row) return null;

  let parsedSocials = { instagram: '', whatsapp: '', facebook: '', website: '' };
  try {
    parsedSocials = JSON.parse(row.socials || '{}');
  } catch (e) {}

  return {
    ...row,
    socials: parsedSocials,
    is_open: Boolean(row.is_open),
    is_verified: Boolean(row.is_verified),
    avg_rating: Number(Number(row.avg_rating || 0).toFixed(1)),
    review_count: Number(row.review_count || 0)
  };
}

export function getBusinessByPhone(ownerPhone: string) {
  const row = db.prepare(`SELECT * FROM businesses WHERE owner_phone = ?`).get(ownerPhone) as any;
  if (!row) return null;
  let parsedSocials = { instagram: '', whatsapp: '', facebook: '', website: '' };
  try {
    parsedSocials = JSON.parse(row.socials || '{}');
  } catch (e) {}
  return {
    ...row,
    socials: parsedSocials,
    is_open: Boolean(row.is_open),
    is_verified: Boolean(row.is_verified)
  };
}

export function createBusiness(data: {
  owner_phone: string;
  name: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  socials?: Record<string, string>;
  is_open?: boolean;
}) {
  const id = uuidv4();
  const socialsStr = JSON.stringify(data.socials || { instagram: '', whatsapp: '', facebook: '', website: '' });

  const stmt = db.prepare(`
    INSERT INTO businesses (id, owner_phone, name, category, description, address, phone, socials, is_open, is_verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `);

  stmt.run(
    id,
    data.owner_phone,
    data.name,
    data.category,
    data.description || '',
    data.address,
    data.phone,
    socialsStr,
    data.is_open !== false ? 1 : 0
  );

  return getBusinessById(id);
}

export function updateBusinessProfile(id: string, updates: {
  name?: string;
  category?: string;
  description?: string;
  address?: string;
  phone?: string;
  socials?: Record<string, string>;
  is_open?: boolean;
}) {
  const current = getBusinessById(id);
  if (!current) return null;

  const newName = updates.name !== undefined ? updates.name : current.name;
  const newCat = updates.category !== undefined ? updates.category : current.category;
  const newDesc = updates.description !== undefined ? updates.description : current.description;
  const newAddr = updates.address !== undefined ? updates.address : current.address;
  const newPhone = updates.phone !== undefined ? updates.phone : current.phone;
  const newSocials = updates.socials !== undefined ? JSON.stringify(updates.socials) : JSON.stringify(current.socials);
  const newIsOpen = updates.is_open !== undefined ? (updates.is_open ? 1 : 0) : (current.is_open ? 1 : 0);

  db.prepare(`
    UPDATE businesses
    SET name = ?, category = ?, description = ?, address = ?, phone = ?, socials = ?, is_open = ?
    WHERE id = ?
  `).run(newName, newCat, newDesc, newAddr, newPhone, newSocials, newIsOpen, id);

  return getBusinessById(id);
}

export function setBusinessVerification(id: string, isVerified: boolean) {
  db.prepare(`UPDATE businesses SET is_verified = ? WHERE id = ?`).run(isVerified ? 1 : 0, id);
  return getBusinessById(id);
}

// Review Queries & Multi-Criteria Metrics
export function getReviewsByBusiness(businessId: string, includeHidden = false) {
  const query = includeHidden
    ? `SELECT * FROM reviews WHERE business_id = ? ORDER BY created_at DESC`
    : `SELECT * FROM reviews WHERE business_id = ? AND is_flagged != 2 ORDER BY created_at DESC`;

  const rows = db.prepare(query).all(businessId) as any[];
  return rows.map(r => {
    let serviceRatings = {};
    try {
      serviceRatings = JSON.parse(r.service_ratings || '{}');
    } catch (e) {}

    return {
      ...r,
      service_ratings: serviceRatings,
      is_flagged: Boolean(r.is_flagged)
    };
  });
}

export function getBusinessServiceMetrics(businessId: string) {
  const reviews = getReviewsByBusiness(businessId);
  if (reviews.length === 0) {
    return {
      overall_avg: 0,
      total_reviews: 0,
      dimension_averages: {},
      service_type_breakdown: {}
    };
  }

  const dimensionSums: Record<string, { total: number; count: number }> = {};
  const serviceTypeCounts: Record<string, number> = {};
  let overallSum = 0;

  for (const review of reviews) {
    overallSum += Number(review.overall_rating);

    // Track service type
    const sType = review.service_type || 'General';
    serviceTypeCounts[sType] = (serviceTypeCounts[sType] || 0) + 1;

    // Track dimension averages
    for (const [key, val] of Object.entries(review.service_ratings as Record<string, number>)) {
      if (!dimensionSums[key]) {
        dimensionSums[key] = { total: 0, count: 0 };
      }
      dimensionSums[key].total += Number(val);
      dimensionSums[key].count += 1;
    }
  }

  const dimensionAverages: Record<string, number> = {};
  for (const [dim, stats] of Object.entries(dimensionSums)) {
    dimensionAverages[dim] = Number((stats.total / stats.count).toFixed(1));
  }

  return {
    overall_avg: Number((overallSum / reviews.length).toFixed(1)),
    total_reviews: reviews.length,
    dimension_averages: dimensionAverages,
    service_type_breakdown: serviceTypeCounts
  };
}

// Anti-Abuse: 30-day Review Spam Throttling per IP per Business
export function canIpSubmitReview(businessId: string, ipAddress: string): { allowed: boolean; waitDays?: number } {
  if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress === 'unknown') {
    // For local testing convenience, allow, but let's check recent submissions
  }

  const row = db.prepare(`
    SELECT created_at FROM reviews
    WHERE business_id = ? AND submitter_ip = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(businessId, ipAddress) as any;

  if (!row) {
    return { allowed: true };
  }

  const reviewDate = new Date(row.created_at).getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - reviewDate;

  if (elapsed < thirtyDaysMs) {
    const daysRemaining = Math.ceil((thirtyDaysMs - elapsed) / (24 * 60 * 60 * 1000));
    return { allowed: false, waitDays: daysRemaining };
  }

  return { allowed: true };
}

export function insertReview(data: {
  business_id: string;
  author_name: string;
  overall_rating: number;
  service_ratings: Record<string, number>;
  service_type: string;
  comment: string;
  submitter_ip: string;
  is_flagged?: boolean;
  flag_reason?: string;
}) {
  const id = uuidv4();
  const serviceRatingsStr = JSON.stringify(data.service_ratings);

  db.prepare(`
    INSERT INTO reviews (
      id, business_id, author_name, overall_rating, service_ratings,
      service_type, comment, submitter_ip, is_flagged, flag_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id,
    data.business_id,
    data.author_name,
    data.overall_rating,
    serviceRatingsStr,
    data.service_type,
    data.comment,
    data.submitter_ip,
    data.is_flagged ? 1 : 0,
    data.flag_reason || null
  );

  return db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(id) as any;
}

export function addMerchantReply(reviewId: string, reply: string) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE reviews
    SET owner_reply = ?, owner_replied_at = ?
    WHERE id = ?
  `).run(reply, now, reviewId);

  return db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(reviewId) as any;
}

export function flagReviewAsSuspicious(reviewId: string, reason: string) {
  db.prepare(`
    UPDATE reviews
    SET is_flagged = 1, flag_reason = ?
    WHERE id = ?
  `).run(reason, reviewId);

  return db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(reviewId) as any;
}

export function updateReviewModeration(reviewId: string, action: 'keep' | 'hide' | 'unflag') {
  if (action === 'hide') {
    db.prepare(`UPDATE reviews SET is_flagged = 2 WHERE id = ?`).run(reviewId);
  } else if (action === 'keep' || action === 'unflag') {
    db.prepare(`UPDATE reviews SET is_flagged = 0, flag_reason = NULL WHERE id = ?`).run(reviewId);
  }
  return db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(reviewId) as any;
}

// Security, Audit Logs & Rate Limiting
export function logAudit(data: {
  actor_phone?: string | null;
  event_type: string;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: any;
}) {
  const id = uuidv4();
  const metadataStr = data.metadata ? JSON.stringify(data.metadata) : null;

  db.prepare(`
    INSERT INTO audit_logs (id, actor_phone, event_type, ip_address, user_agent, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id,
    data.actor_phone || null,
    data.event_type,
    data.ip_address || null,
    data.user_agent || null,
    metadataStr
  );

  return { id, ...data, created_at: new Date().toISOString() };
}

export function getRecentAuditLogs(limit = 100) {
  const rows = db.prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?`).all(limit) as any[];
  return rows.map(r => {
    let meta = null;
    try {
      meta = JSON.parse(r.metadata || '{}');
    } catch (e) {}
    return { ...r, metadata: meta };
  });
}

// Security Rules & Blocks
export function getSecurityRules() {
  return db.prepare(`SELECT * FROM security_rules ORDER BY created_at DESC`).all() as SecurityRuleRecord[];
}

export function addSecurityRule(rule_type: string, target_value: string, reason?: string) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO security_rules (id, rule_type, target_value, reason, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(id, rule_type, target_value, reason || 'Superadmin action');
  return { id, rule_type, target_value, reason, created_at: new Date().toISOString() };
}

export function removeSecurityRule(id: string) {
  return db.prepare(`DELETE FROM security_rules WHERE id = ?`).run(id);
}

export function isTargetBlocked(phone?: string, ip?: string): { blocked: boolean; reason?: string; shadowbanned?: boolean } {
  if (phone) {
    const phoneRule = db.prepare(`
      SELECT * FROM security_rules WHERE (rule_type = 'BLOCKED_PHONE' OR rule_type = 'SHADOWBANNED') AND target_value = ?
    `).get(phone) as any;
    if (phoneRule) {
      return {
        blocked: phoneRule.rule_type === 'BLOCKED_PHONE',
        shadowbanned: phoneRule.rule_type === 'SHADOWBANNED',
        reason: phoneRule.reason
      };
    }
  }

  if (ip) {
    const ipRule = db.prepare(`
      SELECT * FROM security_rules WHERE (rule_type = 'BLOCKED_IP' OR rule_type = 'SHADOWBANNED') AND target_value = ?
    `).get(ip) as any;
    if (ipRule) {
      return {
        blocked: ipRule.rule_type === 'BLOCKED_IP',
        shadowbanned: ipRule.rule_type === 'SHADOWBANNED',
        reason: ipRule.reason
      };
    }
  }

  return { blocked: false };
}

// Session Management
export function createSession(phone: string, role: string, ip: string, userAgent: string) {
  const id = uuidv4();
  const token = 'nh_sess_' + uuidv4().replace(/-/g, '') + Math.random().toString(36).substring(2, 10);
  db.prepare(`
    INSERT INTO sessions (id, token, phone, role, ip_address, user_agent, is_revoked, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(id, token, phone, role, ip, userAgent);

  return { id, token, phone, role };
}

export function getSession(token: string) {
  return db.prepare(`SELECT * FROM sessions WHERE token = ? AND is_revoked = 0`).get(token) as any;
}

export function revokeSession(sessionId: string) {
  return db.prepare(`UPDATE sessions SET is_revoked = 1 WHERE id = ?`).run(sessionId);
}

export function getActiveSessions() {
  return db.prepare(`SELECT * FROM sessions WHERE is_revoked = 0 ORDER BY created_at DESC`).all() as any[];
}
