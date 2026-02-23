import { NextResponse } from 'next/server';

export async function GET() {
    const cwd = process.cwd();
    const dbPath = `${cwd}/dev.db`;
    const fs = require('fs');
    const exists = fs.existsSync(dbPath);
    const prismaDirExists = fs.existsSync(`${cwd}/prisma/dev.db`);

    // check all possible locations
    const locations = [
        `${cwd}/dev.db`,
        `${cwd}/prisma/dev.db`,
        `./dev.db`,
        `./prisma/dev.db`,
    ].map(p => ({ path: p, exists: fs.existsSync(p) }));

    return NextResponse.json({ cwd, dbPath, exists, prismaDirExists, locations });
}
