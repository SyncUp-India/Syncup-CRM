export type UserRole = 'super_admin' | 'lead' | 'associate';

export type LeadType = 'inbound' | 'outbound' | 'cold';

export type LeadStage =
  | 'DNP'
  | 'callback_requested'
  | 'followup_required'
  | 'meeting_booked'
  | 'lead_onboarded';

export type FollowupNumber = 'followup_1' | 'followup_2' | 'followup_3';

export type ActivityActionType =
  | 'stage_changed'
  | 'note_added'
  | 'call_attempt'
  | 'email_sent'
  | 'followup_scheduled'
  | 'followup_completed'
  | 'lead_created'
  | 'lead_assigned'
  | 'field_updated';

export type NotificationType =
  | 'followup_reminder'
  | 'lead_assigned'
  | 'meeting_booked'
  | 'general';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  designation?: string;
  company: string;
  phone: string;
  email?: string;
  leadType: LeadType;
  stage: LeadStage;
  assignedToId?: string;
  assignedTo?: User;
  source: string;
  createdAt: string;
  updatedAt: string;
  activities?: Activity[];
  followups?: Followup[];
}

export interface Activity {
  id: string;
  leadId: string;
  userId?: string;
  user?: User;
  action: ActivityActionType;
  details: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Followup {
  id: string;
  leadId: string;
  userId: string;
  user?: User;
  followupNumber: FollowupNumber;
  scheduledAt: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  stage: LeadStage;
  subject: string;
  body: string;
  updatedAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  stage: LeadStage;
  message: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardStats {
  totalLeads: number;
  byType: Record<LeadType, number>;
  byStage: Record<LeadStage, number>;
  callsMade: number;
  followupsCompleted: number;
  leadsOnboarded: number;
  conversionRate: number;
  unassignedLeads?: number;
}

export interface DailyActivity {
  date: string;
  calls: number;
  leads: number;
}

export interface UserPerformance {
  userId: string;
  userName: string;
  totalLeads: number;
  callsMade: number;
  onboarded: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type LeadSortBy = 'call_priority' | 'newest' | 'oldest' | 'updated';

export interface LeadFilters {
  search?: string;
  stage?: LeadStage;
  leadType?: LeadType;
  assignedToId?: string;
  unassigned?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: LeadSortBy;
  page?: number;
  limit?: number;
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: Array<{ row: number; reason: string; data?: Record<string, unknown> }>;
}

export interface CsvRow {
  Name: string;
  Designation?: string;
  Company: string;
  Phone: string;
  Email?: string;
  'Lead Type'?: string;
}
