import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

import {
  getAllBusinesses,
  getBusinessById,
  getBusinessByPhone,
  createBusiness,
  updateBusinessProfile,
  setBusinessVerification,
  getReviewsByBusiness,
  getBusinessServiceMetrics,
  canIpSubmitReview,
  insertReview,
  addMerchantReply,
  flagReviewAsSuspicious,
  updateReviewModeration,
  logAudit,
  getRecentAuditLogs,
  getSecurityRules,
  addSecurityRule,
  removeSecurityRule,
  getActiveSessions,
  revokeSession,
  getSession,
  isTargetBlocked
} from './db.js';

import { requestOtp, verifyOtp, logoutSession } from './auth.js';
import { moderateReviewContent, generateMerchantReplies, generateServiceInsights } from './gemini.js';
import { getGoogleLocalInsights } from './googleSearch.js';

const app = express();
const server = http.createServer(app);

// Setup Socket.IO for real-time synchronization
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Helper to extract client IP reliably
function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// Middleware to extract merchant authentication token
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid or expired' });
  }

  (req as any).user = session;
  next();
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Join global discovery room
  socket.join('public_discovery');

  socket.on('join:business', (businessId: string) => {
    socket.join(`business:${businessId}`);
  });

  socket.on('leave:business', (businessId: string) => {
    socket.leave(`business:${businessId}`);
  });

  socket.on('join:admin', () => {
    socket.join('admin_channel');
  });
});

// ==========================================
// 1. PUBLIC DISCOVERY & MULTI-CRITERIA REVIEWS
// ==========================================

// GET /api/businesses - Real-time search & category filtering
app.get('/api/businesses', (req, res) => {
  try {
    const search = req.query.search as string;
    const category = req.query.category as string;
    const businesses = getAllBusinesses(search, category);
    res.json({ businesses });
  } catch (err: any) {
    console.error('Error fetching businesses:', err);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// GET /api/businesses/:id - Business Detail Profile & live metrics
app.get('/api/businesses/:id', (req, res) => {
  try {
    const business = getBusinessById(req.params.id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const metrics = getBusinessServiceMetrics(business.id);
    res.json({ business, metrics });
  } catch (err: any) {
    console.error('Error fetching business:', err);
    res.status(500).json({ error: 'Failed to fetch business details' });
  }
});

// GET /api/businesses/:id/reviews - Multi-criteria reviews
app.get('/api/businesses/:id/reviews', (req, res) => {
  try {
    const reviews = getReviewsByBusiness(req.params.id);
    res.json({ reviews });
  } catch (err: any) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/businesses/:id/reviews - Submit Multi-Criteria Review with anti-abuse shielding
app.post('/api/businesses/:id/reviews', async (req, res) => {
  try {
    const businessId = req.params.id;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // 1. Check if submitter IP is blocked / shadowbanned
    const blockCheck = isTargetBlocked(undefined, ip);
    if (blockCheck.blocked) {
      return res.status(403).json({ error: 'Review submission denied by security policy.' });
    }

    // 2. Anti-Abuse: Restrict review submissions to max 1 review per IP per business every 30 days
    const throttleCheck = canIpSubmitReview(businessId, ip);
    if (!throttleCheck.allowed) {
      return res.status(429).json({
        error: `Anti-Abuse Safeguard: You have already reviewed this business recently. You can submit another review in ${throttleCheck.waitDays} days.`
      });
    }

    const { author_name, overall_rating, service_ratings, service_type, comment } = req.body;

    if (!author_name || !overall_rating || !service_ratings || !service_type || !comment) {
      return res.status(400).json({ error: 'Missing required review fields' });
    }

    const numRating = Number(overall_rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Overall rating must be between 1 and 5' });
    }

    // 3. Automated Content Moderation & Profanity / Spam Filter (Gemini + Local rule)
    const moderation = await moderateReviewContent(comment, author_name);

    let isFlagged = moderation.isFlagged;
    let flagReason = moderation.reason;

    // If shadowbanned, auto-flag with internal notice
    if (blockCheck.shadowbanned) {
      isFlagged = true;
      flagReason = 'Automated shadowban enforcement';
    }

    // 4. Insert into database
    const newReview = insertReview({
      business_id: businessId,
      author_name: author_name.trim(),
      overall_rating: numRating,
      service_ratings,
      service_type,
      comment: comment.trim(),
      submitter_ip: ip,
      is_flagged: isFlagged,
      flag_reason: flagReason
    });

    // 5. Log audit event
    logAudit({
      actor_phone: null,
      event_type: isFlagged ? 'REVIEW_FLAGGED_AUTOMATED' : 'REVIEW_SUBMITTED',
      ip_address: ip,
      user_agent: userAgent,
      metadata: {
        businessId,
        author: author_name,
        rating: numRating,
        isFlagged,
        flagReason
      }
    });

    // 6. Recalculate metrics and broadcast live via Socket.io
    const updatedMetrics = getBusinessServiceMetrics(businessId);
    const updatedBusiness = getBusinessById(businessId);

    // Broadcast to room viewing this specific business
    io.to(`business:${businessId}`).emit('review:added', {
      review: newReview,
      metrics: updatedMetrics,
      business: updatedBusiness
    });

    // Broadcast updated rating and review count to global discovery list
    io.emit('business:updated', updatedBusiness);

    // If review was flagged, alert admin live feed
    if (isFlagged) {
      io.to('admin_channel').emit('admin:review_flagged', {
        review: newReview,
        business: updatedBusiness,
        reason: flagReason
      });
    }

    res.status(201).json({
      success: true,
      review: newReview,
      metrics: updatedMetrics,
      business: updatedBusiness,
      message: isFlagged
        ? 'Review submitted and currently queued for automated moderation review.'
        : 'Review submitted successfully!'
    });
  } catch (err: any) {
    console.error('Error submitting review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ==========================================
// 2. MERCHANT AUTHENTICATION & MANAGEMENT
// ==========================================

// POST /api/auth/otp/request - Passwordless Phone OTP with rate-limiting & cooldown
app.post('/api/auth/otp/request', (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.trim().length < 6) {
      return res.status(400).json({ error: 'Valid international phone number is required (e.g. +1... or +91...)' });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const result = requestOtp(phone.trim(), ip, userAgent);
    if (!result.success) {
      return res.status(429).json({ error: result.error, code: result.code, cooldownSeconds: result.cooldownSeconds });
    }

    // Broadcast audit event to live admin feed
    io.to('admin_channel').emit('admin:audit_event', {
      event_type: 'OTP_SENT',
      actor_phone: phone,
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date().toISOString()
    });

    res.json(result);
  } catch (err: any) {
    console.error('OTP request error:', err);
    res.status(500).json({ error: 'Failed to request OTP' });
  }
});

// POST /api/auth/otp/verify - Verify OTP & permanently link or load business
app.post('/api/auth/otp/verify', (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone number and verification code are required' });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const result = verifyOtp(phone.trim(), code.trim(), ip, userAgent);
    if (!result.success) {
      io.to('admin_channel').emit('admin:audit_event', {
        event_type: 'LOGIN_FAILED',
        actor_phone: phone,
        ip_address: ip,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ error: result.error });
    }

    io.to('admin_channel').emit('admin:audit_event', {
      event_type: 'LOGIN_SUCCESS',
      actor_phone: phone,
      ip_address: ip,
      role: result.user?.role,
      timestamp: new Date().toISOString()
    });

    res.json(result);
  } catch (err: any) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /api/auth/logout - Terminate session
app.post('/api/auth/logout', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    logoutSession(user.token, user.phone, ip, userAgent);

    io.to('admin_channel').emit('admin:audit_event', {
      event_type: 'LOGOUT',
      actor_phone: user.phone,
      ip_address: ip,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/merchant/me - Get current session merchant profile & linked business
app.get('/api/merchant/me', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const business = getBusinessByPhone(user.phone);
    res.json({
      phone: user.phone,
      role: user.role,
      business: business || null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch merchant profile' });
  }
});

// POST /api/merchant/business - Create & bind new business to authenticated phone
app.post('/api/merchant/business', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const existing = getBusinessByPhone(user.phone);
    if (existing) {
      return res.status(400).json({ error: 'A business is already permanently linked to this phone number' });
    }

    const { name, category, description, address, phone, socials, is_open } = req.body;
    if (!name || !category || !address || !phone) {
      return res.status(400).json({ error: 'Business name, category, address, and contact phone are required' });
    }

    const created = createBusiness({
      owner_phone: user.phone,
      name: name.trim(),
      category: category.trim(),
      description: description || '',
      address: address.trim(),
      phone: phone.trim(),
      socials: socials || { instagram: '', whatsapp: '', facebook: '', website: '' },
      is_open: is_open !== false
    });

    logAudit({
      actor_phone: user.phone,
      event_type: 'BUSINESS_CREATED',
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      metadata: { businessId: created?.id, businessName: name }
    });

    // Broadcast new business live to all connected discovery clients
    io.emit('business:created', created);

    res.status(201).json({ success: true, business: created });
  } catch (err: any) {
    console.error('Business creation error:', err);
    res.status(500).json({ error: 'Failed to register business' });
  }
});

// PUT /api/merchant/business/:id - Update profile, hours, operational status, socials
app.put('/api/merchant/business/:id', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const business = getBusinessById(req.params.id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Verify ownership (unless superadmin)
    if (business.owner_phone !== user.phone && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden: You do not own this business listing' });
    }

    const updated = updateBusinessProfile(req.params.id, req.body);

    logAudit({
      actor_phone: user.phone,
      event_type: 'BUSINESS_UPDATED',
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      metadata: { businessId: req.params.id, updates: Object.keys(req.body) }
    });

    // Broadcast live to all connected clients!
    io.emit('business:updated', updated);
    io.to(`business:${req.params.id}`).emit('business:profile_updated', updated);

    res.json({ success: true, business: updated });
  } catch (err: any) {
    console.error('Business update error:', err);
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

// POST /api/merchant/reviews/:reviewId/reply - Publish official merchant reply
app.post('/api/merchant/reviews/:reviewId/reply', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const { reply } = req.body;
    if (!reply || reply.trim() === '') {
      return res.status(400).json({ error: 'Reply text cannot be empty' });
    }

    const updatedReview = addMerchantReply(req.params.reviewId, reply.trim());
    if (!updatedReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    logAudit({
      actor_phone: user.phone,
      event_type: 'MERCHANT_REPLY',
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      metadata: { reviewId: req.params.reviewId, businessId: updatedReview.business_id }
    });

    // Broadcast live update across all clients viewing this business
    io.to(`business:${updatedReview.business_id}`).emit('review:replied', updatedReview);

    res.json({ success: true, review: updatedReview });
  } catch (err: any) {
    console.error('Merchant reply error:', err);
    res.status(500).json({ error: 'Failed to publish reply' });
  }
});

// POST /api/merchant/reviews/:reviewId/flag - Flag review as suspicious with dispute reason
app.post('/api/merchant/reviews/:reviewId/flag', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const { reason } = req.body;
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Please provide a dispute reason explaining why this review is suspicious' });
    }

    const updatedReview = flagReviewAsSuspicious(req.params.reviewId, reason.trim());
    if (!updatedReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    logAudit({
      actor_phone: user.phone,
      event_type: 'FLAG_REVIEW',
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      metadata: { reviewId: req.params.reviewId, reason }
    });

    // Alert Superadmin moderation queue live
    io.to('admin_channel').emit('admin:review_flagged', {
      review: updatedReview,
      reason,
      flagged_by: user.phone
    });

    res.json({
      success: true,
      review: updatedReview,
      message: 'Review flagged and securely routed to Superadmin moderation queue.'
    });
  } catch (err: any) {
    console.error('Flag review error:', err);
    res.status(500).json({ error: 'Failed to flag review' });
  }
});

// POST /api/merchant/ai/reply-suggestions - Gemini AI Merchant Reply Assistant
app.post('/api/merchant/ai/reply-suggestions', requireAuth, async (req, res) => {
  try {
    const { businessName, review } = req.body;
    if (!review || !businessName) {
      return res.status(400).json({ error: 'Business name and review payload are required' });
    }

    const suggestions = await generateMerchantReplies(businessName, review);
    res.json(suggestions);
  } catch (err: any) {
    console.error('Gemini reply error:', err);
    res.status(500).json({ error: 'Failed to generate AI replies' });
  }
});

// GET /api/merchant/ai/insights/:businessId - Gemini AI service dimension synthesis
app.get('/api/merchant/ai/insights/:businessId', requireAuth, async (req, res) => {
  try {
    const business = getBusinessById(req.params.businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const reviews = getReviewsByBusiness(business.id);
    const insights = await generateServiceInsights(business.name, business.category, reviews);
    res.json(insights);
  } catch (err: any) {
    console.error('Gemini insights error:', err);
    res.status(500).json({ error: 'Failed to generate service insights' });
  }
});

// ==========================================
// 3. SERVICE PROVIDER / SUPERADMIN GOVERNANCE
// ==========================================

// Superadmin middleware
function requireSuperAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied: Superadmin credentials required' });
  }
  next();
}

// GET /api/admin/audit-logs - Live Audit Logging & Activity Feed
app.get('/api/admin/audit-logs', requireAuth, requireSuperAdmin, (req, res) => {
  try {
    const logs = getRecentAuditLogs(200);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/admin/security-rules - Security rules (Blocked IP, Phone, Shadowbanned)
app.get('/api/admin/security-rules', requireAuth, requireSuperAdmin, (req, res) => {
  try {
    const rules = getSecurityRules();
    res.json({ rules });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch security rules' });
  }
});

// POST /api/admin/security-rules - Add block or shadowban
app.post('/api/admin/security-rules', requireAuth, requireSuperAdmin, (req, res) => {
  try {
    const { rule_type, target_value, reason } = req.body;
    if (!rule_type || !target_value) {
      return res.status(400).json({ error: 'Rule type and target value are required' });
    }

    const rule = addSecurityRule(rule_type, target_value, reason);

    logAudit({
      actor_phone: (req as any).user.phone,
      event_type: 'SECURITY_RULE_ADDED',
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      metadata: { rule }
    });

    io.to('admin_channel').emit('admin:rule_updated', rule);
    res.status(201).json({ success: true, rule });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create security rule' });
  }
});

// DELETE /api/admin/security-rules/:id - Remove rule
app.delete('/api/admin/security-rules/:id', requireAuth, requireSuperAdmin, (req, res) => {
  try {
    removeSecurityRule(req.params.id);
    io.to('admin_channel').emit('admin:rule_removed', { id: req.params.id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove security rule' });
  }
});

// GET /api/admin/sessions - Active sessions & multi-IP tracking
app.get('/api/admin/sessions', requireAuth, requireSuperAdmin, (req, res) => {
  try {
    const sessions = getActiveSessions();
    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/admin/sessions/:id/revoke - One-click session revocation
app.post('/api/admin/sessions/:id/revoke', requireAuth, requireSuperAdmin, (req, res) => {
  try {
    revokeSession(req.params.id);
    logAudit({
      actor_phone: (req as any).user.phone,
      event_type: 'SESSION_REVOKED',
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      metadata: { revokedSessionId: req.params.id }
    });
    io.to('admin_channel').emit('admin:session_revoked', { sessionId: req.params.id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// POST /api/admin/businesses/:id/verify - Business verification toggle (pending_approval vs verified)
app.post('/api/admin/businesses/:id/verify', requireAuth, requireSuperAdmin, (req, res) => {
  try {
    const { is_verified } = req.body;
    const updated = setBusinessVerification(req.params.id, Boolean(is_verified));

    logAudit({
      actor_phone: (req as any).user.phone,
      event_type: 'BUSINESS_VERIFICATION_TOGGLED',
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      metadata: { businessId: req.params.id, is_verified }
    });

    io.emit('business:updated', updated);
    io.to(`business:${req.params.id}`).emit('business:profile_updated', updated);

    res.json({ success: true, business: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// POST /api/admin/reviews/:id/moderate - Merchant Dispute Resolution (keep, hide, unflag)
app.post('/api/admin/reviews/:id/moderate', requireAuth, requireSuperAdmin, (req, res) => {
  try {
    const { action } = req.body; // 'hide' (accept dispute) or 'keep' (dismiss dispute)
    const review = updateReviewModeration(req.params.id, action);

    logAudit({
      actor_phone: (req as any).user.phone,
      event_type: 'DISPUTE_RESOLVED',
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      metadata: { reviewId: req.params.id, action }
    });

    if (review) {
      const updatedMetrics = getBusinessServiceMetrics(review.business_id);
      const updatedBusiness = getBusinessById(review.business_id);

      io.to(`business:${review.business_id}`).emit('review:moderated', {
        review,
        metrics: updatedMetrics,
        business: updatedBusiness
      });
      io.emit('business:updated', updatedBusiness);
    }

    res.json({ success: true, review });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to moderate review' });
  }
});

// ==========================================
// 4. GOOGLE SEARCH DATA & LOCAL DISCOVERY
// ==========================================

// GET /api/google/insights - Google local search query & market intelligence
app.get('/api/google/insights', async (req, res) => {
  try {
    const category = (req.query.category as string) || 'Cafes & Restaurants';
    const location = (req.query.location as string) || 'Downtown Metro';
    const insights = await getGoogleLocalInsights(category, location);
    res.json(insights);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch Google local insights' });
  }
});

const DIST_PATH = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`[NubHub Server] Production API & WebSocket engine running on port ${PORT}`);
  });
}

export { app, server };
export default app;
