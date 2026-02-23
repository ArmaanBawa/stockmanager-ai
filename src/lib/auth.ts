import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { business: true },
                });

                if (!user) return null;

                const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);
                if (!isValid) return null;

                if (!user.emailVerified) {
                    throw new Error('EMAIL_NOT_VERIFIED');
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    businessId: user.businessId,
                    businessName: user.business?.name,
                };
            },
        }),
    ],
    session: { strategy: 'jwt' },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.businessId = (user as any).businessId;
                token.businessName = (user as any).businessName;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub;
                (session.user as any).businessId = token.businessId;
                (session.user as any).businessName = token.businessName;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET || 'procureflow-secret-key-change-in-production',
};
