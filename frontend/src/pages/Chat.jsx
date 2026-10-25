import React from "react";
import { Bot, Boxes, ShieldCheck, Sparkles, Tag, TrendingUp } from "lucide-react";
import ChatWindow from "../components/ChatWindow";

const capabilities = [
    { icon: TrendingUp, title: "Sales performance", text: "Spot best sellers, slow movers and trends." },
    { icon: Boxes, title: "Inventory planning", text: "Find stock risks and plan reorders." },
    { icon: Tag, title: "Pricing & margins", text: "Review gross margins before making changes." }
];

const rise = (step) => `bp-animate-in bp-animate-delay-${step}`;

export default function Chat() {
    return (
        <div className="page-stack chat-page">
            <div className={`page-intro-row ${rise(1)}`}>
                <div>
                    <span className="eyebrow">Your business copilot</span>
                    <h2>Ask BizPilot AI</h2>
                    <p>Get clearer answers from your business data, without digging through spreadsheets.</p>
                </div>
                <span className="ai-status" role="status"><span className="live-dot" /> Assistant ready</span>
            </div>

            <div className="chat-layout">
                <section className={`panel chat-main-panel ${rise(2)}`} aria-label="Chat with BizPilot Assistant">
                    <div className="chat-panel-header">
                        <span className="chat-large-avatar"><Bot size={23} /></span>
                        <div>
                            <h3>BizPilot Assistant</h3>
                            <p><span className="live-dot" /> Ready to help · Demo mode</p>
                        </div>
                        <span className="ai-spark"><Sparkles size={17} /></span>
                    </div>
                    <ChatWindow />
                </section>

                <aside className="chat-side" aria-label="What the assistant can do">
                    <section className={`panel ${rise(3)}`}>
                        <span className="eyebrow">Things I can help with</span>
                        <h3>Make your next move clearer.</h3>
                        {capabilities.map(({ icon: Icon, title, text }) => (
                            <div className="capability-item" key={title}>
                                <span className="capability-icon"><Icon size={17} /></span>
                                <div><strong>{title}</strong><p>{text}</p></div>
                            </div>
                        ))}
                    </section>

                    <section className={`privacy-note ${rise(4)}`}>
                        <ShieldCheck size={18} />
                        <div>
                            <strong>Built for thoughtful decisions</strong>
                            <p>AI suggestions are guidance, not a replacement for checking your records. This preview uses sample data.</p>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}