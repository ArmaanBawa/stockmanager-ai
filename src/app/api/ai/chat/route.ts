import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { z } from 'zod';
import { getSessionUser } from '@/lib/helpers';
import prisma from '@/lib/prisma';
import * as aiTools from '@/lib/ai-chat';

export const maxDuration = 30;

export async function POST(req: Request) {
    const user = await getSessionUser();
    if (!user?.businessId) return new Response('Unauthorized', { status: 401 });

    const { messages } = await req.json();

    // Save the latest user message to DB
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user') {
        await prisma.chatMessage.create({
            data: {
                role: 'user',
                content: lastMessage.content,
                businessId: user.businessId,
            },
        });
    }

    const result = streamText({
        model: openai('gpt-4o-mini'),
        messages,
        system: `You are StockManager AI, a helpful procurement and inventory assistant for a B2B business. 
        You have access to tools to fetch real-time data about orders, inventory, suppliers, and purchase history.
        Always use the tools when asked about specific business data.
        Be concise, professional, and helpful. Use markdown for formatting.
        IMPORTANT: Match the user's language. If they write in Hinglish (Hindi + English mix), reply in Hinglish too. If they write in Hindi, reply in Hindi. If they write in English, reply in English.
        The current Business ID is ${user.businessId}.`,
        tools: {
            getOrderTracking: {
                description: 'Get recent orders and their tracking status. Optionally filter by supplier name.',
                parameters: z.object({
                    supplierName: z.string().optional().describe('Name of the supplier to filter by'),
                }),
                execute: async ({ supplierName }: { supplierName?: string }): Promise<any> => {
                    return await aiTools.getOrderTracking(user.businessId, supplierName);
                },
            },
            getStockLevels: {
                description: 'Get current stock levels for products. Optionally filter by product name.',
                parameters: z.object({
                    productName: z.string().optional().describe('Name of the product to check'),
                }),
                execute: async ({ productName }: { productName?: string }): Promise<any> => {
                    return await aiTools.getStockLevels(user.businessId, productName);
                },
            },
            getBusinessInsights: {
                description: 'Generate AI insights about business health, low stock, and slow moving inventory.',
                parameters: z.object({}),
                execute: async (): Promise<any> => {
                    return await aiTools.getBusinessInsights(user.businessId);
                },
            },
            getPurchaseHistory: {
                description: 'Get purchase history from the ledger. Optionally filter by period (last week, last month, last year) and supplier name.',
                parameters: z.object({
                    period: z.enum(['last week', 'last month', 'last year']).optional(),
                    supplierName: z.string().optional(),
                }),
                execute: async ({ period, supplierName }: { period?: 'last week' | 'last month' | 'last year'; supplierName?: string }): Promise<any> => {
                    return await aiTools.getPurchaseHistory(user.businessId, period, supplierName);
                },
            },
            getSuppliers: {
                description: 'Get a list of all suppliers and their contact information.',
                parameters: z.object({}),
                execute: async (): Promise<any> => {
                    return await aiTools.getSuppliers(user.businessId);
                },
            },
        },
        maxSteps: 5,
        onFinish: async ({ text }) => {
            // Save the assistant's response to DB
            if (text) {
                await prisma.chatMessage.create({
                    data: {
                        role: 'assistant',
                        content: text,
                        businessId: user.businessId,
                    },
                });
            }
        },
    });

    return result.toDataStreamResponse();
}
