import { useState, useEffect, useRef, useMemo } from 'react';
import { 
    MessageSquare, Send, X, Users, AlertCircle, Sparkles, 
    Tag, Bell, Check, Shield, Flame, CheckCircle2, ChevronDown, Minimize2
} from 'lucide-react';

const STORAGE_KEY = 'solarflow_team_chat_messages';

// Realistic starter messages spread across recent weeks and months
const INITIAL_MESSAGES = [
    {
        id: 'msg-1',
        senderName: 'Ravi (Admin)',
        senderRole: 'Admin',
        userType: 'admin',
        text: 'Welcome everyone to the SolarFlow Operations channel. All dispatches, site updates, and discom submissions can be announced here for full team visibility.',
        tag: 'General',
        timestamp: '2026-08-20T09:30:00Z',
        timeFormatted: '20 Aug, 09:30 AM'
    },
    {
        id: 'msg-2',
        senderName: 'Surya Shakti Solar',
        senderRole: 'Channel Partner Office',
        userType: 'channel_partner_office',
        text: 'Submitted 12 new residential proposals for Ahmedabad East cluster. 8 have opted for loan financing via Jansamarth.',
        tag: 'General',
        timestamp: '2026-08-28T14:15:00Z',
        timeFormatted: '28 Aug, 02:15 PM'
    },
    {
        id: 'msg-3',
        senderName: 'Nikhil (Operations)',
        senderRole: 'Admin',
        userType: 'admin',
        text: 'Warehouse stock of 580W Adani bifacial modules replenished in godown. Ready for delivery batching.',
        tag: 'Dispatch',
        timestamp: '2026-09-04T11:00:00Z',
        timeFormatted: '04 Sep, 11:00 AM'
    },
    {
        id: 'msg-4',
        senderName: 'Vendor 1',
        senderRole: 'Vendor',
        userType: 'vendor',
        text: 'Completed rooftop mounting structure and inverter wiring for consumer Ramesh Patel (Ahmedabad Plot 14). Geo-tag photos submitted.',
        tag: 'Installation',
        timestamp: '2026-09-11T16:45:00Z',
        timeFormatted: '11 Sep, 04:45 PM'
    },
    {
        id: 'msg-5',
        senderName: 'Stamp Guy',
        senderRole: 'Stamp Maker',
        userType: 'stamp',
        text: 'Executed and uploaded stamped discom agreements for batch 22. All returned to admin queue.',
        tag: 'Discom',
        timestamp: '2026-09-15T10:20:00Z',
        timeFormatted: '15 Sep, 10:20 AM'
    },
    {
        id: 'msg-6',
        senderName: 'Driver 1',
        senderRole: 'Staff',
        userType: 'admin',
        text: 'Truck VEHICLE-001 has departed godown for Surat deliveries. Estimated arrival 02:00 PM.',
        tag: 'Dispatch',
        timestamp: '2026-09-17T08:30:00Z',
        timeFormatted: 'Today, 08:30 AM'
    }
];

const TAG_OPTIONS = [
    { label: 'General', color: 'bg-stone-100 text-stone-700 border-stone-200' },
    { label: 'Dispatch', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Installation', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    { label: 'Discom', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Urgent', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const ROLE_BADGES = {
    admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    channel_partner_office: { label: 'CPO', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    office2: { label: 'CPO', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    agent: { label: 'Dealer', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    agent2: { label: 'Dealer', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    vendor: { label: 'Vendor', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    stamp: { label: 'Stamp Maker', color: 'bg-rose-100 text-rose-800 border-rose-200' },
    sales: { label: 'Staff', color: 'bg-stone-100 text-stone-800 border-stone-200' }
};

export default function TeamChatDrawer({ currentUser }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(() => {
        if (typeof window === 'undefined') return INITIAL_MESSAGES;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : INITIAL_MESSAGES;
        } catch {
            return INITIAL_MESSAGES;
        }
    });

    const [filterTag, setFilterTag] = useState('All');
    const [inputMessage, setInputMessage] = useState('');
    const [selectedTag, setSelectedTag] = useState('General');
    const [unreadCount, setUnreadCount] = useState(0);

    const messagesEndRef = useRef(null);

    // Save and broadcast across tabs
    const broadcastChannelRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.BroadcastChannel) {
            broadcastChannelRef.current = new BroadcastChannel('solarflow_team_chat');
            broadcastChannelRef.current.onmessage = (event) => {
                if (event.data?.type === 'NEW_MESSAGE') {
                    setMessages(prev => {
                        if (prev.some(m => m.id === event.data.message.id)) return prev;
                        return [...prev, event.data.message];
                    });
                    if (!isOpen) {
                        setUnreadCount(c => c + 1);
                    }
                }
            };
        }

        return () => {
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.close();
            }
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isOpen, messages]);

    const handleSendMessage = (e) => {
        e?.preventDefault();
        const text = inputMessage.trim();
        if (!text) return;

        const roleKey = currentUser?.userType || 'admin';
        const roleConfig = ROLE_BADGES[roleKey] || { label: 'Team Member', color: 'bg-stone-100 text-stone-800' };

        const now = new Date();
        const timeFormatted = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        const newMsg = {
            id: `msg-${Date.now()}`,
            senderName: currentUser?.name || 'Staff Member',
            senderRole: roleConfig.label,
            userType: roleKey,
            text,
            tag: selectedTag,
            timestamp: now.toISOString(),
            timeFormatted
        };

        const updated = [...messages, newMsg];
        setMessages(updated);
        setInputMessage('');

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({ type: 'NEW_MESSAGE', message: newMsg });
            }
        } catch (err) {
            console.error('Failed to store team chat message:', err);
        }
    };

    const filteredMessages = useMemo(() => {
        if (filterTag === 'All') return messages;
        return messages.filter(m => m.tag === filterTag);
    }, [messages, filterTag]);

    return (
        <>
            {/* Floating Chat Trigger Button (Visible on all portals) */}
            <div className="fixed bottom-20 right-4 sm:bottom-5 sm:right-5 z-40">
                <button
                    onClick={() => setIsOpen(prev => !prev)}
                    className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-stone-900/95 hover:bg-stone-800 text-white rounded-full shadow-2xl border border-stone-700 transition-all transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs"
                    title="Open Team Operations Chat (For All)"
                >
                    <div className="relative">
                        <MessageSquare className="w-4 h-4 text-amber-400" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <span className="text-xs font-bold tracking-wide">Team Chat</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </button>
            </div>

            {/* Slide-over Drawer */}
            {isOpen && (
                <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-stone-200 flex flex-col animate-in slide-in-from-right duration-250">
                    
                    {/* Header */}
                    <div className="p-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                                <Users className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold">SolarFlow Team Channel</h3>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        For All Roles
                                    </span>
                                </div>
                                <p className="text-[10px] text-stone-400">
                                    Shared bulletin: Admin, Partners, Vendors & Stamp Maker
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                                title="Close Chat"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Notice Banner: No Personal Messages */}
                    <div className="px-4 py-2 bg-amber-50/90 border-b border-amber-200 text-[11px] text-amber-900 flex items-center gap-2 shrink-0">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span><strong>Public Channel:</strong> All posts are visible to every team role. No private DMs.</span>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-stone-50 border-b border-stone-200 overflow-x-auto shrink-0">
                        {['All', 'General', 'Dispatch', 'Installation', 'Discom', 'Urgent'].map(tag => (
                            <button
                                key={tag}
                                onClick={() => setFilterTag(tag)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                                    filterTag === tag 
                                        ? 'bg-stone-800 text-white shadow-2xs' 
                                        : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    {/* Message List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-50/50">
                        {filteredMessages.length === 0 ? (
                            <div className="py-12 text-center text-stone-400 text-xs">
                                No messages in this category.
                            </div>
                        ) : (
                            filteredMessages.map(msg => {
                                const roleStyle = ROLE_BADGES[msg.userType] || { label: msg.senderRole, color: 'bg-stone-100 text-stone-800 border-stone-200' };
                                const isMe = currentUser?.name && msg.senderName.includes(currentUser.name);

                                return (
                                    <div 
                                        key={msg.id} 
                                        className={`p-3 rounded-2xl border shadow-2xs transition-all ${
                                            isMe ? 'bg-amber-50/50 border-amber-200/80 ml-3' : 'bg-white border-stone-200 mr-3'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 pb-1 border-b border-stone-100/80">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-stone-900 truncate max-w-[150px]">
                                                    {msg.senderName}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${roleStyle.color}`}>
                                                    {roleStyle.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[9px] font-semibold text-stone-400">
                                                    {msg.timeFormatted}
                                                </span>
                                                {msg.tag && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                                                        #{msg.tag}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-xs text-stone-800 mt-2 leading-relaxed whitespace-pre-wrap">
                                            {msg.text}
                                        </p>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Presets */}
                    <div className="px-3 pt-2 pb-1 bg-white border-t border-stone-100 flex gap-1.5 overflow-x-auto shrink-0">
                        {[
                            '🚛 Dispatch En Route',
                            '✅ Site Work Finished',
                            '📄 Stamped Agreement Ready',
                            '⚠️ Site Inspection Delay'
                        ].map(preset => (
                            <button
                                key={preset}
                                onClick={() => setInputMessage(preset)}
                                className="text-[10px] bg-stone-100 hover:bg-amber-100 text-stone-700 px-2 py-0.5 rounded-md border border-stone-200 whitespace-nowrap cursor-pointer transition-colors"
                            >
                                {preset}
                            </button>
                        ))}
                    </div>

                    {/* Message Composer Form */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-stone-200 space-y-2 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-stone-400">Post As:</span>
                            <span className="text-xs font-bold text-stone-800">
                                {currentUser?.name || 'Staff'} ({currentUser?.userType || 'Admin'})
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                                <span className="text-[10px] text-stone-400 font-bold">Tag:</span>
                                <select
                                    value={selectedTag}
                                    onChange={e => setSelectedTag(e.target.value)}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded border border-stone-200 bg-stone-50 cursor-pointer"
                                >
                                    <option value="General">#General</option>
                                    <option value="Dispatch">#Dispatch</option>
                                    <option value="Installation">#Installation</option>
                                    <option value="Discom">#Discom</option>
                                    <option value="Urgent">#Urgent</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={e => setInputMessage(e.target.value)}
                                placeholder="Post an update for all team members..."
                                className="flex-1 px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
                            />
                            <button
                                type="submit"
                                disabled={!inputMessage.trim()}
                                className="p-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                                title="Send Message"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>

                </div>
            )}
        </>
    );
}
