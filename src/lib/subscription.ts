import type { Subscription } from '@/generated/prisma';

export function isSubscriptionActive(subscription: Subscription | null): boolean {
    if (!subscription) return false;

    // Razorpay active statuses — always considered active (if not past period end)
    const activeStatuses = new Set(['created', 'authenticated', 'active']);

    // Cancelled / halted / completed — still active if currentPeriodEnd is in the future
    const gracePeriodStatuses = new Set(['cancelled', 'halted', 'completed']);

    const isActive = activeStatuses.has(subscription.status);
    const isInGracePeriod = gracePeriodStatuses.has(subscription.status);

    if (!isActive && !isInGracePeriod) return false;

    // For grace-period statuses, they MUST have a future currentPeriodEnd
    if (isInGracePeriod) {
        if (!subscription.currentPeriodEnd) return false;
        return subscription.currentPeriodEnd > new Date();
    }

    // For active statuses, check period end if it exists
    if (subscription.currentPeriodEnd) {
        if (subscription.currentPeriodEnd < new Date()) return false;
    }

    return true;
}
