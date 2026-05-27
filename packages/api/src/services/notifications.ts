import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { NotificationType } from '@syncup/shared';
import { prisma } from '../utils/prisma';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: NotificationType = 'general',
  data?: Record<string, unknown>
) {
  const notification = await prisma.notification.create({
    data: { userId, title, body, type, data: data as never },
  });

  // Send push notification if user has a push token
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true },
  });

  if (user?.pushToken && Expo.isExpoPushToken(user.pushToken)) {
    const message: ExpoPushMessage = {
      to: user.pushToken,
      sound: 'default',
      title,
      body,
      data: data as Record<string, string>,
    };
    try {
      const chunks = expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    } catch (err) {
      console.error('Push notification error:', err);
    }
  }

  return notification;
}

export async function notifyFollowupReminder(
  userId: string,
  leadId: string,
  leadName: string,
  followupNumber: string
) {
  return createNotification(
    userId,
    'Followup Reminder',
    `Time to follow up with ${leadName} (${followupNumber.replace('_', ' ')})`,
    'followup_reminder',
    { leadId, followupNumber }
  );
}

export async function notifyLeadAssigned(
  userId: string,
  leadId: string,
  leadName: string
) {
  return createNotification(
    userId,
    'New Lead Assigned',
    `You have been assigned a new lead: ${leadName}`,
    'lead_assigned',
    { leadId }
  );
}

export async function notifyMeetingBooked(
  userId: string,
  leadId: string,
  leadName: string
) {
  return createNotification(
    userId,
    'Meeting Booked',
    `Meeting confirmed with ${leadName}`,
    'meeting_booked',
    { leadId }
  );
}
