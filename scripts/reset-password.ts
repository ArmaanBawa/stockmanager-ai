#!/usr/bin/env tsx
/**
 * Password Reset Script
 * 
 * Usage:
 *   npx tsx scripts/reset-password.ts <email> <new-password>
 * 
 * Example:
 *   npx tsx scripts/reset-password.ts rahul@acme.com newpassword123
 */

import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';

async function resetPassword(email: string, newPassword: string) {
    try {
        console.log(`🔐 Resetting password for: ${email}`);

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true },
        });

        if (!user) {
            console.error(`❌ User with email ${email} not found`);
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.name}`);

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        console.log('🔒 Password hashed');

        // Update password
        await prisma.user.update({
            where: { email },
            data: { hashedPassword },
        });

        console.log('✅ Password reset successfully!');
        console.log(`\n📧 Email: ${email}`);
        console.log(`🔑 New Password: ${newPassword}`);
        console.log('\n⚠️  Please change this password after logging in!');
    } catch (error) {
        console.error('❌ Error resetting password:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
    console.error('Usage: npx tsx scripts/reset-password.ts <email> <new-password>');
    console.error('Example: npx tsx scripts/reset-password.ts rahul@acme.com newpassword123');
    process.exit(1);
}

const [email, newPassword] = args;

if (newPassword.length < 6) {
    console.error('❌ Password must be at least 6 characters long');
    process.exit(1);
}

resetPassword(email, newPassword);
