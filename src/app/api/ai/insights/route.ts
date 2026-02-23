import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/helpers';
import { generateInsights } from '@/lib/ai-engine';

export async function GET() {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const insights = await generateInsights(user.businessId);
    return NextResponse.json(insights);
}
