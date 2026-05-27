import { prisma } from './prisma';

export async function logAudit(
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        entityType,
        entityId,
        action,
        oldValues: oldValues as never,
        newValues: newValues as never,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
