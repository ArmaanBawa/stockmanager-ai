import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/helpers';

// Reset password for logged-in user (requires current password)
export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user?.businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
        }

        // Get user from database
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Verify current password
        if (!dbUser.hashedPassword) {
            return NextResponse.json({ error: 'This account uses Google sign-in and has no password' }, { status: 400 });
        }
        const isValid = await bcrypt.compare(currentPassword, dbUser.hashedPassword);
        if (!isValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: { hashedPassword },
        });

        return NextResponse.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Admin reset (for development/testing - requires email and new password)
export async function PUT(req: NextRequest) {
    try {
        const { email, newPassword } = await req.json();

        if (!email || !newPassword) {
            return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await prisma.user.update({
            where: { email },
            data: { hashedPassword },
        });

        return NextResponse.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
