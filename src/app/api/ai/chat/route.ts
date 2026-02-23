import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
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
        model: openai('gpt-4o-mini') as any,
        messages,
        system: `You are StockManager AI, a helpful procurement and inventory assistant for a B2B business. 
        You have access to tools to fetch real-time data about orders, inventory, suppliers, and purchase history.
        Always use the tools when asked about specific business data.
        Be concise, professional, and helpful. Use markdown for formatting.
        IMPORTANT: Match the user's language. If they write in Hinglish (Hindi + English mix), reply in Hinglish too. If they write in Hindi, reply in Hindi. If they write in English, reply in English.
        The current Business ID is ${user.businessId}.`,
        tools: {
            getOrderTracking: tool({
                description: 'Get recent orders and their tracking status. Optionally filter by supplier name.',
                parameters: z.object({
                    supplierName: z.string().optional().describe('Name of the supplier to filter by'),
                }),
                execute: async ({ supplierName }: any) => {
                    const result = await aiTools.getOrderTracking(user.businessId, supplierName);
                    return result;
                },
            } as any),
            getStockLevels: tool({
                description: 'Get current stock levels for products. Optionally filter by product name.',
                parameters: z.object({
                    productName: z.string().optional().describe('Name of the product to check'),
                }),
                execute: async ({ productName }: any) => {
                    const result = await aiTools.getStockLevels(user.businessId, productName);
                    return result;
                },
            } as any),
            getBusinessInsights: tool({
                description: 'Generate AI insights about business health, low stock, and slow moving inventory.',
                parameters: z.object({}),
                execute: async () => {
                    const result = await aiTools.getBusinessInsights(user.businessId);
                    return result;
                },
            } as any),
            getPurchaseHistory: tool({
                description: 'Get purchase history from the ledger. Optionally filter by period (last week, last month, last year) and supplier name.',
                parameters: z.object({
                    period: z.enum(['last week', 'last month', 'last year']).optional(),
                    supplierName: z.string().optional(),
                }),
                execute: async ({ period, supplierName }: any) => {
                    const result = await aiTools.getPurchaseHistory(user.businessId, period, supplierName);
                    return result;
                },
            } as any),
            getSuppliers: tool({
                description: 'Get a list of all suppliers and their contact information.',
                parameters: z.object({}),
                execute: async () => {
                    const result = await aiTools.getSuppliers(user.businessId);
                    return result;
                },
            } as any),
        } as any,
        maxSteps: 5,
        onFinish: async ({ text }: any) => {
            // Save the assistant's response to DB
            if (text) {
                await (prisma as any).chatMessage.create({
                    data: {
                        role: 'assistant',
                        content: text,
                        businessId: user.businessId,
                    },
                });
            }
        },
    } as any);

    return (result as any).toDataStreamResponse();
}
