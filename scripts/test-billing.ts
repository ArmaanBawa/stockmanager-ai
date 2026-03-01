/**
 * Billing Checkout Diagnostic Script
 *
 * Run with: npx tsx scripts/test-billing.ts
 *
 * This script checks every step of the /api/billing/checkout flow
 * to find the exact cause of the 500 error.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env first, then .env.local (overrides)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const errors: string[] = [];
const warnings: string[] = [];
const passed: string[] = [];

function pass(msg: string) { passed.push(msg); console.log(`  ${GREEN}✔${RESET} ${msg}`); }
function warn(msg: string) { warnings.push(msg); console.log(`  ${YELLOW}⚠${RESET} ${msg}`); }
function fail(msg: string) { errors.push(msg); console.log(`  ${RED}✖${RESET} ${msg}`); }
function section(title: string) { console.log(`\n${CYAN}${BOLD}── ${title} ──${RESET}`); }

async function main() {
    console.log(`\n${BOLD}🔍 Billing Checkout Diagnostic${RESET}`);
    console.log(`${'─'.repeat(50)}`);

    // ═══════════════════════════════════════════════════
    // 1. ENVIRONMENT VARIABLES
    // ═══════════════════════════════════════════════════
    section('1. Environment Variables');

    const envChecks: Record<string, { required: boolean; hint: string }> = {
        DATABASE_URL:            { required: true,  hint: 'Prisma DB connection string' },
        DIRECT_URL:              { required: false, hint: 'Prisma direct connection (for migrations)' },
        NEXTAUTH_SECRET:         { required: true,  hint: 'NextAuth session encryption key' },
        NEXTAUTH_URL:            { required: true,  hint: 'e.g. http://localhost:3000' },
        RAZORPAY_KEY_ID:         { required: true,  hint: 'Razorpay dashboard → API Keys' },
        RAZORPAY_KEY_SECRET:     { required: true,  hint: 'Razorpay dashboard → API Keys' },
        RAZORPAY_PLAN_ID:        { required: true,  hint: 'Razorpay dashboard → Plans → plan_XXXXXXX' },
        RAZORPAY_WEBHOOK_SECRET: { required: false, hint: 'Razorpay dashboard → Webhooks → Secret' },
    };

    for (const [key, { required, hint }] of Object.entries(envChecks)) {
        const val = process.env[key];
        if (!val || val.trim() === '') {
            if (required) fail(`Missing: ${key}  →  ${hint}`);
            else warn(`Missing (optional): ${key}  →  ${hint}`);
        } else {
            pass(`${key} is set`);
        }
    }

    // ═══════════════════════════════════════════════════
    // 2. RAZORPAY KEY FORMAT
    // ═══════════════════════════════════════════════════
    section('2. Razorpay Key Format');

    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const planId = process.env.RAZORPAY_PLAN_ID || '';

    if (keyId) {
        if (keyId.startsWith('rzp_test_')) {
            pass(`RAZORPAY_KEY_ID is in TEST mode`);
        } else if (keyId.startsWith('rzp_live_')) {
            pass(`RAZORPAY_KEY_ID is in LIVE mode`);
        } else {
            fail(`RAZORPAY_KEY_ID has invalid format: "${keyId.substring(0, 12)}..." — must start with rzp_test_ or rzp_live_`);
        }
    }

    if (keySecret) {
        if (keySecret.length < 10) {
            fail(`RAZORPAY_KEY_SECRET seems too short (${keySecret.length} chars)`);
        } else {
            pass(`RAZORPAY_KEY_SECRET length OK (${keySecret.length} chars)`);
        }
    }

    if (planId) {
        if (planId.startsWith('plan_')) {
            pass(`RAZORPAY_PLAN_ID format OK: "${planId}"`);
        } else {
            fail(`RAZORPAY_PLAN_ID should start with "plan_", got: "${planId.substring(0, 15)}..."`);
        }
    }

    // Check test/live mismatch
    if (keyId.startsWith('rzp_test_') && planId) {
        warn('Using TEST mode keys — make sure the Plan ID was also created in TEST mode');
    }

    // ═══════════════════════════════════════════════════
    // 3. DATABASE CONNECTION
    // ═══════════════════════════════════════════════════
    section('3. Database Connection');

    let prisma: any;
    try {
        const { PrismaClient } = await import('../src/generated/prisma/index.js');
        prisma = new PrismaClient();
        await prisma.$connect();
        pass('Database connection successful');
    } catch (e: any) {
        fail(`Database connection FAILED: ${e.message}`);
        printSummary();
        process.exit(1);
    }

    // ═══════════════════════════════════════════════════
    // 4. TABLE/SCHEMA CHECKS
    // ═══════════════════════════════════════════════════
    section('4. Schema / Table Checks');

    // Check Subscription model fields
    try {
        const sub = await prisma.subscription.findFirst();
        pass('Subscription table is accessible');
        if (sub) {
            const fields = Object.keys(sub);
            const expected = ['id', 'businessId', 'razorpayCustomerId', 'razorpaySubscriptionId', 'status', 'currentPeriodEnd', 'cancelAtPeriodEnd', 'createdAt', 'updatedAt'];
            const missing = expected.filter(f => !fields.includes(f));
            if (missing.length > 0) {
                fail(`Subscription table missing columns: ${missing.join(', ')}`);
            } else {
                pass(`Subscription table has all expected columns`);
            }
        } else {
            warn('Subscription table is empty (no rows yet — this is OK for first-time subscribe)');
        }
    } catch (e: any) {
        fail(`Cannot query Subscription table: ${e.message}`);
    }

    // Check User model
    try {
        const user = await prisma.user.findFirst({ include: { business: true } });
        pass('User table is accessible');
        if (user) {
            if (!user.businessId) {
                warn(`First user "${user.email}" has no businessId — checkout will return 401`);
            } else {
                pass(`User "${user.email}" has businessId: ${user.businessId}`);
            }
            if (!user.business) {
                fail(`User "${user.email}" has businessId="${user.businessId}" but the Business record doesn't exist!`);
            }
        } else {
            warn('User table is empty — no users to test with');
        }
    } catch (e: any) {
        fail(`Cannot query User table: ${e.message}`);
    }

    // Check Business model
    try {
        const count = await prisma.business.count();
        pass(`Business table accessible (${count} record(s))`);
        if (count === 0) warn('No businesses exist — user must register first');
    } catch (e: any) {
        fail(`Cannot query Business table: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════
    // 5. DATA INTEGRITY — Users → Business → Subscription
    // ═══════════════════════════════════════════════════
    section('5. Data Integrity');

    try {
        const usersWithoutBiz = await prisma.user.count({ where: { businessId: null } });
        if (usersWithoutBiz > 0) {
            warn(`${usersWithoutBiz} user(s) have no businessId — they CANNOT subscribe (will get 401)`);
        } else {
            pass('All users have a businessId');
        }

        const allUsers = await prisma.user.findMany({ select: { id: true, email: true, businessId: true } });
        for (const u of allUsers) {
            if (u.businessId) {
                const biz = await prisma.business.findUnique({ where: { id: u.businessId } });
                if (!biz) {
                    fail(`User "${u.email}" references businessId="${u.businessId}" but that Business does NOT exist!`);
                }
            }
        }

        const bizCount = await prisma.business.count();
        const subCount = await prisma.subscription.count();
        if (bizCount > subCount) {
            warn(`${bizCount - subCount} business(es) don't have a Subscription record yet (created on first checkout)`);
        } else {
            pass(`All ${bizCount} business(es) have subscription records`);
        }
    } catch (e: any) {
        fail(`Data integrity check failed: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════
    // 6. RAZORPAY API CONNECTIVITY
    // ═══════════════════════════════════════════════════
    section('6. Razorpay API Connectivity');

    if (keyId && keySecret) {
        try {
            const Razorpay = (await import('razorpay')).default;
            const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

            // Test: fetch plans
            const plans = await rzp.plans.all({ count: 1 });
            pass(`Razorpay API connected — ${(plans as any).count ?? 'some'} plan(s) found`);
        } catch (e: any) {
            fail(`Razorpay API call FAILED: ${e.message}`);
            if (e.statusCode === 401) {
                fail('→ Your RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is INVALID');
            }
        }
    } else {
        fail('Skipping Razorpay API test — missing keys');
    }

    // ═══════════════════════════════════════════════════
    // 7. VALIDATE PLAN ID EXISTS IN RAZORPAY
    // ═══════════════════════════════════════════════════
    section('7. Validate Plan ID');

    if (keyId && keySecret && planId) {
        try {
            const Razorpay = (await import('razorpay')).default;
            const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
            const plan = await rzp.plans.fetch(planId);
            pass(`Plan "${planId}" exists — interval: ${(plan as any).interval}x ${(plan as any).period}, amount: ${(plan as any).item?.amount / 100} ${(plan as any).item?.currency}`);
        } catch (e: any) {
            fail(`Plan "${planId}" NOT FOUND in Razorpay: ${e.message}`);
            if (e.statusCode === 400 || e.statusCode === 404) {
                fail('→ The RAZORPAY_PLAN_ID does not exist. Create it in Razorpay Dashboard → Plans');
            }
            if (keyId.startsWith('rzp_test_')) {
                fail('→ You are using TEST keys — make sure the plan was created in TEST mode (not LIVE)');
            } else if (keyId.startsWith('rzp_live_')) {
                fail('→ You are using LIVE keys — make sure the plan was created in LIVE mode (not TEST)');
            }
        }
    } else {
        fail('Skipping Plan ID validation — missing keys or plan ID');
    }

    // ═══════════════════════════════════════════════════
    // 8. SIMULATE CHECKOUT FLOW (dry run)
    // ═══════════════════════════════════════════════════
    section('8. Simulate Checkout Flow (dry run)');

    try {
        // Step 1: Get a user with businessId
        const testUser = await prisma.user.findFirst({
            where: { businessId: { not: null } },
            include: { business: true },
        });

        if (!testUser) {
            fail('No user with a businessId exists — checkout will always return 401');
        } else {
            pass(`Test user: "${testUser.email}" (businessId: ${testUser.businessId})`);

            // Step 2: Check if subscription record exists
            const existingSub = await prisma.subscription.findUnique({
                where: { businessId: testUser.businessId! },
            });

            if (existingSub) {
                pass(`Existing subscription found — status: "${existingSub.status}", customerId: ${existingSub.razorpayCustomerId || 'NULL'}`);
                if (existingSub.razorpayCustomerId) {
                    pass('Has razorpayCustomerId — will skip customer creation step');
                } else {
                    warn('No razorpayCustomerId — checkout will create a new Razorpay customer');
                }
            } else {
                warn('No subscription record — checkout will create one on first call');
            }

            // Step 3: Try creating a Razorpay customer (actual API call)
            if (keyId && keySecret) {
                try {
                    const Razorpay = (await import('razorpay')).default;
                    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

                    if (!existingSub?.razorpayCustomerId) {
                        const customer = await rzp.customers.create({
                            name: testUser.business?.name || testUser.name,
                            email: testUser.email,
                            notes: { businessId: testUser.businessId!, userId: testUser.id },
                        });
                        pass(`Razorpay customer created successfully: ${customer.id}`);

                        // Clean up — save it so it's not orphaned
                        await prisma.subscription.upsert({
                            where: { businessId: testUser.businessId! },
                            create: {
                                businessId: testUser.businessId!,
                                razorpayCustomerId: customer.id,
                                status: 'inactive',
                            },
                            update: {
                                razorpayCustomerId: customer.id,
                            },
                        });
                        pass('Saved razorpayCustomerId to Subscription record');
                    }
                } catch (e: any) {
                    fail(`Failed to create Razorpay customer: ${e.message}`);
                    if (e.error?.description) fail(`→ Razorpay says: ${e.error.description}`);
                }

                // Step 4: Try creating a subscription (actual API call)
                try {
                    const Razorpay = (await import('razorpay')).default;
                    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

                    const sub = await rzp.subscriptions.create({
                        plan_id: planId,
                        customer_notify: 1,
                        total_count: 120,
                        notes: { businessId: testUser.businessId!, userId: testUser.id },
                    });
                    pass(`Razorpay subscription created: ${sub.id} (status: ${(sub as any).status})`);
                    console.log(`\n  ${GREEN}${BOLD}🎉 Full checkout flow works! The 500 error is likely a SESSION issue.${RESET}`);
                    console.log(`  ${CYAN}→ Make sure you are LOGGED IN when clicking "Subscribe Now"${RESET}`);
                    console.log(`  ${CYAN}→ Check that your session includes businessId (check JWT callback in auth.ts)${RESET}`);
                } catch (e: any) {
                    fail(`Failed to create Razorpay subscription: ${e.message}`);
                    if (e.error?.description) fail(`→ Razorpay says: ${e.error.description}`);
                    if (e.statusCode === 400) {
                        fail('→ This usually means the plan_id is invalid or mismatched (test vs live)');
                    }
                }
            }
        }
    } catch (e: any) {
        fail(`Simulation failed: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════
    // 9. CHECK PENDING MIGRATIONS
    // ═══════════════════════════════════════════════════
    section('9. Pending Migrations');

    try {
        const pending: any[] = await prisma.$queryRaw`
            SELECT migration_name, finished_at 
            FROM _prisma_migrations 
            WHERE finished_at IS NULL
        `;
        if (pending.length > 0) {
            fail(`${pending.length} pending/failed migration(s): ${pending.map((m: any) => m.migration_name).join(', ')}`);
        } else {
            pass('All migrations applied successfully');
        }
    } catch (e: any) {
        warn(`Could not check migrations table: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════
    await prisma.$disconnect();
    printSummary();
}

function printSummary() {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`${BOLD}           DIAGNOSTIC SUMMARY${RESET}`);
    console.log(`${'═'.repeat(50)}\n`);

    console.log(`  ${GREEN}✔ Passed:${RESET}   ${passed.length}`);
    console.log(`  ${YELLOW}⚠ Warnings:${RESET} ${warnings.length}`);
    console.log(`  ${RED}✖ Errors:${RESET}   ${errors.length}`);

    if (errors.length > 0) {
        console.log(`\n${RED}${BOLD}  Errors to fix:${RESET}`);
        errors.forEach((e, i) => console.log(`  ${RED}${i + 1}. ${e}${RESET}`));
        console.log(`\n${RED}🚨 Fix the errors above to resolve the 500 checkout error.${RESET}\n`);
    } else if (warnings.length > 0) {
        console.log(`\n${GREEN}✅ No critical errors found.${RESET}`);
        console.log(`${YELLOW}Review warnings above — the 500 may be a session/auth issue.${RESET}\n`);
    } else {
        console.log(`\n${GREEN}🎉 Everything looks good! The issue is likely session-related.${RESET}\n`);
    }

    process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((e) => {
    console.error(`\n${RED}Script crashed:${RESET}`, e);
    process.exit(1);
});


