import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../../api/config';

const SandiBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: 'Hello! I am SANDIBOT, your AI assistant for Sandigan Carwash and Rentals. How can I help you today?' }
    ]);
    const [inputMsg, setInputMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const quickQuestions = [
        "What time do you open?",
        "Can you check my booking?",
        "What are your rates?",
        "Where are you located?"
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Auto-close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (chatContainerRef.current && !chatContainerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e, customMsg = null) => {
        e?.preventDefault();
        const textToSend = customMsg || inputMsg.trim();
        if (!textToSend) return;

        const newMessages = [...messages, { role: 'user', text: textToSend }];
        setMessages(newMessages);
        setInputMsg('');
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_BASE}/chat`, { messages: newMessages });
            if (response.data && response.data.reply) {
                setMessages(prev => [...prev, { role: 'bot', text: response.data.reply }]);
            }
        } catch (error) {
            console.error("Chatbot error:", error);
            setMessages(prev => [...prev, { role: 'bot', text: "I am having too many requests right now. Please come back again after 15 mins." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
            {/* Chat Bubble Toggle */}
            {!isOpen && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(true);
                    }}
                    className="btn shadow-lg bubble-float"
                    style={{
                        backgroundColor: '#1e293b',
                        color: 'white',
                        borderRadius: '50%',
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>
                    </svg>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    ref={chatContainerRef}
                    className="card shadow-lg border-0 animate__animated animate__fadeInUp"
                    style={{
                        width: '380px',
                        height: '550px',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        animationDuration: '0.4s'
                    }}
                >
                    {/* Header */}
                    <div className="text-white p-4 d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="d-flex align-items-center gap-3">
                            <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#23A0CE' }}>
                                <span style={{ fontSize: '1.6rem' }}>🤖</span>
                            </div>
                            <div>
                                <div className="fw-bold fs-5 mb-0" style={{ lineHeight: '1', letterSpacing: '0.5px' }}>SANDIBOT</div>
                                <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
                                    <span>Online • AI Assistant</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="btn p-0 border-0 text-white opacity-75 hover-opacity-100"
                            style={{ transition: '0.2s' }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="p-4 flex-grow-1 custom-scrollbar-main" style={{ overflowY: 'auto', backgroundColor: '#0f172a' }}>
                        {messages.map((msg, index) => (
                            <div key={index} className={`d-flex mb-4 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                                <div
                                    className={`p-3 rounded-4 ${msg.role === 'user' ? 'shadow-sm' : 'border border-white border-opacity-10'}`}
                                    style={{
                                        maxWidth: '85%',
                                        backgroundColor: msg.role === 'user' ? '#23A0CE' : '#1e293b',
                                        color: '#ffffff',
                                        fontSize: '0.92rem',
                                        lineHeight: '1.6',
                                        whiteSpace: 'pre-wrap',
                                        borderBottomRightRadius: msg.role === 'user' ? '4px' : '20px',
                                        borderBottomLeftRadius: msg.role === 'bot' ? '4px' : '20px',
                                        boxShadow: msg.role === 'user' ? '0 4px 15px rgba(59, 130, 246, 0.3)' : 'none'
                                    }}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="d-flex mb-4 justify-content-start">
                                <div className="p-3 rounded-4 border border-white border-opacity-10" style={{ backgroundColor: '#1e293b', borderBottomLeftRadius: '4px' }}>
                                    <div className="d-flex gap-2">
                                        <div className="dot-typing-dark"></div>
                                        <div className="dot-typing-dark" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="dot-typing-dark" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Form & Quick chips */}
                    <div className="p-4" style={{ backgroundColor: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {/* Quick Chips */}
                        <div className="d-flex gap-2 mb-4 overflow-auto pb-2 custom-scrollbar-horizontal" style={{ flexWrap: 'nowrap' }}>
                            {quickQuestions.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(null, q)}
                                    className="btn btn-sm rounded-pill text-nowrap px-3 feature-chip"
                                    style={{
                                        fontSize: '0.8rem',
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#94a3b8',
                                        transition: '0.2s'
                                    }}
                                    disabled={isLoading}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSend} className="d-flex gap-2">
                            <input
                                type="text"
                                className="form-control rounded-pill border-0 px-4 chat-input"
                                placeholder="Write your message..."
                                value={inputMsg}
                                onChange={(e) => setInputMsg(e.target.value)}
                                disabled={isLoading}
                                style={{
                                    fontSize: '0.95rem',
                                    height: '50px',
                                    backgroundColor: '#1e293b',
                                    color: 'white'
                                }}
                            />
                            <button
                                type="submit"
                                className="btn rounded-circle d-flex align-items-center justify-content-center text-white send-btn shadow-lg"
                                disabled={isLoading || !inputMsg.trim()}
                                style={{ width: '50px', height: '50px', backgroundColor: '#23A0CE', flexShrink: 0, border: 'none', transition: '0.3s' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <style>{`
                .dot-typing-dark {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background-color: #23A0CE;
                    animation: dot-pulse-dark 1.5s infinite linear;
                }
                @keyframes dot-pulse-dark {
                    0% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.4); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.4; }
                }
                .custom-scrollbar-main::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar-main::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar-horizontal::-webkit-scrollbar {
                    height: 4px;
                }
                .custom-scrollbar-horizontal::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                }
                .bubble-float:hover {
                    box-shadow: 0 10px 25px rgba(35, 160, 206, 0.4);
                    transform: translateY(-2px);
                }
                .feature-chip:hover {
                    background-color: rgba(255,255,255,0.1) !important;
                    color: white !important;
                    border-color: rgba(255,255,255,0.2) !important;
                }
                .send-btn:hover:not(:disabled) {
                    transform: scale(1.05);
                    background-color: #1a89b3 !important;
                }
                .chat-input:focus {
                    background-color: #1e293b !important;
                    box-shadow: 0 0 0 2px rgba(35, 160, 206, 0.3) !important;
                    outline: none !important;
                }
                .chat-input::placeholder {
                    color: #64748b;
                }
            `}</style>
        </div>
    );
};

export default SandiBot;
