import { LeadStage, LeadType, FollowupNumber } from '../types';

export const LEAD_STAGES: LeadStage[] = [
  'DNP',
  'callback_requested',
  'followup_required',
  'meeting_booked',
  'lead_onboarded',
  'not_interested',
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  DNP: 'Did Not Pick',
  callback_requested: 'Callback Requested',
  followup_required: 'Followup Required',
  meeting_booked: 'Meeting Booked',
  lead_onboarded: 'Lead Onboarded',
  not_interested: 'Not Interested',
};

export const LEAD_TYPES: LeadType[] = ['inbound', 'outbound', 'cold'];

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  cold: 'Cold',
};

export const FOLLOWUP_NUMBERS: FollowupNumber[] = [
  'followup_1',
  'followup_2',
  'followup_3',
];

export const FOLLOWUP_LABELS: Record<FollowupNumber, string> = {
  followup_1: 'Followup 1',
  followup_2: 'Followup 2',
  followup_3: 'Followup 3',
};

export const STAGE_EMAIL_SUBJECT: Record<LeadStage, string> = {
  DNP: "We tried reaching you",
  callback_requested: "We'll call you back at your preferred time",
  followup_required: "Following up on our conversation",
  meeting_booked: "Your meeting is confirmed",
  lead_onboarded: "Welcome aboard",
  not_interested: "Sorry to see you go",
};

export const STAGE_WHATSAPP_MESSAGE: Record<LeadStage, string> = {
  DNP: "Hi {{name}}, we tried reaching you today. Please let us know a good time to connect!",
  callback_requested: "Hi {{name}}, thanks for requesting a callback. We'll reach out to you shortly.",
  followup_required: "Hi {{name}}, following up on our conversation. Do you have any questions we can help with?",
  meeting_booked: "Hi {{name}}, your meeting is confirmed! Looking forward to connecting with you.",
  lead_onboarded: "Hi {{name}}, welcome aboard! We're excited to work with you. 🎉",
  not_interested: "Hi {{name}}, we understand. Feel free to reach out whenever you're ready. We're always here to help!",
};

export const CSV_REQUIRED_COLUMNS = ['Name', 'Company', 'Phone'];
export const CSV_OPTIONAL_COLUMNS = ['Designation', 'Email', 'Lead Type'];

export const PAGE_SIZE = 25;
