import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SignJWT } from 'jose';
import { isSubscriptionActive } from '@/lib/subscription';

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'procureflow-secret-key-change-in-production'
);

// POST — Mobile Google login: verify Google token and return JWT
export async function POST(req: NextRequest) {
  try {
    const { idToken, email, name, picture } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Verify the Google ID token if provided
    if (idToken) {
      try {
        const googleRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
        );
        const googleData = await googleRes.json();

        if (!googleRes.ok || googleData.email !== email) {
          return NextResponse.json(
            { error: 'Invalid Google token' },
            { status: 401 }
          );
        }
      } catch {
        // If token verification fails, continue with email-based lookup
        console.error('Google token verification failed, continuing with email');
      }
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      include: { business: true },
    });

    if (!user) {
      // Auto-create account for Google users
      const business = await prisma.business.create({
        data: { name: `${name || 'User'}'s Business` },
      });

      user = await prisma.user.create({
        data: {
          email,
          name: name || 'User',
          hashedPassword: null,
          emailVerified: true,
          image: picture || null,
          businessId: business.id,
        },
        include: { business: true },
      });
    } else if (picture && !user.image) {
      await prisma.user.update({
        where: { id: user.id },
        data: { image: picture },
      });
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
  } catch (error) {
    console.error('Mobile Google login error:', error);
    return NextResponse.json(
      { error: 'Google login failed' },
      { status: 500 }
    );
  }
}
