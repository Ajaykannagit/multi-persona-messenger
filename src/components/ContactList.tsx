import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Search } from 'lucide-react';
import { PresenceBadge } from './PresenceBadge';
import { UnreadBadge } from './UnreadBadge';
import { getMultipleUserPresence, subscribeToPresence } from '../lib/presenceService';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Contact {
  id: string;
  contact_user_id: string;
  nickname: string | null;
  display_name: string;
  avatar_url: string | null;
}

interface ContactWithPresence extends Contact {
  presence_status?: 'online' | 'offline' | 'away';
  last_seen?: string;
  unread_count?: number;
}

interface ContactListProps {
  contacts: Contact[];
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
  onRefresh: () => void;
}

export function ContactList({ contacts, selectedContact, onSelectContact, onRefresh }: ContactListProps) {
  const { user } = useAuth();
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactsWithPresence, setContactsWithPresence] = useState<ContactWithPresence[]>([]);
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    loadPresenceData();

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [contacts]);

  const loadPresenceData = async () => {
    if (contacts.length === 0) {
      setContactsWithPresence([]);
      return;
    }

    const contactUserIds = contacts.map(c => c.contact_user_id);

    // Load presence data
    const presenceData = await getMultipleUserPresence(contactUserIds);
    const presenceMap = new Map(presenceData.map(p => [p.user_id, p]));

    // Load unread counts
    const { data: unreadData } = await supabase
      .from('contact_unread_counts')
      .select('*')
      .eq('user_id', user!.id);

    const unreadMap = new Map(unreadData?.map(u => [u.contact_id, u.total_unread]) || []);

    // Combine data
    const enrichedContacts = contacts.map(contact => {
      const presence = presenceMap.get(contact.contact_user_id);
      return {
        ...contact,
        presence_status: presence?.status,
        last_seen: presence?.last_seen,
        unread_count: unreadMap.get(contact.id) || 0,
      };
    });

    setContactsWithPresence(enrichedContacts);

    // Subscribe to presence changes
    if (presenceChannel) {
      supabase.removeChannel(presenceChannel);
    }

    const channel = subscribeToPresence(contactUserIds, (presence) => {
      setContactsWithPresence(prev =>
        prev.map(c =>
          c.contact_user_id === presence.user_id
            ? { ...c, presence_status: presence.status, last_seen: presence.last_seen }
            : c
        )
      );
    });

    setPresenceChannel(channel);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: targetUser } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', newContactEmail)
        .maybeSingle();

      if (!targetUser) {
        setError('User not found');
        return;
      }

      if (targetUser.id === user!.id) {
        setError('Cannot add yourself as a contact');
        return;
      }

      const { error: insertError } = await supabase
        .from('contacts')
        .insert({
          user_id: user!.id,
          contact_user_id: targetUser.id,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Contact already exists');
        } else {
          setError(insertError.message);
        }
        return;
      }

      setNewContactEmail('');
      setShowAddContact(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contactsWithPresence.filter(contact =>
    (contact.nickname || contact.display_name).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort contacts: online first, then by unread count, then alphabetically
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    // Online status priority
    if (a.presence_status === 'online' && b.presence_status !== 'online') return -1;
    if (a.presence_status !== 'online' && b.presence_status === 'online') return 1;

    // Unread count priority
    const aUnread = a.unread_count || 0;
    const bUnread = b.unread_count || 0;
    if (aUnread > 0 && bUnread === 0) return -1;
    if (aUnread === 0 && bUnread > 0) return 1;
    if (aUnread !== bUnread) return bUnread - aUnread;

    // Alphabetical
    const aName = a.nickname || a.display_name;
    const bName = b.nickname || b.display_name;
    return aName.localeCompare(bName);
  });

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowAddContact(!showAddContact)}
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            title="Add contact"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        {showAddContact && (
          <form onSubmit={handleAddContact} className="mt-3">
            <input
              type="email"
              placeholder="Contact email..."
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              required
            />
            {error && (
              <div className="text-red-600 text-sm mb-2">{error}</div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddContact(false);
                  setError('');
                  setNewContactEmail('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {sortedContacts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {contacts.length === 0 ? 'No contacts yet' : 'No matching contacts'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white font-semibold text-lg">
                      {(contact.nickname || contact.display_name).charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      <PresenceBadge
                        status={contact.presence_status || 'offline'}
                        lastSeen={contact.last_seen}
                        size="md"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gray-900 truncate">
                        {contact.nickname || contact.display_name}
                      </div>
                      {contact.unread_count && contact.unread_count > 0 && (
                        <UnreadBadge count={contact.unread_count} size="sm" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {contact.display_name}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
