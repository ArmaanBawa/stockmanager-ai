import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'procureflow-secret-key-change-in-production'
);

/**
 * Verify the mobile JWT token from the Authorization header
 * and return the user session info.
 */
export async function getMobileUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      businessId: payload.businessId as string,
      businessName: payload.businessName as string,
    };
  } catch {
    return null;
  }
}

