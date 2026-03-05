import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SignJWT } from 'jose';
import { isSubscriptionActive } from '@/lib/subscription';

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'procureflow-secret-key-change-in-production'
);

// All valid Google OAuth client IDs (web, iOS, Android)
const VALID_CLIENT_IDS = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_IOS_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
  // Hardcoded fallbacks so token verification works even if env vars
  // aren't deployed yet
  '335604282591-m3kh1o4f958gbthdpjbtac2qt9tnni47.apps.googleusercontent.com', // web
  '335604282591-7paolmv2jm93g2lbn7g6gdrfo8jh3l0j.apps.googleusercontent.com', // iOS
  '335604282591-ku352ttuo1jbqt4tuq2m15s578iqn6ng.apps.googleusercontent.com', // Android
].filter(Boolean) as string[];

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

        // Verify the token was issued for one of our client IDs
        if (googleData.aud && !VALID_CLIENT_IDS.includes(googleData.aud)) {
          return NextResponse.json(
            { error: 'Token was not issued for this application' },
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
      role: user.role,
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
        role: user.role,
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
