import type { Subscription } from '@/generated/prisma';

export function isSubscriptionActive(subscription: Subscription | null): boolean {
    if (!subscription) return false;

    // Razorpay active statuses
    const activeStatuses = new Set(['created', 'authenticated', 'active']);
    if (!activeStatuses.has(subscription.status)) return false;

    if (subscription.currentPeriodEnd) {
        const now = new Date();
        if (subscription.currentPeriodEnd < now) return false;
    }

    return true;
}
