import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getSessionUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return session.user as {
        id: string;
        email: string;
        name: string;
        businessId: string;
        businessName: string;
    };
}

export function generateOrderNumber(): string {
    const prefix = 'PO';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

export function generateLotNumber(): string {
    const prefix = 'LOT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}
