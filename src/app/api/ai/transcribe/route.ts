import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const audio = formData.get('audio');
    const model = (formData.get('model') as string) || 'gpt-4o-mini-transcribe';

    if (!audio || !(audio instanceof File)) {
        return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (audio.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: 'Audio file is too large (max 25MB)' }, { status: 413 });
    }

    const upstream = new FormData();
    upstream.append('file', audio, audio.name || 'speech.webm');
    upstream.append('model', model);
    upstream.append('response_format', 'json');
    upstream.append('temperature', '0');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
        body: upstream,
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
            { error: 'Transcription failed', details: errorText },
            { status: 502 }
        );
    }

    const data = await response.json();
    return NextResponse.json({ text: data?.text ?? '' });
}
