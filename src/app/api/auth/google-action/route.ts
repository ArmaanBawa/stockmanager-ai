import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { action } = await req.json();

    const response = NextResponse.json({ ok: true });
    response.cookies.set('google_auth_action', action || 'signin', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 300, // 5 minutes - enough time for OAuth flow
        path: '/',
    });

    return response;
}

