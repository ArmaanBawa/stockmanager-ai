import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getSessionUser } from '@/lib/helpers';
import { getMobileUser } from '@/lib/mobile-auth';
import prisma from '@/lib/prisma';
import * as aiTools from '@/lib/ai-chat';
import { NextRequest } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
    // Try NextAuth session first, then mobile JWT
    let user = await getSessionUser();
    if (!user?.businessId) {
        user = await getMobileUser(req);
    }
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
        system: `You are SalesManager AI, a helpful sales and inventory assistant for a B2B business that sells products (measured in meters) to customers. 
        You have access to tools to fetch real-time data about orders, inventory, customers, and sales history.
        You cannot create, edit, or delete data. If the user asks to make changes (e.g., create an order, add a customer),
        apologize briefly and give step-by-step guidance for doing it in the app UI. Use these paths:
        - Create order: Dashboard → Orders → + New Order → select customer → add items/qty/price → Place Order.
        - Add customer: Dashboard → Customers → + Add Customer → fill details → Add Customer.
        Never claim you performed a change.
        Always use the tools when asked about specific business data.
        Be concise, professional, and helpful. Use markdown for formatting.
        Key context:
        - Products are sold in meters
        - Orders represent sales to customers
        - The sales ledger tracks selling price, quantity sold, and total revenue
        - Stock is tracked in inventory with base price (cost), orders deduct stock automatically
        IMPORTANT: Match the user's language. If they write in Hinglish (Hindi + English mix), reply in Hinglish too. If they write in Hindi, reply in Hindi. If they write in English, reply in English.
        The current Business ID is ${user.businessId}.`,
        tools: {
            getOrderTracking: tool({
                description: 'Get recent sales orders and their status. Optionally filter by customer name.',
                parameters: z.object({
                    customerName: z.string().optional().describe('Name of the customer to filter by'),
                }),
                execute: async ({ customerName }: any) => {
                    const result = await aiTools.getOrderTracking(user.businessId, customerName);
                    return result;
                },
            } as any),
            getStockLevels: tool({
                description: 'Get current stock levels for products in meters. Optionally filter by product name.',
                parameters: z.object({
                    productName: z.string().optional().describe('Name of the product to check'),
                }),
                execute: async ({ productName }: any) => {
                    const result = await aiTools.getStockLevels(user.businessId, productName);
                    return result;
                },
            } as any),
            getBusinessInsights: tool({
                description: 'Generate AI insights about business health, stock levels, sales trends, and recommendations.',
                parameters: z.object({}),
                execute: async () => {
                    const result = await aiTools.getBusinessInsights(user.businessId);
                    return result;
                },
            } as any),
            getSalesHistory: tool({
                description: 'Get sales history from the ledger showing selling price, quantity sold, and total revenue. Optionally filter by period (last week, last month, last year) and customer name.',
                parameters: z.object({
                    period: z.enum(['last week', 'last month', 'last year']).optional(),
                    customerName: z.string().optional(),
                }),
                execute: async ({ period, customerName }: any) => {
                    const result = await aiTools.getSalesHistory(user.businessId, period, customerName);
                    return result;
                },
            } as any),
            getCustomers: tool({
                description: 'Get a list of all customers and their contact information, including order and product counts.',
                parameters: z.object({}),
                execute: async () => {
                    const result = await aiTools.getCustomers(user.businessId);
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
