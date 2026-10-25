
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ArrowUp,
    Bot,
    Check,
    Copy,
    Mic,
    MicOff,
    Sparkles,
    Volume2,
} from "lucide-react";

const suggestions = [
    "Which products should I reorder?",
    "What were my best-selling products?",
    "How can I improve my profit?",
];

const THINK_MS = 900;
const WORD_MS = 28;

function makeReply(question) {
    const q = question.toLowerCase();

    if (q.includes("reorder") || q.includes("stock") || q.includes("out")) {
        return "Based on the demo inventory, start with **Bottled Water 1L** (7 units left against a reorder level of 24), followed by **White Bread 400g** and **Long-life Milk 500ml**. Confirm supplier lead times before deciding quantities. These are sample records, so connect your actual inventory before acting on this advice.";
    }

    if (q.includes("profit") || q.includes("margin") || q.includes("price")) {
        return "Your sample product list suggests margins vary by item. For example, Sunflower Cooking Oil has a KSh 55 gross margin per unit (about 21% of its selling price). Compare this with your operating costs and sales volume before changing prices. I would not recommend a price reduction without checking the full margin first.";
    }

    if (q.includes("best") || q.includes("sell") || q.includes("sales")) {
        return "In the current demo data, Premium Maize Flour 2kg has the highest recorded unit sales, followed by Sunflower Cooking Oil 1L and Long-life Milk 500ml. Treat this as illustrative data rather than a live business report. Once the API is connected, I can base the answer on your uploaded records.";
    }

    return "A useful first step is to review your sales trend, compare each product's gross margin and check stock against recent demand. I'm using BizPilot's demo data right now, so treat these as illustrative insights rather than verified business figures.";
}

function reducedMotion() {
    return (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
}

function renderRich(text) {
    const parts = text.split("**");

    return parts.map((part, index) =>
        index % 2 === 1 && index < parts.length - 1 ? (
            <strong key={index}>{part}</strong>
        ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
        )
    );
}

function plainText(text) {
    return text.replace(/\*\*/g, "");
}

function StreamedText({ text, animate, onProgress, onDone }) {
    const words = React.useMemo(() => text.split(/(\s+)/), [text]);
    const [count, setCount] = useState(() =>
        animate && !reducedMotion() ? 0 : words.length
    );

    useEffect(() => {
        if (count >= words.length) {
            if (animate) onDone?.();
            return undefined;
        }

        const timer = window.setTimeout(
            () => setCount((current) => Math.min(current + 2, words.length)),
            WORD_MS
        );

        return () => window.clearTimeout(timer);
    }, [count, words.length, animate, onDone]);

    useEffect(() => {
        onProgress?.();
    }, [count, onProgress]);

    const done = count >= words.length;

    return (
        <span className={done ? "" : "stream-caret"}>
            {renderRich(words.slice(0, count).join(""))}
        </span>
    );
}

export default function ChatWindow({ compact = false }) {
    const idRef = useRef(1);
    const listRef = useRef(null);
    const inputRef = useRef(null);
    const replyTimer = useRef(null);
    const copyTimer = useRef(null);
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef("");
    const mountedRef = useRef(true);

    const [messages, setMessages] = useState([
        {
            id: 0,
            role: "assistant",
            animate: false,
            text: "Hey! I'm BizPilot AI. Ask me about sales, stock, pricing or cash flow. I'll help you turn business data into your next move.",
        },
    ]);
    const [value, setValue] = useState("");
    const [thinking, setThinking] = useState(false);
    const [streamingId, setStreamingId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [listening, setListening] = useState(false);
    const [voiceError, setVoiceError] = useState("");
    const [voiceSupported, setVoiceSupported] = useState(false);

    const busy = thinking || streamingId !== null;

    const scrollToEnd = useCallback(() => {
        const element = listRef.current;
        if (element) element.scrollTop = element.scrollHeight;
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        setVoiceSupported(Boolean(SpeechRecognition));

        return () => {
            mountedRef.current = false;
            window.clearTimeout(replyTimer.current);
            window.clearTimeout(copyTimer.current);

            if (recognitionRef.current) {
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onend = null;

                try {
                    recognitionRef.current.stop();
                } catch {
                    // Recognition may already have stopped.
                }

                recognitionRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        scrollToEnd();
    }, [messages, thinking, streamingId, scrollToEnd]);

    const finishStreaming = useCallback(() => {
        setStreamingId(null);

        if (inputRef.current) {
            inputRef.current.focus({ preventScroll: true });
        }
    }, []);

    function send(text = value) {
        const question = text.trim();

        if (!question || busy) return;

        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // Recognition may already have stopped.
            }
            recognitionRef.current = null;
            setListening(false);
        }

        setVoiceError("");
        setMessages((current) => [
            ...current,
            { id: idRef.current++, role: "user", text: question },
        ]);
        setValue("");
        setThinking(true);

        replyTimer.current = window.setTimeout(() => {
            if (!mountedRef.current) return;

            const id = idRef.current++;

            setMessages((current) => [
                ...current,
                {
                    id,
                    role: "assistant",
                    animate: true,
                    text: makeReply(question),
                },
            ]);

            setThinking(false);
            setStreamingId(id);
        }, reducedMotion() ? 150 : THINK_MS);
    }

    function toggleMicrophone() {
        if (listening && recognitionRef.current) {
            recognitionRef.current.stop();
            setListening(false);
            return;
        }

        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setVoiceError(
                "Voice input isn't supported by this browser. Try a supported browser or type your message."
            );
            return;
        }

        if (busy) return;

        setVoiceError("");
        finalTranscriptRef.current = "";

        try {
            const recognition = new SpeechRecognition();

            recognition.lang = "en-KE";
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                setListening(true);
                setVoiceError("");
            };

            recognition.onresult = (event) => {
                let interimTranscript = "";
                let finalTranscript = finalTranscriptRef.current;

                for (let index = event.resultIndex; index < event.results.length; index++) {
                    const transcript = event.results[index][0].transcript;

                    if (event.results[index].isFinal) {
                        finalTranscript += `${transcript} `;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                finalTranscriptRef.current = finalTranscript;

                const transcript = `${finalTranscript}${interimTranscript}`.trim();
                setValue(transcript);
            };

            recognition.onerror = (event) => {
                setListening(false);

                if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                    setVoiceError(
                        "Microphone access was denied. Allow microphone access in your browser settings and try again."
                    );
                } else if (event.error === "no-speech") {
                    setVoiceError("No speech detected. Try speaking a little closer to the microphone.");
                } else if (event.error !== "aborted") {
                    setVoiceError("Voice input stopped unexpectedly. Please try again.");
                }
            };

            recognition.onend = () => {
                setListening(false);
                recognitionRef.current = null;

                if (mountedRef.current) {
                    inputRef.current?.focus({ preventScroll: true });
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch {
            recognitionRef.current = null;
            setListening(false);
            setVoiceError("Couldn't start the microphone. Please try again.");
        }
    }

    async function copyReply(message) {
        try {
            await navigator.clipboard.writeText(plainText(message.text));

            setCopiedId(message.id);
            window.clearTimeout(copyTimer.current);

            copyTimer.current = window.setTimeout(() => {
                setCopiedId(null);
            }, 1600);
        } catch {
            setVoiceError("Couldn't copy this reply. Check your browser clipboard permissions.");
        }
    }

    return (
        <div className={`chat-window ${compact ? "chat-compact" : ""}`}>
            <div
                className="chat-messages"
                ref={listRef}
                role="log"
                aria-live="polite"
                aria-label="Conversation with BizPilot AI"
            >
                {messages.map((message) => (
                    <div
                        className={`chat-message ${message.role}`}
                        key={message.id}
                    >
                        {message.role === "assistant" && (
                            <span className="chat-avatar" aria-hidden="true">
                                <Bot size={17} strokeWidth={1.8} />
                            </span>
                        )}

                        <div className="chat-message-body">
                            <div className="chat-bubble">
                                {message.role === "assistant" ? (
                                    <StreamedText
                                        text={message.text}
                                        animate={message.animate}
                                        onProgress={scrollToEnd}
                                        onDone={finishStreaming}
                                    />
                                ) : (
                                    message.text
                                )}
                            </div>

                            {message.role === "assistant" &&
                                message.animate &&
                                streamingId !== message.id && (
                                    <div className="msg-actions">
                                        <button
                                            type="button"
                                            className="msg-action"
                                            onClick={() => copyReply(message)}
                                            aria-label={
                                                copiedId === message.id ? "Reply copied" : "Copy reply"
                                            }
                                        >
                                            {copiedId === message.id ? (
                                                <>
                                                    <Check size={13} />
                                                    Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={13} />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                        </div>
                    </div>
                ))}

                {thinking && (
                    <div className="chat-message assistant">
                        <span className="chat-avatar" aria-hidden="true">
                            <Bot size={17} strokeWidth={1.8} />
                        </span>

                        <div
                            className="chat-bubble typing-bubble"
                            aria-label="BizPilot AI is thinking"
                        >
                            <span className="typing-dots" aria-hidden="true">
                                <i />
                                <i />
                                <i />
                            </span>
                            <span className="sr-only">BizPilot is thinking…</span>
                        </div>
                    </div>
                )}
            </div>

            {messages.length === 1 && !busy && (
                <div className="chat-suggestions">
                    <span className="eyebrow">
                        <Sparkles size={13} aria-hidden="true" />
                        Try asking
                    </span>

                    {suggestions.map((item) => (
                        <button
                            type="button"
                            key={item}
                            onClick={() => send(item)}
                            disabled={busy}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            )}

            <form
                className={`chat-composer ${listening ? "is-listening" : ""}`}
                onSubmit={(event) => {
                    event.preventDefault();
                    send();
                }}
            >
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={
                        listening
                            ? "Listening… speak clearly"
                            : busy
                                ? "BizPilot is replying…"
                                : "Ask anything about your business…"
                    }
                    aria-label="Message BizPilot AI"
                    aria-describedby="chat-voice-status"
                    disabled={busy}
                />

                <button
                    type="button"
                    className={`chat-mic-button ${listening ? "is-listening" : ""}`}
                    onClick={toggleMicrophone}
                    disabled={busy || !voiceSupported}
                    aria-label={
                        listening ? "Stop voice input" : "Start voice input"
                    }
                    aria-pressed={listening}
                    title={
                        !voiceSupported
                            ? "Voice input is not supported in this browser"
                            : listening
                                ? "Stop listening"
                                : "Speak your message"
                    }
                >
                    {listening ? (
                        <MicOff size={18} strokeWidth={1.8} />
                    ) : (
                        <Mic size={18} strokeWidth={1.8} />
                    )}
                </button>

                <button
                    type="submit"
                    disabled={!value.trim() || busy}
                    aria-label="Send message"
                    title="Send message"
                >
                    <ArrowUp size={18} strokeWidth={2} />
                </button>
            </form><br /><br />

            {/* <div
                className="chat-voice-status"
                id="chat-voice-status"
                role="status"
                aria-live="polite"
            >
                {listening ? (
                    <>
                        <span className="voice-status-dot" aria-hidden="true" />
                        Listening to your voice…
                    </>
                ) : voiceError ? (
                    voiceError
                ) : (
                    "Demo assistant · Responses use illustrative sample data"
                )}
            </div> */}
        </div>
    );
}
