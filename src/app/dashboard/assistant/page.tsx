'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';

const WELCOME_MESSAGE = {
    id: 'welcome',
    role: 'assistant' as const,
    content: `👋 Hi! I'm your AI procurement assistant.\n\nI can help you with:\n• **Order tracking**\n• **Stock levels**\n• **Reorder advice**\n• **Purchase history**\n• **Business insights**\n\nWhat would you like to know?`,
};

const SUGGESTIONS = [
    'How is my business doing?',
    'Any recommendations?',
    'How much stock is left?',
    'Where are my orders?',
    'Should I reorder anything?',
    'What did I purchase recently?',
    'Show me my customers',
];

export default function AssistantPage() {
    const [initialMessages, setInitialMessages] = useState<any[]>([WELCOME_MESSAGE]);
    const [loaded, setLoaded] = useState(false);

    // Load saved chat history on mount
    useEffect(() => {
        fetch('/api/ai/chat/history')
            .then(r => r.json())
            .then((saved: any[]) => {
                if (saved.length > 0) {
                    const restored = saved.map((m: any) => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                    }));
                    setInitialMessages([WELCOME_MESSAGE, ...restored]);
                }
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    if (!loaded) {
        return (
            <div className="animate-in">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">🤖 AI Assistant</h1>
                        <p className="page-subtitle">Loading chat history...</p>
                    </div>
                </div>
                <div className="chat-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    return <ChatUI initialMessages={initialMessages} />;
}

function ChatUI({ initialMessages }: { initialMessages: any[] }) {
    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        append,
        setMessages,
    } = useChat({
        api: '/api/ai/chat',
        initialMessages,
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [clearing, setClearing] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [speechError, setSpeechError] = useState<string | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSuggestionClick = (s: string) => {
        append({ role: 'user', content: s });
    };

    const handleClearChat = useCallback(async () => {
        if (!confirmClear) {
            setConfirmClear(true);
            // Auto-reset after 3 seconds if not confirmed
            setTimeout(() => setConfirmClear(false), 3000);
            return;
        }
        setClearing(true);
        setConfirmClear(false);
        try {
            await fetch('/api/ai/chat/history', { method: 'DELETE' });
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: WELCOME_MESSAGE.content,
            }]);
        } catch (e) {
            console.error('Failed to clear chat:', e);
        } finally {
            setClearing(false);
        }
    }, [setMessages, confirmClear]);

    const startRecording = useCallback(async () => {
        if (isRecording || isTranscribing) return;
        setSpeechError(null);
        if (typeof window === 'undefined') return;

        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setSpeechError('Voice input is not supported in this browser.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            let recorder: MediaRecorder;
            if (MediaRecorder.isTypeSupported?.('audio/webm')) {
                recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            } else {
                recorder = new MediaRecorder(stream);
            }

            chunksRef.current = [];
            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onerror = () => {
                setSpeechError('Recording failed. Please try again.');
            };

            recorder.onstop = async () => {
                setIsRecording(false);
                stream.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;

                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                if (blob.size === 0) return;

                setIsTranscribing(true);
                try {
                    const formData = new FormData();
                    formData.append('audio', blob, 'speech.webm');
                    const response = await fetch('/api/ai/transcribe', {
                        method: 'POST',
                        body: formData,
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || 'Transcription failed');
                    }
                    const data = await response.json();
                    const transcript = (data?.text || '').trim();
                    if (transcript) {
                        append({ role: 'user', content: transcript });
                    }
                } catch (error) {
                    console.error(error);
                    setSpeechError('Transcription failed. Please try again.');
                } finally {
                    setIsTranscribing(false);
                }
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error(error);
            setSpeechError('Microphone permission denied or unavailable.');
        }
    }, [append, isRecording, isTranscribing]);

    const stopRecording = useCallback(() => {
        if (!isRecording) return;
        mediaRecorderRef.current?.stop();
    }, [isRecording]);

    const toggleVoiceInput = useCallback(() => {
        if (isRecording) {
            stopRecording();
            return;
        }
        startRecording();
    }, [isRecording, startRecording, stopRecording]);

    const hasHistory = messages.length > 1; // more than just the welcome message

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><span style={{ WebkitTextFillColor: 'initial' }}>🤖</span> AI Assistant</h1>
                    <p className="page-subtitle">Ask questions about your business in natural language</p>
                </div>
                {hasHistory && (
                    <button
                        className="btn btn-danger"
                        onClick={handleClearChat}
                        disabled={clearing || isLoading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            ...(confirmClear ? { background: 'rgba(239, 68, 68, 0.3)', borderColor: '#ef4444' } : {}),
                        }}
                    >
                        {clearing ? (
                            <>
                                <div className="spinner" style={{ width: 14, height: 14 }} />
                                Clearing...
                            </>
                        ) : confirmClear ? (
                            '⚠️ Confirm Clear?'
                        ) : (
                            '🗑️ Clear Chat'
                        )}
                    </button>
                )}
            </div>

            <div className="chat-container">
                {/* Suggestions */}
                <div className="chat-suggestions">
                    {SUGGESTIONS.map((s, i) => (
                        <button key={i} className="chat-suggestion" onClick={() => handleSuggestionClick(s)} disabled={isLoading}>
                            {s}
                        </button>
                    ))}
                </div>

                {/* Messages */}
                <div className="chat-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`chat-message ${msg.role}`}>
                            <div className="chat-bubble">
                                {msg.content.split('\n').map((line: string, j: number) => (
                                    <span key={j}>
                                        {line.replace(/\*\*(.*?)\*\*/g, '⟨$1⟩').split('⟨').map((sub: string, k: number) => {
                                            if (sub.includes('⟩')) {
                                                const [bold, rest] = sub.split('⟩');
                                                return <span key={k}><strong>{bold}</strong>{rest}</span>;
                                            }
                                            return sub;
                                        })}
                                        {j < msg.content.split('\n').length - 1 && <br />}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                        <div className="chat-message assistant">
                            <div className="chat-bubble" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="spinner" /> Thinking...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="chat-input-area">
                    <input
                        className="chat-input"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask me anything about your business..."
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={toggleVoiceInput}
                        disabled={isLoading || isTranscribing}
                        title={isRecording ? 'Stop recording' : 'Speak your message'}
                    >
                        {isRecording ? 'Stop' : isTranscribing ? 'Transcribing...' : '🎙️ Speak'}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
                        Send
                    </button>
                </form>
                {speechError && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>
                        {speechError}
                    </div>
                )}
            </div>
        </div>
    );
}
