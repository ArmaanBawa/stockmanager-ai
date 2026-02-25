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
    const [clearing, setClearing] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

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
                    <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
