import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const { name, email, password, businessName } = await req.json();

        if (!name || !email || !password || !businessName) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const business = await prisma.business.create({
            data: { name: businessName },
        });

        const user = await prisma.user.create({
            data: {
                name,
                email,
                hashedPassword,
                emailVerified: false,
                businessId: business.id,
            },
        });

        // Generate verification token
        const token = crypto.randomBytes(32).toString('hex');
        await prisma.verificationToken.create({
            data: {
                token,
                email: user.email,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            },
        });

        // Send verification email
        try {
            await sendVerificationEmail(email, token);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Still return success — user created, they can request a resend later
        }

        return NextResponse.json({
            message: 'Account created. Please check your email to verify.',
        }, { status: 201 });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
