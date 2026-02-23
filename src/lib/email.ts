import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
    const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

    // Always log the verification URL for testing/debugging
    console.log(`\n📧 Verification link for ${email}:\n${verifyUrl}\n`);

    const { data, error } = await resend.emails.send({
        from: 'StockManager AI <onboarding@resend.dev>',
        to: email,
        subject: 'Verify your StockManager AI account',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 8px;">⚡ StockManager AI</h1>
                <p style="color: #64748b; font-size: 14px; margin-bottom: 32px;">Smart B2B Procurement Platform</p>
                <h2 style="color: #1e293b; font-size: 20px;">Verify your email</h2>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                    Thanks for signing up! Click the button below to verify your email address and get started.
                </p>
                <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 24px 0;">
                    Verify Email
                </a>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">
                    This link expires in 24 hours. If you didn't create an account, you can ignore this email.
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
                    Or copy this link: <a href="${verifyUrl}" style="color: #3b82f6;">${verifyUrl}</a>
                </p>
            </div>
        `,
    });

    if (error) {
        console.error('❌ Resend error:', JSON.stringify(error));
        throw new Error(`Email sending failed: ${error.message}`);
    }

    console.log('✅ Email sent successfully:', data?.id);
}

