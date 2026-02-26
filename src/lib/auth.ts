import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
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

                if (!user || !user.hashedPassword) return null;

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
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                // Find or create user for Google sign-in
                let dbUser = await prisma.user.findUnique({
                    where: { email: user.email! },
                    include: { business: true },
                });

                if (!dbUser) {
                    // Create business and user for new Google sign-in
                    const business = await prisma.business.create({
                        data: { name: `${user.name}'s Business` },
                    });

                    dbUser = await prisma.user.create({
                        data: {
                            email: user.email!,
                            name: user.name || 'User',
                            hashedPassword: null,
                            emailVerified: true,
                            image: user.image || null,
                            businessId: business.id,
                        },
                        include: { business: true },
                    });
                } else if (!dbUser.image && user.image) {
                    // Update image if not set
                    await prisma.user.update({
                        where: { id: dbUser.id },
                        data: { image: user.image },
                    });
                }
            }
            return true;
        },
        async jwt({ token, user, account }) {
            if (user) {
                // For credentials, businessId comes from authorize()
                if ((user as any).businessId) {
                    token.businessId = (user as any).businessId;
                    token.businessName = (user as any).businessName;
                }
            }

            // For Google sign-in, fetch from DB
            if (account?.provider === 'google' && token.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email },
                    include: { business: true },
                });
                if (dbUser) {
                    token.sub = dbUser.id;
                    token.businessId = dbUser.businessId;
                    token.businessName = dbUser.business?.name;
                    token.picture = dbUser.image;
                }
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
