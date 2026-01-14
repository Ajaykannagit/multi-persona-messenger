import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Lock, Bell, BellOff, Search, Paperclip, Image as ImageIcon, X } from 'lucide-react';
import { TypingIndicator } from './TypingIndicator';
import { MessageStatus } from './MessageStatus';
import { MessageAttachment } from './MessageAttachment';
import { MessageSearch } from './MessageSearch';
import { EmojiPickerComponent } from './EmojiPickerComponent';
import { GifPicker } from './GifPicker';
import { FileUpload } from './FileUpload';
import { subscribeToTyping, handleTypingInput, cleanupTyping } from '../lib/typingService';
import { sendMessageNotification, shouldSendNotification } from '../lib/notificationService';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  detected_tone: string | null;
  status: 'sent' | 'delivered' | 'read';
  delivered_at: string | null;
  read_at: string | null;
  file_url: string | null;
  file_type: string | null;
  file_name: string | null;
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
  const [isTyping, setIsTyping] = useState(false);
  const [contactTyping, setContactTyping] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadChannel();
    return () => {
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
      if (channelId) {
        cleanupTyping(channelId, user!.id);
      }
    };
  }, [contact.id, persona.id]);

  useEffect(() => {
    if (channelId) {
      loadMessages();
      subscribeToMessages();
      subscribeToTypingIndicators();
      markMessagesAsRead();
      resetUnreadCount();
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
    let { data: channel } = await supabase
      .from('persona_channels')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('persona_id', persona.id)
      .maybeSingle();

    if (!channel) {
      const { data: newChannel } = await supabase
        .from('persona_channels')
        .insert({
          contact_id: contact.id,
          persona_id: persona.id,
        })
        .select()
        .single();

      channel = newChannel;
    }

    if (channel) {
      setChannelId(channel.id);
      setIsLocked(channel.is_locked);
      setNotificationsEnabled(channel.notification_enabled);
    }
    setLoading(false);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId!)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
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
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);

          // Mark as delivered if we're the recipient
          if (newMsg.sender_id !== user!.id) {
            markMessageAsDelivered(newMsg.id);

            // Send browser notification if enabled
            if (shouldSendNotification() && notificationsEnabled) {
              sendMessageNotification(
                contact.nickname || contact.display_name,
                newMsg.content,
                persona.name,
                {
                  channelId: channelId!,
                  contactId: contact.id,
                  personaId: persona.id,
                  messageId: newMsg.id,
                }
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToTypingIndicators = () => {
    if (!channelId) return;

    typingChannelRef.current = subscribeToTyping(
      channelId,
      user!.id,
      (isTyping, userId) => {
        if (userId === contact.contact_user_id) {
          setContactTyping(isTyping);
        }
      }
    );
  };

  const markMessageAsDelivered = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', messageId);
  };

  const markMessagesAsRead = async () => {
    if (!channelId) return;

    await supabase.rpc('mark_messages_as_read', {
      p_channel_id: channelId,
      p_user_id: user!.id,
    });
  };

  const resetUnreadCount = async () => {
    if (!channelId) return;

    await supabase.rpc('reset_unread_count', {
      p_channel_id: channelId,
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !channelId) return;

    const message = {
      channel_id: channelId,
      sender_id: user!.id,
      content: newMessage.trim(),
      status: 'sent' as const,
    };

    await supabase.from('messages').insert(message);

    await supabase
      .from('persona_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId);

    setNewMessage('');

    // Stop typing indicator
    if (channelId) {
      cleanupTyping(channelId, user!.id);
    }
  };

  const handleSendFile = async (fileData: { url: string; type: string; name: string }) => {
    if (!channelId) return;

    const message = {
      channel_id: channelId,
      sender_id: user!.id,
      content: `Sent a file: ${fileData.name}`,
      file_url: fileData.url,
      file_type: fileData.type,
      file_name: fileData.name,
      status: 'sent' as const,
    };

    await supabase.from('messages').insert(message);

    await supabase
      .from('persona_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId);

    setShowFileUpload(false);
  };

  const handleSendGif = async (gifUrl: string) => {
    if (!channelId) return;

    const message = {
      channel_id: channelId,
      sender_id: user!.id,
      content: 'Sent a GIF',
      file_url: gifUrl,
      file_type: 'image/gif',
      file_name: 'giphy.gif',
      status: 'sent' as const,
    };

    await supabase.from('messages').insert(message);

    await supabase
      .from('persona_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId);
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    if (!channelId) return;

    // Send typing indicator
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      handleTypingInput(channelId, user!.id, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (channelId) {
        handleTypingInput(channelId, user!.id, false);
      }
    }, 2000);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
  };

  const toggleLock = async () => {
    const newLockState = !isLocked;
    await supabase
      .from('persona_channels')
      .update({ is_locked: newLockState })
      .eq('id', channelId!);
    setIsLocked(newLockState);
  };

  const toggleNotifications = async () => {
    const newNotificationState = !notificationsEnabled;
    await supabase
      .from('persona_channels')
      .update({ notification_enabled: newNotificationState })
      .eq('id', channelId!);
    setNotificationsEnabled(newNotificationState);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredMessages = searchQuery
    ? messages.filter((msg) =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : messages;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-600">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {showSearch ? (
        <MessageSearch
          onSearch={handleSearch}
          onClose={() => {
            setShowSearch(false);
            setSearchQuery('');
          }}
        />
      ) : (
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
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
              title="Search messages"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={toggleNotifications}
              className={`p-2 rounded-lg transition-colors ${notificationsEnabled
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              title={notificationsEnabled ? 'Notifications on' : 'Notifications off'}
            >
              {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleLock}
              className={`p-2 rounded-lg transition-colors ${isLocked
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              title={isLocked ? 'Channel locked' : 'Channel unlocked'}
            >
              <Lock className={`w-5 h-5 ${isLocked ? '' : 'opacity-40'}`} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>{searchQuery ? 'No messages found' : 'No messages yet. Start the conversation!'}</p>
          </div>
        ) : (
          filteredMessages.map((message) => {
            const isSender = message.sender_id === user!.id;
            const hasAttachment = message.file_url && message.file_type && message.file_name;

            return (
              <div
                key={message.id}
                className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-md">
                  {hasAttachment && (
                    <div className="mb-2">
                      <MessageAttachment
                        fileUrl={message.file_url!}
                        fileType={message.file_type!}
                        fileName={message.file_name!}
                      />
                    </div>
                  )}

                  {message.content && !message.content.startsWith('Sent a ') && (
                    <div
                      className={`px-4 py-3 rounded-2xl ${isSender
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
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}

                  <div
                    className={`flex items-center gap-2 mt-1 px-2 ${isSender ? 'justify-end' : 'justify-start'
                      }`}
                  >
                    <div className={`text-xs ${isSender ? 'text-gray-500' : 'text-gray-500'}`}>
                      {isSender && (
                        <MessageStatus
                          status={message.status}
                          timestamp={message.created_at}
                        />
                      )}
                      {!isSender && (
                        <span>
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {contactTyping && (
          <div className="flex justify-start">
            <TypingIndicator userName={contact.nickname || contact.display_name} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showFileUpload && (
        <div className="p-4 bg-white border-t border-gray-200">
          <FileUpload
            channelId={channelId!}
            userId={user!.id}
            onFileUploaded={handleSendFile}
            onCancel={() => setShowFileUpload(false)}
          />
        </div>
      )}

      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2 items-end">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>

            <button
              type="button"
              onClick={() => setShowGifPicker(!showGifPicker)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              title="Send GIF"
            >
              <ImageIcon className="w-5 h-5 text-gray-600" />
              {showGifPicker && (
                <GifPicker
                  onGifSelect={handleSendGif}
                  onClose={() => setShowGifPicker(false)}
                />
              )}
            </button>

            <EmojiPickerComponent onEmojiSelect={handleEmojiSelect} />
          </div>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
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
