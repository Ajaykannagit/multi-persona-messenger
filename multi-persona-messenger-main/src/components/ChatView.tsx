import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Lock, Bell, BellOff } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  detected_tone: string | null;
}

interface ChatViewProps {
  contact: {
    id: string;
    contact_user_id: string;
    nickname: string | null;
    display_name: string;
  };
  persona: {
    id: string;
    name: string;
    color_primary: string;
    color_accent: string;
  };
}

export function ChatView({ contact, persona }: ChatViewProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [channelId, setChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChannel();
  }, [contact.id, persona.id]);

  useEffect(() => {
    if (channelId) {
      loadMessages();
      subscribeToMessages();
    }
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChannel = async () => {
    setLoading(true);
    try {
      const { data: channel, error: channelError } = await supabase
        .from('persona_channels')
        .select('*')
        .eq('contact_id', contact.id)
        .eq('persona_id', persona.id)
        .maybeSingle();

      if (channelError) throw channelError;

      let currentChannel = channel;
      if (!currentChannel) {
        const { data: newChannel, error: newChannelError } = await supabase
          .from('persona_channels')
          .insert({
            contact_id: contact.id,
            persona_id: persona.id,
          })
          .select()
          .single();
        
        if (newChannelError) throw newChannelError;
        currentChannel = newChannel;
      }

      if (currentChannel) {
        setChannelId(currentChannel.id);
        setIsLocked(currentChannel.is_locked);
        setNotificationsEnabled(currentChannel.notification_enabled);
      }
    } catch (error) {
      console.error('Error loading channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId!)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Error subscribing to messages:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !channelId) return;

    try {
      const message = {
        channel_id: channelId,
        sender_id: user!.id,
        content: newMessage.trim(),
      };

      const { error: insertError } = await supabase.from('messages').insert(message);
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('persona_channels')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', channelId);
      
      if (updateError) throw updateError;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const toggleLock = async () => {
    const newLockState = !isLocked;
    try {
      const { error } = await supabase
        .from('persona_channels')
        .update({ is_locked: newLockState })
        .eq('id', channelId!);
      
      if (error) throw error;
      setIsLocked(newLockState);
    } catch (error) {
      console.error('Error toggling lock:', error);
    }
  };

  const toggleNotifications = async () => {
    const newNotificationState = !notificationsEnabled;
    try {
      const { error } = await supabase
        .from('persona_channels')
        .update({ notification_enabled: newNotificationState })
        .eq('id', channelId!);

      if (error) throw error;
      setNotificationsEnabled(newNotificationState);
    } catch (error) {
      console.error('Error toggling notifications:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-600">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div
        className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"
        style={{ backgroundColor: `${persona.color_primary}10` }}
      >
        <div>
          <h3 className="font-semibold text-gray-900">
            {contact.nickname || contact.display_name}
          </h3>
          <p className="text-sm text-gray-600">
            Chatting in {persona.name} mode
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleNotifications}
            className={`p-2 rounded-lg transition-colors ${
              notificationsEnabled
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            title={notificationsEnabled ? 'Notifications on' : 'Notifications off'}
          >
            {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleLock}
            className={`p-2 rounded-lg transition-colors ${
              isLocked
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isLocked ? 'Channel locked' : 'Channel unlocked'}
          >
            <Lock className={`w-5 h-5 ${isLocked ? '' : 'opacity-40'}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSender = message.sender_id === user!.id;
            return (
              <div
                key={message.id}
                className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md px-4 py-3 rounded-2xl ${
                    isSender
                      ? 'rounded-br-sm text-white'
                      : 'bg-white rounded-bl-sm text-gray-900 shadow-sm'
                  }`}
                  style={
                    isSender
                      ? {
                          background: `linear-gradient(135deg, ${persona.color_primary}, ${persona.color_accent})`,
                        }
                      : {}
                  }
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div
                    className={`text-xs mt-1 ${
                      isSender ? 'text-white/70' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message in ${persona.name} mode...`}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ focusRing: persona.color_primary }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${persona.color_primary}, ${persona.color_accent})`,
            }}
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
