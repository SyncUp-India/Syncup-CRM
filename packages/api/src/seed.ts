import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './utils/prisma';
import { LEAD_STAGES, STAGE_EMAIL_SUBJECT } from '@syncup/shared';

async function main() {
  console.log('Seeding database...');

  // Create super admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@syncup.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@syncup.com',
      password: adminPassword,
      role: 'super_admin',
    },
  });

  // Create sample lead user
  const leadPassword = await bcrypt.hash('lead123', 12);
  const leadUser = await prisma.user.upsert({
    where: { email: 'lead@syncup.com' },
    update: {},
    create: {
      name: 'Sarah Lead',
      email: 'lead@syncup.com',
      password: leadPassword,
      role: 'lead',
    },
  });

  // Create sample associate
  const assocPassword = await bcrypt.hash('assoc123', 12);
  const associate = await prisma.user.upsert({
    where: { email: 'associate@syncup.com' },
    update: {},
    create: {
      name: 'Alex Associate',
      email: 'associate@syncup.com',
      password: assocPassword,
      role: 'associate',
    },
  });

  // Seed email templates
  const templates = [
    { stage: 'DNP' as const, subject: STAGE_EMAIL_SUBJECT.DNP, body: `<p>Hi {{name}},</p><p>We tried reaching you today. Please call us back at your convenience.</p><p>Best regards,<br/>The SyncUp Team</p>` },
    { stage: 'callback_requested' as const, subject: STAGE_EMAIL_SUBJECT.callback_requested, body: `<p>Hi {{name}},</p><p>Thank you for requesting a callback. We'll reach you shortly.</p><p>Best regards,<br/>The SyncUp Team</p>` },
    { stage: 'followup_required' as const, subject: STAGE_EMAIL_SUBJECT.followup_required, body: `<p>Hi {{name}},</p><p>Following up on our recent conversation. Do you have any questions?</p><p>Best regards,<br/>The SyncUp Team</p>` },
    { stage: 'meeting_booked' as const, subject: STAGE_EMAIL_SUBJECT.meeting_booked, body: `<p>Hi {{name}},</p><p>Your meeting has been confirmed! We look forward to connecting.</p><p>Best regards,<br/>The SyncUp Team</p>` },
    { stage: 'lead_onboarded' as const, subject: STAGE_EMAIL_SUBJECT.lead_onboarded, body: `<p>Hi {{name}},</p><p>Welcome aboard! We're excited to work with you.</p><p>Best regards,<br/>The SyncUp Team</p>` },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { stage: t.stage },
      update: {},
      create: t,
    });
  }

  // Seed sample leads
  const sampleLeads = [
    { name: 'Rajesh Kumar', designation: 'CTO', company: 'TechNova', phone: '+91-9876543210', email: 'rajesh@technova.in', leadType: 'inbound' as const, stage: 'meeting_booked' as const },
    { name: 'Priya Sharma', designation: 'CEO', company: 'StartFlow', phone: '+91-9876543211', email: 'priya@startflow.com', leadType: 'outbound' as const, stage: 'followup_required' as const },
    { name: 'Amit Patel', designation: 'VP Sales', company: 'GrowthCo', phone: '+91-9876543212', leadType: 'cold' as const, stage: 'DNP' as const },
    { name: 'Sunita Verma', designation: 'Director', company: 'ScaleUp', phone: '+91-9876543213', email: 'sunita@scaleup.io', leadType: 'inbound' as const, stage: 'lead_onboarded' as const },
    { name: 'Vikram Singh', designation: 'Founder', company: 'BuildFast', phone: '+91-9876543214', leadType: 'outbound' as const, stage: 'callback_requested' as const },
  ];

  for (const lead of sampleLeads) {
    const created = await prisma.lead.create({
      data: { ...lead, assignedToId: associate.id },
    });
    await prisma.activity.create({
      data: {
        leadId: created.id,
        userId: admin.id,
        action: 'lead_created',
        details: 'Lead created during seed',
      },
    });
  }

  console.log('✓ Database seeded successfully');
  console.log('  admin@syncup.com / admin123');
  console.log('  lead@syncup.com / lead123');
  console.log('  associate@syncup.com / assoc123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
