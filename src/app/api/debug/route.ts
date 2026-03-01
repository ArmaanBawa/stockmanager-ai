import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Result = { status: '✅' | '⚠️' | '❌'; label: string; detail?: string };

export async function GET(req: NextRequest) {
    // Simple secret gate — pass ?key=debug123 (change in production)
    const key = req.nextUrl.searchParams.get('key');
    if (key !== 'debug123') {
        return NextResponse.json({ error: 'Unauthorized. Pass ?key=debug123' }, { status: 401 });
    }

    const results: Result[] = [];
    const pass = (label: string, detail?: string) => results.push({ status: '✅', label, detail });
    const warn = (label: string, detail?: string) => results.push({ status: '⚠️', label, detail });
    const fail = (label: string, detail?: string) => results.push({ status: '❌', label, detail });

    // ═══════════════════════════════════════════════════
    // 1. ENVIRONMENT VARIABLES
    // ═══════════════════════════════════════════════════
    const envVars: Record<string, { required: boolean; hint: string }> = {
        DATABASE_URL:            { required: true,  hint: 'Prisma DB connection string' },
        DIRECT_URL:              { required: false, hint: 'Prisma direct connection (for migrations)' },
        NEXTAUTH_SECRET:         { required: true,  hint: 'NextAuth session encryption key' },
        NEXTAUTH_URL:            { required: true,  hint: 'e.g. https://stockmanagerai.vercel.app' },
        RAZORPAY_KEY_ID:         { required: true,  hint: 'Razorpay Dashboard → API Keys' },
        RAZORPAY_KEY_SECRET:     { required: true,  hint: 'Razorpay Dashboard → API Keys' },
        RAZORPAY_PLAN_ID:        { required: true,  hint: 'Razorpay Dashboard → Plans → plan_XXXXXXX' },
        RAZORPAY_WEBHOOK_SECRET: { required: false, hint: 'Razorpay Dashboard → Webhooks → Secret' },
        GOOGLE_CLIENT_ID:        { required: false, hint: 'Google OAuth — for Google sign-in' },
        GOOGLE_CLIENT_SECRET:    { required: false, hint: 'Google OAuth — for Google sign-in' },
        OPENAI_API_KEY:          { required: false, hint: 'OpenAI — for AI chat & transcription' },
        RESEND_API_KEY:          { required: false, hint: 'Resend — for verification emails' },
    };

    for (const [name, { required, hint }] of Object.entries(envVars)) {
        const val = process.env[name];
        if (!val || val.trim() === '') {
            if (required) fail(`ENV MISSING: ${name}`, hint);
            else warn(`ENV MISSING (optional): ${name}`, hint);
        } else {
            // Show partial value for debugging (first 8 chars)
            const masked = val.length > 12 ? val.substring(0, 8) + '...' : '***';
            pass(`ENV: ${name}`, `Set (${masked})`);
        }
    }

    // ═══════════════════════════════════════════════════
    // 2. RAZORPAY KEY FORMAT
    // ═══════════════════════════════════════════════════
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const planId = process.env.RAZORPAY_PLAN_ID || '';

    if (keyId) {
        if (keyId.startsWith('rzp_test_')) pass('RAZORPAY_KEY_ID format', 'TEST mode');
        else if (keyId.startsWith('rzp_live_')) pass('RAZORPAY_KEY_ID format', 'LIVE mode');
        else fail('RAZORPAY_KEY_ID format', `Invalid — should start with rzp_test_ or rzp_live_, got: "${keyId.substring(0, 12)}..."`);
    }

    if (keySecret && keySecret.length < 10) {
        fail('RAZORPAY_KEY_SECRET length', `Too short (${keySecret.length} chars)`);
    }

    if (planId) {
        if (planId.startsWith('plan_')) pass('RAZORPAY_PLAN_ID format', planId);
        else fail('RAZORPAY_PLAN_ID format', `Should start with "plan_", got: "${planId.substring(0, 15)}..."`);
    }

    // Test / live mismatch warning
    if (keyId.startsWith('rzp_test_') && planId) {
        warn('Razorpay mode', 'Using TEST keys — make sure Plan ID was also created in TEST mode');
    }

    // ═══════════════════════════════════════════════════
    // 3. DATABASE CONNECTION
    // ═══════════════════════════════════════════════════
    let dbConnected = false;
    try {
        await prisma.$connect();
        pass('Database connection', 'Connected successfully');
        dbConnected = true;
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        fail('Database connection', msg);
    }

    if (dbConnected) {
        // ═══════════════════════════════════════════════════
        // 4. SCHEMA / TABLE CHECKS
        // ═══════════════════════════════════════════════════
        try {
            const sub = await prisma.subscription.findFirst();
            pass('Subscription table', 'Accessible');
            if (sub) {
                const fields = Object.keys(sub);
                const expected = ['id', 'businessId', 'razorpayCustomerId', 'razorpaySubscriptionId', 'status', 'currentPeriodEnd', 'cancelAtPeriodEnd', 'createdAt', 'updatedAt'];
                const missing = expected.filter(f => !fields.includes(f));
                if (missing.length > 0) fail('Subscription columns', `Missing: ${missing.join(', ')}`);
                else pass('Subscription columns', 'All expected columns present');
            } else {
                warn('Subscription data', 'Table is empty (OK for first-time subscribe)');
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            fail('Subscription table', msg);
        }

        try {
            const userCount = await prisma.user.count();
            pass('User table', `${userCount} user(s)`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            fail('User table', msg);
        }

        try {
            const bizCount = await prisma.business.count();
            pass('Business table', `${bizCount} business(es)`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            fail('Business table', msg);
        }

        // ═══════════════════════════════════════════════════
        // 5. DATA INTEGRITY
        // ═══════════════════════════════════════════════════
        try {
            const orphanUsers = await prisma.user.count({ where: { businessId: null } });
            if (orphanUsers > 0) warn('Users without business', `${orphanUsers} user(s) have no businessId — they cannot subscribe`);
            else pass('Users → Business link', 'All users have a businessId');
        } catch { /* skip */ }

        try {
            const users = await prisma.user.findMany({ select: { id: true, email: true, businessId: true } });
            for (const u of users) {
                if (u.businessId) {
                    const biz = await prisma.business.findUnique({ where: { id: u.businessId } });
                    if (!biz) fail('Broken FK', `User "${u.email}" → businessId "${u.businessId}" does NOT exist in Business table`);
                }
            }
        } catch { /* skip */ }

        try {
            const bizCount = await prisma.business.count();
            const subCount = await prisma.subscription.count();
            if (bizCount > subCount) warn('Business → Subscription', `${bizCount - subCount} business(es) have no Subscription record yet`);
            else pass('Business → Subscription', `All ${bizCount} business(es) have subscription records`);
        } catch { /* skip */ }

        // Check for a user that can actually do checkout
        try {
            const testUser = await prisma.user.findFirst({
                where: { businessId: { not: null } },
                include: { business: true },
            });
            if (testUser) {
                pass('Checkout-ready user', `"${testUser.email}" (businessId: ${testUser.businessId})`);
                const sub = await prisma.subscription.findUnique({ where: { businessId: testUser.businessId! } });
                if (sub) {
                    pass('Subscription record', `status: "${sub.status}", customerId: ${sub.razorpayCustomerId || 'NULL'}, subId: ${sub.razorpaySubscriptionId || 'NULL'}`);
                } else {
                    warn('Subscription record', 'None yet — will be created on first checkout');
                }
            } else {
                fail('Checkout-ready user', 'No user with a businessId exists — checkout will always return 401');
            }
        } catch { /* skip */ }
    }

    // ═══════════════════════════════════════════════════
    // 6. RAZORPAY API CONNECTIVITY
    // ═══════════════════════════════════════════════════
    if (keyId && keySecret) {
        try {
            const { default: Razorpay } = await import('razorpay');
            const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
            const plans = await rzp.plans.all({ count: 1 });
            pass('Razorpay API', `Connected — ${(plans as Record<string, unknown>).count ?? 'some'} plan(s) found`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            fail('Razorpay API', msg);
            if (msg.includes('401')) fail('Razorpay credentials', 'KEY_ID or KEY_SECRET is INVALID');
        }

        // Validate plan exists
        if (planId) {
            try {
                const { default: Razorpay } = await import('razorpay');
                const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
                const plan = await rzp.plans.fetch(planId) as Record<string, unknown>;
                const item = plan.item as Record<string, unknown> | undefined;
                pass('Razorpay Plan', `"${planId}" → ${plan.interval}x ${plan.period}, amount: ${item ? Number(item.amount) / 100 : '?'} ${item?.currency ?? ''}`);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                fail('Razorpay Plan', `"${planId}" NOT FOUND — ${msg}`);
                if (keyId.startsWith('rzp_test_')) fail('Plan mode mismatch?', 'You are using TEST keys — plan must also be created in TEST mode');
                else if (keyId.startsWith('rzp_live_')) fail('Plan mode mismatch?', 'You are using LIVE keys — plan must also be created in LIVE mode');
            }
        }
    } else {
        fail('Razorpay API', 'Skipped — missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
    }

    // ═══════════════════════════════════════════════════
    // 7. NEXTAUTH_URL CHECK
    // ═══════════════════════════════════════════════════
    const nextauthUrl = process.env.NEXTAUTH_URL || '';
    if (nextauthUrl) {
        if (nextauthUrl.includes('localhost')) {
            warn('NEXTAUTH_URL', `Set to "${nextauthUrl}" — this should be your Vercel URL in production`);
        } else {
            pass('NEXTAUTH_URL', nextauthUrl);
        }
    }

    // ═══════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════
    const errors = results.filter(r => r.status === '❌');
    const warnings = results.filter(r => r.status === '⚠️');
    const passes = results.filter(r => r.status === '✅');

    return NextResponse.json({
        summary: {
            passed: passes.length,
            warnings: warnings.length,
            errors: errors.length,
            verdict: errors.length > 0
                ? '🚨 Fix the errors below to resolve the 500 checkout error'
                : warnings.length > 0
                    ? '✅ No critical errors — review warnings'
                    : '🎉 Everything looks good!',
        },
        errors,
        warnings,
        passes,
    }, { status: 200 });
}

