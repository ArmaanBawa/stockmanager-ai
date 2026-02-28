import { NextRequest, NextResponse } from 'next/server';
import { requireActiveSubscription } from '@/lib/billing';
import { generateInsights } from '@/lib/ai-engine';

export async function GET(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const insights = await generateInsights(user.businessId);
    return NextResponse.json(insights);
}
