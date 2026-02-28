import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { isSubscriptionActive } from '@/lib/subscription';

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'procureflow-secret-key-change-in-production'
);

// POST — Mobile login: returns a JWT token directly
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { business: true },
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const subscription = user.businessId
      ? await prisma.subscription.findUnique({ where: { businessId: user.businessId } })
      : null;
    const subscriptionStatus = subscription?.status || 'inactive';
    const subscriptionActive = isSubscriptionActive(subscription);

    // Create a JWT token
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      businessId: user.businessId,
      businessName: user.business?.name,
      subscriptionStatus,
      subscriptionActive,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .setIssuedAt()
      .sign(SECRET);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        businessId: user.businessId,
        businessName: user.business?.name || '',
        subscriptionStatus,
        subscriptionActive,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
