import cron from 'node-cron';
import { prisma } from '../utils/prisma';
import { notifyFollowupReminder } from '../services/notifications';

export function startFollowupScheduler() {
  // Run every minute to check for due followups
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    try {
      const dueFollowups = await prisma.followup.findMany({
        where: {
          scheduledAt: { lte: now },
          completedAt: null,
          notified: false,
        },
        include: {
          lead: { select: { name: true, id: true } },
          user: { select: { id: true } },
        },
      });

      for (const followup of dueFollowups) {
        await notifyFollowupReminder(
          followup.userId,
          followup.leadId,
          followup.lead.name,
          followup.followupNumber
        );

        await prisma.followup.update({
          where: { id: followup.id },
          data: { notified: true },
        });
      }

      if (dueFollowups.length > 0) {
        console.log(`Sent ${dueFollowups.length} followup reminders`);
      }
    } catch (err) {
      console.error('Followup scheduler error:', err);
    }
  });

  console.log('Followup scheduler started');
}
