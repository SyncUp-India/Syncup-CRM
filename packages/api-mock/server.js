const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const SECRET = 'demo-secret';

app.use(cors());
app.use(express.json());

// ── Seed data ──────────────────────────────────────────────────────────────

const users = [
  { id: 'u1', name: 'Ayush', email: 'ayush@syncup.in', role: 'super_admin', isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'u2', name: 'Sarah Lead',  email: 'lead@syncup.com',  role: 'lead',        isActive: true, createdAt: '2026-01-05T00:00:00Z', updatedAt: '2026-01-05T00:00:00Z' },
  { id: 'u3', name: 'Alex Associate', email: 'associate@syncup.com', role: 'associate', isActive: true, createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' },
];

const leads = [
  { id: 'l1',  name: 'Rajesh Kumar',    designation: 'CTO',       company: 'TechNova',   phone: '+91-9876543210', email: 'rajesh@technova.in',   leadType: 'inbound',  stage: 'meeting_booked',     assignedToId: 'u3', source: 'manual',       createdAt: '2026-05-01T09:00:00Z', updatedAt: '2026-05-20T10:30:00Z' },
  { id: 'l2',  name: 'Priya Sharma',    designation: 'CEO',        company: 'StartFlow',  phone: '+91-9876543211', email: 'priya@startflow.com',  leadType: 'outbound', stage: 'followup_required',  assignedToId: 'u3', source: 'manual',       createdAt: '2026-05-03T11:00:00Z', updatedAt: '2026-05-22T14:00:00Z' },
  { id: 'l3',  name: 'Amit Patel',      designation: 'VP Sales',   company: 'GrowthCo',   phone: '+91-9876543212', email: null,                   leadType: 'cold',     stage: 'DNP',                assignedToId: 'u3', source: 'sheet_upload', createdAt: '2026-05-05T08:30:00Z', updatedAt: '2026-05-05T08:30:00Z' },
  { id: 'l4',  name: 'Sunita Verma',    designation: 'Director',   company: 'ScaleUp',    phone: '+91-9876543213', email: 'sunita@scaleup.io',    leadType: 'inbound',  stage: 'lead_onboarded',     assignedToId: 'u3', source: 'manual',       createdAt: '2026-04-10T10:00:00Z', updatedAt: '2026-05-15T16:45:00Z' },
  { id: 'l5',  name: 'Vikram Singh',    designation: 'Founder',    company: 'BuildFast',  phone: '+91-9876543214', email: null,                   leadType: 'outbound', stage: 'callback_requested', assignedToId: 'u2', source: 'manual',       createdAt: '2026-05-10T09:15:00Z', updatedAt: '2026-05-24T11:00:00Z' },
  { id: 'l6',  name: 'Neha Gupta',      designation: 'CMO',        company: 'MarketPro',  phone: '+91-9876543215', email: 'neha@marketpro.com',   leadType: 'inbound',  stage: 'followup_required',  assignedToId: 'u2', source: 'sheet_upload', createdAt: '2026-05-12T14:00:00Z', updatedAt: '2026-05-25T09:30:00Z' },
  { id: 'l7',  name: 'Arjun Mehta',     designation: 'Head IT',    company: 'DataSys',    phone: '+91-9876543216', email: 'arjun@datasys.io',     leadType: 'cold',     stage: 'meeting_booked',     assignedToId: 'u2', source: 'manual',       createdAt: '2026-05-14T10:30:00Z', updatedAt: '2026-05-26T15:00:00Z' },
  { id: 'l8',  name: 'Kavita Rao',      designation: 'CFO',        company: 'FinEdge',    phone: '+91-9876543217', email: 'kavita@finedge.com',   leadType: 'inbound',  stage: 'lead_onboarded',     assignedToId: 'u3', source: 'manual',       createdAt: '2026-04-20T08:00:00Z', updatedAt: '2026-05-10T12:00:00Z' },
  { id: 'l9',  name: 'Rohit Joshi',     designation: 'Product',    company: 'ProdCraft',  phone: '+91-9876543218', email: null,                   leadType: 'cold',     stage: 'DNP',                assignedToId: 'u3', source: 'sheet_upload', createdAt: '2026-05-18T11:00:00Z', updatedAt: '2026-05-18T11:00:00Z' },
  { id: 'l10', name: 'Divya Nair',      designation: 'COO',        company: 'OpsCo',      phone: '+91-9876543219', email: 'divya@opsco.in',       leadType: 'outbound', stage: 'callback_requested', assignedToId: 'u2', source: 'manual',       createdAt: '2026-05-20T13:00:00Z', updatedAt: '2026-05-27T10:00:00Z' },
  { id: 'l11', name: 'Manish Batra',    designation: 'Partner',    company: 'VentureLab', phone: '+91-9876543220', email: 'manish@venturelab.in', leadType: 'cold',     stage: 'DNP',                assignedToId: null, source: 'sheet_upload', createdAt: '2026-05-25T08:00:00Z', updatedAt: '2026-05-25T08:00:00Z' },
  { id: 'l12', name: 'Sneha Kulkarni',  designation: 'HR Director', company: 'PeopleFirst', phone: '+91-9876543221', email: 'sneha@peoplefirst.io', leadType: 'inbound', stage: 'callback_requested', assignedToId: null, source: 'manual',       createdAt: '2026-05-26T10:00:00Z', updatedAt: '2026-05-26T10:00:00Z' },
];

function enrichLead(l) {
  return {
    ...l,
    assignedTo: l.assignedToId ? (users.find(u => u.id === l.assignedToId) || null) : null,
  };
}

const activities = {
  l1: [
    { id: 'a1', leadId: 'l1', userId: 'u1', user: users[0], action: 'lead_created',   details: 'Lead created by Super Admin',                         createdAt: '2026-05-01T09:00:00Z' },
    { id: 'a2', leadId: 'l1', userId: 'u3', user: users[2], action: 'call_attempt',   details: 'Call attempted by Alex Associate',                     createdAt: '2026-05-05T10:15:00Z' },
    { id: 'a3', leadId: 'l1', userId: 'u3', user: users[2], action: 'stage_changed',  details: 'Stage changed from DNP to callback_requested',         createdAt: '2026-05-08T11:00:00Z' },
    { id: 'a4', leadId: 'l1', userId: 'u3', user: users[2], action: 'call_attempt',   details: 'Call attempted by Alex Associate',                     createdAt: '2026-05-12T09:30:00Z' },
    { id: 'a5', leadId: 'l1', userId: 'u3', user: users[2], action: 'stage_changed',  details: 'Stage changed from callback_requested to meeting_booked', createdAt: '2026-05-20T10:30:00Z' },
    { id: 'a6', leadId: 'l1', userId: 'u3', user: users[2], action: 'email_sent',     details: 'Automated email sent for stage: meeting_booked',       createdAt: '2026-05-20T10:30:01Z' },
    { id: 'a7', leadId: 'l1', userId: 'u3', user: users[2], action: 'note_added',     details: 'Client very interested in the Enterprise plan. Follow up post-meeting.', createdAt: '2026-05-20T10:35:00Z' },
  ],
  l2: [
    { id: 'b1', leadId: 'l2', userId: 'u1', user: users[0], action: 'lead_created',         details: 'Lead created by Super Admin',           createdAt: '2026-05-03T11:00:00Z' },
    { id: 'b2', leadId: 'l2', userId: 'u3', user: users[2], action: 'call_attempt',         details: 'Call attempted by Alex Associate',      createdAt: '2026-05-10T14:00:00Z' },
    { id: 'b3', leadId: 'l2', userId: 'u3', user: users[2], action: 'followup_scheduled',   details: 'followup 1 scheduled for May 28, 2026', createdAt: '2026-05-22T14:00:00Z' },
  ],
  l11: [
    { id: 'c1', leadId: 'l11', userId: 'u1', user: users[0], action: 'lead_created', details: 'Lead imported via sheet upload', createdAt: '2026-05-25T08:00:00Z' },
  ],
  l12: [
    { id: 'd1', leadId: 'l12', userId: 'u1', user: users[0], action: 'lead_created', details: 'Lead created by Super Admin', createdAt: '2026-05-26T10:00:00Z' },
  ],
};

const followups = {
  l2: [{ id: 'f1', leadId: 'l2', userId: 'u3', user: users[2], followupNumber: 'followup_1', scheduledAt: '2026-05-28T10:00:00Z', completedAt: null, notes: 'Discuss Q3 rollout', notified: false, createdAt: '2026-05-22T14:00:00Z' }],
  l6: [{ id: 'f2', leadId: 'l6', userId: 'u2', user: users[1], followupNumber: 'followup_1', scheduledAt: '2026-05-27T14:00:00Z', completedAt: null, notes: 'Demo call scheduled', notified: false, createdAt: '2026-05-25T09:30:00Z' }],
};

const notifications = [
  { id: 'n1', userId: 'u1', title: 'New Lead Assigned', body: 'You have been assigned a new lead: Divya Nair', type: 'lead_assigned', read: false, data: { leadId: 'l10' }, createdAt: '2026-05-27T10:00:00Z' },
  { id: 'n2', userId: 'u1', title: 'Followup Reminder', body: 'Time to follow up with Priya Sharma (followup 1)', type: 'followup_reminder', read: false, data: { leadId: 'l2' }, createdAt: '2026-05-27T09:00:00Z' },
  { id: 'n3', userId: 'u1', title: 'Meeting Booked', body: 'Meeting confirmed with Arjun Mehta', type: 'meeting_booked', read: true, data: { leadId: 'l7' }, createdAt: '2026-05-26T15:00:00Z' },
  { id: 'n4', userId: 'u1', title: 'New Lead Assigned', body: 'You have been assigned a new lead: Neha Gupta', type: 'lead_assigned', read: true, data: { leadId: 'l6' }, createdAt: '2026-05-25T09:30:00Z' },
  { id: 'n5', userId: 'u1', title: 'Followup Reminder', body: 'Time to follow up with Rohit Joshi (followup 1)', type: 'followup_reminder', read: true, data: { leadId: 'l9' }, createdAt: '2026-05-24T11:00:00Z' },
];

const emailTemplates = [
  { id: 't1', stage: 'DNP',                subject: "We tried reaching you",                        body: '<p>Hi {{name}},</p><p>We tried reaching you today. Please call us back at your convenience.</p><p>Best regards,<br/>The SyncUp Team</p>', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 't2', stage: 'callback_requested', subject: "We\'ll call you back at your preferred time",  body: '<p>Hi {{name}},</p><p>Thank you for requesting a callback. We\'ll reach you shortly.</p><p>Best regards,<br/>The SyncUp Team</p>', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 't3', stage: 'followup_required',  subject: "Following up on our conversation",             body: '<p>Hi {{name}},</p><p>Following up on our recent conversation. Do you have any questions?</p><p>Best regards,<br/>The SyncUp Team</p>', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 't4', stage: 'meeting_booked',     subject: "Your meeting is confirmed",                    body: '<p>Hi {{name}},</p><p>Your meeting has been confirmed! We look forward to connecting.</p><p>Best regards,<br/>The SyncUp Team</p>', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 't5', stage: 'lead_onboarded',     subject: "Welcome aboard",                               body: '<p>Hi {{name}},</p><p>Welcome aboard! We\'re excited to work with you.</p><p>Best regards,<br/>The SyncUp Team</p>', updatedAt: '2026-01-01T00:00:00Z' },
];

const whatsappTemplates = [
  { id: 'w1', stage: 'DNP',                message: "Hi {{name}}, we tried reaching you today. Please let us know a good time to connect!", updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'w2', stage: 'callback_requested', message: "Hi {{name}}, thanks for requesting a callback. We'll reach out to you shortly.", updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'w3', stage: 'followup_required',  message: "Hi {{name}}, following up on our conversation. Do you have any questions we can help with?", updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'w4', stage: 'meeting_booked',     message: "Hi {{name}}, your meeting is confirmed! Looking forward to connecting with you.", updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'w5', stage: 'lead_onboarded',     message: "Hi {{name}}, welcome aboard! We're excited to work with you. 🎉", updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'w6', stage: 'not_interested',     message: "Hi {{name}}, we understand. Feel free to reach out whenever you're ready. We're always here to help!", updatedAt: '2026-01-01T00:00:00Z' },
];

const auditLogs = [
  { id: 'al1', userId: 'u1', user: users[0], entityType: 'Lead', entityId: 'l1', action: 'create',       oldValues: null, newValues: { name: 'Rajesh Kumar' }, createdAt: '2026-05-01T09:00:00Z' },
  { id: 'al2', userId: 'u3', user: users[2], entityType: 'Lead', entityId: 'l1', action: 'stage_change',  oldValues: { stage: 'DNP' }, newValues: { stage: 'callback_requested' }, createdAt: '2026-05-08T11:00:00Z' },
  { id: 'al3', userId: 'u3', user: users[2], entityType: 'Lead', entityId: 'l1', action: 'stage_change',  oldValues: { stage: 'callback_requested' }, newValues: { stage: 'meeting_booked' }, createdAt: '2026-05-20T10:30:00Z' },
  { id: 'al4', userId: 'u1', user: users[0], entityType: 'User', entityId: 'u3', action: 'create',       oldValues: null, newValues: { name: 'Alex Associate', role: 'associate' }, createdAt: '2026-01-10T00:00:00Z' },
  { id: 'al5', userId: 'u3', user: users[2], entityType: 'Lead', entityId: 'l2', action: 'stage_change',  oldValues: { stage: 'DNP' }, newValues: { stage: 'followup_required' }, createdAt: '2026-05-22T14:00:00Z' },
  { id: 'al6', userId: 'u1', user: users[0], entityType: 'Lead', entityId: 'bulk', action: 'import',     oldValues: null, newValues: { imported: 4, failed: 0 }, createdAt: '2026-05-12T14:00:00Z' },
];

// ── Call priority sort ───────────────────────────────────────────────────────

const STAGE_PRIORITY = { DNP: 0, callback_requested: 1, followup_required: 2, meeting_booked: 3, lead_onboarded: 4, not_interested: 5 };

function sortByCallPriority(data, followupsMap) {
  return [...data].sort((a, b) => {
    const pa = STAGE_PRIORITY[a.stage] ?? 5;
    const pb = STAGE_PRIORITY[b.stage] ?? 5;
    if (pa !== pb) return pa - pb;
    // Within followup_required, sort by earliest scheduled followup
    if (a.stage === 'followup_required' && b.stage === 'followup_required') {
      const fa = (followupsMap[a.id] || []).find(f => !f.completedAt);
      const fb = (followupsMap[b.id] || []).find(f => !f.completedAt);
      if (fa && fb) return new Date(fa.scheduledAt) - new Date(fb.scheduledAt);
      if (fa) return -1;
      if (fb) return 1;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

// ── Auth middleware ──────────────────────────────────────────────────────────

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ success: false, error: 'No token' });
  try {
    req.user = jwt.verify(h.replace('Bearer ', ''), SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Auth
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, SECRET, { expiresIn: 86400 });
  res.json({ success: true, data: { token, user } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  res.json({ success: true, data: user });
});

app.put('/api/auth/me/push-token', auth, (req, res) => res.json({ success: true }));
app.put('/api/auth/me/password', auth, (req, res) => res.json({ success: true }));

// Users
app.get('/api/users', auth, (req, res) => res.json({ success: true, data: users }));
app.post('/api/users', auth, (req, res) => {
  const u = { id: `u${Date.now()}`, ...req.body, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  users.push(u);
  res.status(201).json({ success: true, data: u });
});
app.put('/api/users/:id', auth, (req, res) => {
  const u = users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ success: false, error: 'Not found' });
  Object.assign(u, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: u });
});
app.delete('/api/users/:id', auth, (req, res) => {
  const i = users.findIndex(x => x.id === req.params.id);
  if (i >= 0) users.splice(i, 1);
  res.json({ success: true });
});

// Leads
app.get('/api/leads/export', auth, (req, res) => {
  const enriched = leads.map(enrichLead);
  const csv = ['Name,Company,Phone,Email,Stage,Lead Type,Assigned To',
    ...enriched.map(l => `${l.name},${l.company},${l.phone},${l.email||''},${l.stage},${l.leadType},${l.assignedTo?.name||'Unassigned'}`)
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
  res.send(csv);
});

app.get('/api/leads', auth, (req, res) => {
  let data = leads.map(enrichLead);
  const { search, stage, leadType, assignedToId, unassigned, sortBy, page = 1, limit = 25 } = req.query;

  if (search) {
    const q = search.toLowerCase();
    data = data.filter(l => l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.phone.includes(q) || (l.email||'').toLowerCase().includes(q));
  }
  if (stage)        data = data.filter(l => l.stage === stage);
  if (leadType)     data = data.filter(l => l.leadType === leadType);
  if (unassigned === 'true') {
    data = data.filter(l => !l.assignedToId);
  } else if (assignedToId) {
    data = data.filter(l => l.assignedToId === assignedToId);
  }

  if (sortBy === 'call_priority') {
    data = sortByCallPriority(data, followups);
  } else if (sortBy === 'oldest') {
    data = [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sortBy === 'updated') {
    data = [...data].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } else {
    data = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const p = parseInt(page), lim = parseInt(limit);
  const total = data.length;
  const sliced = data.slice((p - 1) * lim, p * lim).map(l => ({
    ...l,
    followups: (followups[l.id] || []).filter(f => !f.completedAt),
  }));
  res.json({ success: true, data: sliced, total, page: p, limit: lim, totalPages: Math.ceil(total / lim) });
});

app.get('/api/leads/:id', auth, (req, res) => {
  const lead = leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: { ...enrichLead(lead), activities: (activities[lead.id] || []).slice().reverse(), followups: followups[lead.id] || [] } });
});

app.post('/api/leads', auth, (req, res) => {
  const newLead = {
    id: `l${Date.now()}`, ...req.body,
    stage: 'DNP', source: req.body.source || 'manual',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  leads.push(newLead);
  activities[newLead.id] = [{ id: `a${Date.now()}`, leadId: newLead.id, userId: req.user.id, user: users.find(u=>u.id===req.user.id), action: 'lead_created', details: `Lead created by ${req.user.name}`, createdAt: new Date().toISOString() }];
  res.status(201).json({ success: true, data: enrichLead(newLead) });
});

app.put('/api/leads/:id', auth, (req, res) => {
  const lead = leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Not found' });
  Object.assign(lead, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: enrichLead(lead) });
});

// Assign / Reassign lead
app.patch('/api/leads/:id/assign', auth, (req, res) => {
  const lead = leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Not found' });
  const { assignedToId } = req.body;
  const prevAssigneeId = lead.assignedToId;
  const prevAssignee = prevAssigneeId ? users.find(u => u.id === prevAssigneeId) : null;
  const newAssignee = assignedToId ? users.find(u => u.id === assignedToId) : null;

  lead.assignedToId = assignedToId || null;
  lead.updatedAt = new Date().toISOString();

  if (!activities[lead.id]) activities[lead.id] = [];
  const assignMsg = assignedToId
    ? (prevAssigneeId
        ? `Reassigned from ${prevAssignee?.name || 'Unassigned'} to ${newAssignee?.name || 'Unknown'} by ${req.user.name}`
        : `Assigned to ${newAssignee?.name || 'Unknown'} by ${req.user.name}`)
    : `Unassigned by ${req.user.name}`;
  activities[lead.id].unshift({
    id: `a${Date.now()}`, leadId: lead.id, userId: req.user.id,
    user: users.find(u => u.id === req.user.id), action: 'lead_assigned',
    details: assignMsg, createdAt: new Date().toISOString(),
  });

  if (assignedToId && assignedToId !== prevAssigneeId) {
    notifications.unshift({
      id: `n${Date.now()}`, userId: assignedToId,
      title: 'Lead Assigned to You',
      body: `${lead.name} from ${lead.company} has been assigned to you by ${req.user.name}`,
      type: 'lead_assigned', read: false,
      data: { leadId: lead.id }, createdAt: new Date().toISOString(),
    });
  }

  res.json({ success: true, data: enrichLead(lead) });
});

app.patch('/api/leads/:id/stage', auth, (req, res) => {
  const lead = leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Not found' });
  const prev = lead.stage;
  lead.stage = req.body.stage;
  lead.updatedAt = new Date().toISOString();
  if (!activities[lead.id]) activities[lead.id] = [];
  activities[lead.id].unshift({ id: `a${Date.now()}`, leadId: lead.id, userId: req.user.id, user: users.find(u=>u.id===req.user.id), action: 'stage_changed', details: `Stage changed from ${prev} to ${lead.stage} by ${req.user.name}`, createdAt: new Date().toISOString() });
  res.json({ success: true, data: enrichLead(lead) });
});

app.post('/api/leads/:id/notes', auth, (req, res) => {
  if (!activities[req.params.id]) activities[req.params.id] = [];
  const act = { id: `a${Date.now()}`, leadId: req.params.id, userId: req.user.id, user: users.find(u=>u.id===req.user.id), action: 'note_added', details: req.body.note, createdAt: new Date().toISOString() };
  activities[req.params.id].unshift(act);
  res.status(201).json({ success: true, data: act });
});

app.post('/api/leads/:id/call', auth, (req, res) => {
  if (!activities[req.params.id]) activities[req.params.id] = [];
  const act = { id: `a${Date.now()}`, leadId: req.params.id, userId: req.user.id, user: users.find(u=>u.id===req.user.id), action: 'call_attempt', details: `Call attempted by ${req.user.name}`, createdAt: new Date().toISOString() };
  activities[req.params.id].unshift(act);
  res.status(201).json({ success: true, data: act });
});

app.post('/api/leads/:id/followups', auth, (req, res) => {
  if (!followups[req.params.id]) followups[req.params.id] = [];
  const f = { id: `f${Date.now()}`, leadId: req.params.id, userId: req.user.id, user: users.find(u=>u.id===req.user.id), followupNumber: req.body.followupNumber, scheduledAt: req.body.scheduledAt, completedAt: null, notes: req.body.notes || null, notified: false, createdAt: new Date().toISOString() };
  followups[req.params.id].push(f);
  res.status(201).json({ success: true, data: f });
});

app.patch('/api/leads/:id/followups/:fid/complete', auth, (req, res) => {
  const list = followups[req.params.id] || [];
  const f = list.find(x => x.id === req.params.fid);
  if (!f) return res.status(404).json({ success: false, error: 'Not found' });
  f.completedAt = new Date().toISOString();
  res.json({ success: true, data: f });
});

app.delete('/api/leads/:id', auth, (req, res) => {
  const i = leads.findIndex(l => l.id === req.params.id);
  if (i >= 0) leads.splice(i, 1);
  res.json({ success: true });
});

// Duplicate lead
app.post('/api/leads/:id/duplicate', auth, (req, res) => {
  const src = leads.find(l => l.id === req.params.id);
  if (!src) return res.status(404).json({ success: false, error: 'Not found' });
  const dup = {
    ...src,
    id: `l${Date.now()}`,
    name: `${src.name} (Copy)`,
    stage: 'DNP',
    assignedToId: src.assignedToId,
    source: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  leads.push(dup);
  activities[dup.id] = [{ id: `a${Date.now()}`, leadId: dup.id, userId: req.user.id, user: users.find(u=>u.id===req.user.id), action: 'lead_created', details: `Duplicated from ${src.name} by ${req.user.name}`, createdAt: new Date().toISOString() }];
  res.status(201).json({ success: true, data: enrichLead(dup) });
});

// Bulk operations
app.patch('/api/leads/bulk', auth, (req, res) => {
  const { ids, assignedToId, stage } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, error: 'No IDs provided' });
  const updated = [];
  for (const id of ids) {
    const lead = leads.find(l => l.id === id);
    if (!lead) continue;
    if (stage !== undefined) lead.stage = stage;
    if (assignedToId !== undefined) lead.assignedToId = (assignedToId === '__unassign__' || !assignedToId) ? null : assignedToId;
    lead.updatedAt = new Date().toISOString();
    if (!activities[id]) activities[id] = [];
    if (stage !== undefined) activities[id].unshift({ id: `a${Date.now()}`, leadId: id, userId: req.user.id, user: users.find(u=>u.id===req.user.id), action: 'stage_changed', details: `Stage bulk-changed to ${stage} by ${req.user.name}`, createdAt: new Date().toISOString() });
    if (assignedToId !== undefined) activities[id].unshift({ id: `a${Date.now()+1}`, leadId: id, userId: req.user.id, user: users.find(u=>u.id===req.user.id), action: 'lead_assigned', details: `Bulk-assigned to ${assignedToId ? (users.find(u=>u.id===assignedToId)?.name||'Unknown') : 'Unassigned'} by ${req.user.name}`, createdAt: new Date().toISOString() });
    updated.push(enrichLead(lead));
  }
  res.json({ success: true, data: updated, count: updated.length });
});

// Dashboard
app.get('/api/dashboard/stats', auth, (req, res) => {
  const data = leads;
  const unassignedLeads = data.filter(l => !l.assignedToId).length;
  res.json({ success: true, data: {
    totalLeads: data.length,
    byType: { inbound: data.filter(l=>l.leadType==='inbound').length, outbound: data.filter(l=>l.leadType==='outbound').length, cold: data.filter(l=>l.leadType==='cold').length },
    byStage: { DNP: data.filter(l=>l.stage==='DNP').length, callback_requested: data.filter(l=>l.stage==='callback_requested').length, followup_required: data.filter(l=>l.stage==='followup_required').length, meeting_booked: data.filter(l=>l.stage==='meeting_booked').length, lead_onboarded: data.filter(l=>l.stage==='lead_onboarded').length, not_interested: data.filter(l=>l.stage==='not_interested').length },
    callsMade: 23, followupsCompleted: 7, leadsOnboarded: 2, conversionRate: 20,
    unassignedLeads,
  }});
});

app.get('/api/dashboard/daily-activity', auth, (req, res) => {
  const today = new Date();
  const data = Array.from({length: 14}, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - 13 + i);
    return { date: d.toISOString().split('T')[0], calls: Math.floor(Math.random()*8)+1, leads: Math.floor(Math.random()*3) };
  });
  res.json({ success: true, data });
});

app.get('/api/dashboard/user-performance', auth, (req, res) => {
  res.json({ success: true, data: [
    { userId: 'u2', userName: 'Sarah Lead',      totalLeads: 3, callsMade: 9,  onboarded: 1 },
    { userId: 'u3', userName: 'Alex Associate',  totalLeads: 7, callsMade: 14, onboarded: 1 },
  ]});
});

// Notifications
app.get('/api/notifications', auth, (req, res) => {
  const unread = notifications.filter(n=>!n.read).length;
  res.json({ success: true, data: notifications, total: notifications.length, unreadCount: unread, page: 1, totalPages: 1 });
});
app.patch('/api/notifications/:id/read', auth, (req, res) => {
  const n = notifications.find(x=>x.id===req.params.id); if(n) n.read=true;
  res.json({ success: true });
});
app.patch('/api/notifications/read-all', auth, (req, res) => {
  notifications.forEach(n => n.read = true);
  res.json({ success: true });
});
app.get('/api/notifications/unread-count', auth, (req, res) => {
  res.json({ success: true, data: { count: notifications.filter(n=>!n.read).length } });
});

// Settings
app.get('/api/settings/email-templates', auth, (req, res) => res.json({ success: true, data: emailTemplates }));
app.put('/api/settings/email-templates/:stage', auth, (req, res) => {
  const t = emailTemplates.find(x=>x.stage===req.params.stage);
  if(t) Object.assign(t, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: t });
});

app.get('/api/settings/whatsapp-templates', auth, (req, res) => res.json({ success: true, data: whatsappTemplates }));
app.put('/api/settings/whatsapp-templates/:stage', auth, (req, res) => {
  const t = whatsappTemplates.find(x=>x.stage===req.params.stage);
  if(t) Object.assign(t, req.body, { updatedAt: new Date().toISOString() });
  else whatsappTemplates.push({ id: `w${Date.now()}`, stage: req.params.stage, ...req.body, updatedAt: new Date().toISOString() });
  res.json({ success: true, data: t || whatsappTemplates.find(x=>x.stage===req.params.stage) });
});
app.get('/api/settings/smtp', auth, (req, res) => res.json({ success: true, data: { smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: 'demo@syncup.com', smtp_from: 'SyncUp CRM <demo@syncup.com>' } }));
app.put('/api/settings/smtp', auth, (req, res) => res.json({ success: true }));
app.post('/api/settings/email-templates/seed', auth, (req, res) => res.json({ success: true }));

// Upload
app.post('/api/upload/preview', auth, (req, res) => {
  res.json({ success: true, data: { filePath: '/tmp/demo.csv', total: 3, preview: [
    { row: 2, data: { Name: 'Demo Lead 1', Company: 'Corp A', Phone: '+91-9000000001', Email: 'lead1@corp.com', 'Lead Type': 'inbound' }, errors: [] },
    { row: 3, data: { Name: 'Demo Lead 2', Company: 'Corp B', Phone: '+91-9000000002', Email: '',              'Lead Type': 'cold'    }, errors: [] },
    { row: 4, data: { Name: '',            Company: 'Corp C', Phone: '',               Email: '',              'Lead Type': ''        }, errors: ['Name is required', 'Phone is required'] },
  ]}});
});
app.post('/api/upload/confirm', auth, (req, res) => {
  res.json({ success: true, data: { imported: 2, failed: 1, errors: [{ row: 4, reason: 'Name is required, Phone is required' }] } });
});

// Audit
app.get('/api/audit', auth, (req, res) => {
  res.json({ success: true, data: auditLogs, total: auditLogs.length, page: 1, totalPages: 1 });
});

app.get('/api/health', (_, res) => res.json({ status: 'ok (mock)', timestamp: new Date().toISOString() }));

app.get('/', (_, res) => res.send('<h2>SyncUp CRM Mock API is running.<br/><a href="http://localhost:3000">Open the web app → localhost:3000</a></h2>'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SyncUp CRM Mock API running on port ${PORT}`));
