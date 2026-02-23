import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const token = req.nextUrl.searchParams.get('token');

        if (!token) {
            return NextResponse.redirect(new URL('/login?error=invalid-token', req.url));
        }

        const verification = await prisma.verificationToken.findUnique({
            where: { token },
        });

        if (!verification) {
            return NextResponse.redirect(new URL('/login?error=invalid-token', req.url));
        }

        if (verification.expiresAt < new Date()) {
            await prisma.verificationToken.delete({ where: { id: verification.id } });
            return NextResponse.redirect(new URL('/login?error=token-expired', req.url));
        }

        // Mark user as verified
        await prisma.user.update({
            where: { email: verification.email },
            data: { emailVerified: true },
        });

        // Delete the used token
        await prisma.verificationToken.delete({ where: { id: verification.id } });

        return NextResponse.redirect(new URL('/login?verified=true', req.url));
    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.redirect(new URL('/login?error=verification-failed', req.url));
    }
}
