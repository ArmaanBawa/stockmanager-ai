import { NextResponse } from 'next/server';

// Temporary debug route to check env vars on Vercel
// DELETE THIS after debugging
export async function GET() {
    return NextResponse.json({
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET (' + process.env.NEXTAUTH_SECRET.length + ' chars)' : 'NOT SET',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'NOT SET',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET (' + process.env.GOOGLE_CLIENT_SECRET.length + ' chars)' : 'NOT SET',
        VERCEL_URL: process.env.VERCEL_URL || 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
    });
}

