import { authFetch } from './api';
import { ChatMessage } from '../types';

/**
 * Load chat history from the server.
 */
export async function loadChatHistory(): Promise<ChatMessage[]> {
  try {
    const res = await authFetch('/api/ai/chat/history');
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    }));
  } catch {
    return [];
  }
}

/**
 * Clear chat history on the server.
 */
export async function clearChatHistory(): Promise<void> {
  await authFetch('/api/ai/chat/history', { method: 'DELETE' });
}

/**
 * Send a message to the AI and get a streamed response.
 * Since React Native doesn't fully support ReadableStream on all platforms,
 * we read the response as text and parse the Vercel AI SDK data stream format.
 *
 * The data stream format sends lines like:
 *   0:"text chunk"
 * We parse these to reconstruct the full response.
 */
export async function sendMessage(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const res = await authFetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      onError('Failed to get response from AI');
      return;
    }

    const responseText = await res.text();
    let fullText = '';

    // Parse the Vercel AI SDK data stream format
    const lines = responseText.split('\n');
    for (const line of lines) {
      // Text chunks are formatted as: 0:"text content"
      if (line.startsWith('0:')) {
        try {
          // Remove the "0:" prefix and parse the JSON string
          const jsonStr = line.slice(2);
          const text = JSON.parse(jsonStr);
          if (typeof text === 'string') {
            fullText += text;
            onChunk(fullText);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    if (fullText) {
      onDone(fullText);
    } else {
      // Fallback: maybe it's a plain text response
      onDone(responseText);
    }
  } catch (err: any) {
    onError(err.message || 'Network error');
  }
}

/**
 * Transcribe an audio file via the server-side OpenAI transcription endpoint.
 */
export async function transcribeAudio(uri: string): Promise<string> {
  const formData = new FormData();
  formData.append('audio', {
    uri,
    name: 'speech.m4a',
    type: 'audio/m4a',
  } as any);

  const res = await authFetch('/api/ai/transcribe', {
    method: 'POST',
    body: formData as any,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => '');
    throw new Error(message || 'Transcription failed');
  }

  const data = await res.json();
  return data?.text || '';
}
