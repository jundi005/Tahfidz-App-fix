
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../types/database.types';
import { Send, Trash2, MessageCircle, X, AlertCircle, User, Bell, Reply } from 'lucide-react';
import { format } from 'date-fns';

type ChatMessage = Tables<'chat'>;

// Helper Type for Reply Structure
interface ReplyData {
    id: number;
    name: string;
    content: string;
}

const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>('Admin'); // State for Name
    const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastSenderName, setLastSenderName] = useState<string | null>(null);
    const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'>('CONNECTING');
    
    // Reply State
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

    // Refs untuk mengakses state terbaru di dalam listener realtime
    const isOpenRef = useRef(isOpen);
    const emailRef = useRef(currentUserEmail);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Sync refs dengan state
    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        emailRef.current = currentUserEmail;
    }, [currentUserEmail]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    useEffect(() => {
        const getUserAndOrg = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const email = user?.email || null;
            setCurrentUserEmail(email);

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id, full_name')
                    .eq('id', user.id)
                    .single();
                
                if (profile) {
                    setCurrentOrgId(profile.organization_id);
                    if (profile.full_name) setCurrentUserName(profile.full_name);
                }
            }
        };
        getUserAndOrg();

        // 1. Fetch initial messages
        const fetchMessages = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('chat')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (error) {
                console.error('Error fetching messages:', error);
                if (error.message.includes('relation "public.chat" does not exist') || error.code === '42P01') {
                    setError("Tabel 'chat' belum dibuat. Jalankan schema.sql.");
                } else {
                    setError(error.message);
                }
            } else {
                setMessages(data || []);
                setError(null);
                scrollToBottom();
            }
            setLoading(false);
        };

        fetchMessages();

        // 2. Subscribe to realtime changes
        // Menggunakan channel 'public:chat' untuk memastikan unik
        const channel = supabase
            .channel('public:chat')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat' },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    
                    setMessages((current) => {
                        // Mencegah duplikat (deduplikasi) jika pesan dari diri sendiri sudah ditambahkan optimistically
                        if (current.some(msg => msg.id === newMsg.id)) {
                            return current;
                        }
                        return [...current, newMsg];
                    });

                    // Logika Notifikasi
                    // Cek apakah pesan dari orang lain
                    const isMyMessage = newMsg.sender_email === emailRef.current;
                    
                    if (!isMyMessage) {
                        if (!isOpenRef.current) {
                            // Jika widget tertutup, tampilkan notifikasi
                            setUnreadCount(prev => prev + 1);
                            // Use sender_name if available, else email
                            const name = newMsg.sender_name || newMsg.sender_email.split('@')[0];
                            setLastSenderName(name);
                        } else {
                            // Jika widget terbuka, scroll ke bawah agar terlihat
                            scrollToBottom();
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'chat' },
                (payload) => {
                    setMessages((current) => current.filter(msg => msg.id !== payload.old.id));
                }
            )
            .subscribe((status) => {
                setRealtimeStatus(status);
                if (status === 'SUBSCRIBED') {
                    console.log('Chat Realtime Connected');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Effect to auto-scroll and clear unread when opening
    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setUnreadCount(0);
            setLastSenderName(null);
        }
    }, [isOpen, messages]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserEmail || !currentOrgId) return;

        const contentToSend = newMessage.trim();
        
        // Prepare Reply Data if exists
        let replyData = null;
        if (replyingTo) {
            replyData = {
                id: replyingTo.id,
                name: replyingTo.sender_name || replyingTo.sender_email.split('@')[0],
                content: replyingTo.content.substring(0, 50) + (replyingTo.content.length > 50 ? '...' : '')
            };
        }

        setNewMessage(''); // Hapus input segera (Optimistic UI)
        setReplyingTo(null); // Clear Reply State

        try {
            const { data, error } = await supabase.from('chat').insert({
                content: contentToSend,
                sender_email: currentUserEmail,
                sender_name: currentUserName, // Send Name
                organization_id: currentOrgId,
                reply_to: replyData as any
            }).select().single();

            if (error) throw error;

            if (data) {
                // Update state lokal segera (Optimistic UI Update)
                setMessages((prev) => [...prev, data]);
                scrollToBottom();
            }
        } catch (error: any) {
             setNewMessage(contentToSend); // Kembalikan teks jika gagal
             alert(`Gagal mengirim pesan: ${error.message}`);
        }
    };

    const handleDeleteMessage = async (id: number) => {
        if(!confirm("Hapus pesan ini?")) return;

        try {
            const { error } = await supabase.from('chat').delete().eq('id', id);
            if (error) throw error;
            setMessages((prev) => prev.filter(m => m.id !== id));
        } catch (error: any) {
            alert("Gagal menghapus pesan: " + error.message);
        }
    };

    const handleDismissNotification = (e: React.MouseEvent) => {
        e.stopPropagation();
        setUnreadCount(0);
        setLastSenderName(null);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* New Message Toast Notification (PERSISTENT until clicked or closed) */}
            {!isOpen && unreadCount > 0 && lastSenderName && (
                <div 
                    className="mb-3 mr-1 bg-white p-3 rounded-lg shadow-xl border border-blue-100 flex items-center gap-3 animate-in slide-in-from-right fade-in duration-300 cursor-pointer hover:bg-slate-50 transition-colors max-w-xs relative group" 
                    onClick={() => setIsOpen(true)}
                >
                    <div className="bg-secondary/10 p-2 rounded-full text-secondary shrink-0">
                        <Bell size={18} className="animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                        <p className="text-xs font-bold text-slate-800">Pesan Baru ({unreadCount})</p>
                        <p className="text-xs text-slate-600 truncate">
                            <span className="font-semibold text-secondary">{lastSenderName}</span>: Pesan masuk...
                        </p>
                    </div>
                    {/* Explicit Close Button for Notification */}
                    <button 
                        onClick={handleDismissNotification}
                        className="absolute top-1 right-1 text-slate-300 hover:text-slate-500 p-1 rounded-full hover:bg-slate-200 transition-colors"
                        title="Tutup Notifikasi"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-200">
                    {/* Header */}
                    <div className="bg-secondary p-4 flex justify-between items-center text-white shrink-0">
                        <div className="flex items-center">
                            <MessageCircle size={20} className="mr-2" />
                            <div>
                                <h3 className="font-bold text-sm">Forum Pengurus</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className={`block w-2 h-2 rounded-full ${realtimeStatus === 'SUBSCRIBED' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
                                    <p className="text-[10px] opacity-90">
                                        {realtimeStatus === 'SUBSCRIBED' ? 'Online' : 'Connecting...'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 rounded-full p-1 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {loading ? (
                            <p className="text-center text-xs text-slate-400 mt-4">Memuat...</p>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                <AlertCircle size={32} className="text-error mb-2" />
                                <p className="text-xs text-error font-medium">{error}</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="text-center text-slate-400 py-8 text-xs">
                                Belum ada pesan. Mulai percakapan!
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.sender_email === currentUserEmail;
                                // Use sender_name if available, else fallback to email part
                                const senderName = msg.sender_name || (isMe ? 'Anda' : msg.sender_email.split('@')[0]);
                                // Cast reply_to safely
                                const replyData = msg.reply_to as unknown as ReplyData | null;
                                
                                return (
                                    <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex max-w-[85%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            {/* Identitas Pengirim (Tampilkan Nama Asli) */}
                                            <div className={`flex items-center text-[10px] font-bold mb-1 px-1 ${isMe ? 'text-slate-500' : 'text-slate-600'}`}>
                                                {!isMe && <User size={10} className="mr-1" />}
                                                {senderName}
                                            </div>

                                            <div className={`relative px-3 py-2 rounded-2xl text-xs shadow-sm group ${
                                                isMe 
                                                ? 'bg-secondary text-white rounded-tr-none' 
                                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                                            }`}>
                                                {/* Render Reply Quote if exists */}
                                                {replyData && (
                                                    <div className={`mb-1.5 p-1.5 rounded text-[10px] border-l-2 ${isMe ? 'bg-white/10 border-white/50 text-white/90' : 'bg-slate-100 border-secondary/50 text-slate-600'}`}>
                                                        <div className="font-bold mb-0.5">{replyData.name}</div>
                                                        <div className="truncate opacity-80">{replyData.content}</div>
                                                    </div>
                                                )}

                                                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                                
                                                <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                                    <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                                                    
                                                    {/* Reply Button (Visible on Hover) */}
                                                    <button 
                                                        onClick={() => setReplyingTo(msg)}
                                                        className={`opacity-0 group-hover:opacity-100 transition-opacity ml-2 ${isMe ? 'text-white hover:text-blue-200' : 'text-slate-400 hover:text-secondary'}`}
                                                        title="Balas"
                                                    >
                                                        <Reply size={12} />
                                                    </button>

                                                    {isMe && (
                                                        <button 
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-300 ml-1"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Banner */}
                    {replyingTo && (
                        <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex justify-between items-center text-xs animate-in slide-in-from-bottom duration-200">
                            <div className="border-l-2 border-secondary pl-2 max-w-[85%]">
                                <p className="font-bold text-secondary">
                                    Membalas {replyingTo.sender_name || replyingTo.sender_email.split('@')[0]}
                                </p>
                                <p className="text-slate-500 truncate">{replyingTo.content}</p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Ketik pesan..."
                                disabled={!!error}
                                className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-secondary text-slate-800 disabled:opacity-50"
                            />
                            <button 
                                type="submit" 
                                disabled={!newMessage.trim() || !!error}
                                className="bg-secondary text-white p-2 rounded-full hover:bg-accent disabled:opacity-50 disabled:hover:bg-secondary transition-colors shadow-sm"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Toggle Button (FAB) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 ${isOpen ? 'bg-slate-700 rotate-90' : 'bg-secondary'} text-white`}
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
                
                {/* Notification Badge (Hanya jika tertutup) */}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white animate-bounce">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
};

export default ChatWidget;
