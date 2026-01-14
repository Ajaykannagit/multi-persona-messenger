import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ContactList } from './ContactList';
import { ChatView } from './ChatView';
import { PersonaPanel } from './PersonaPanel';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { LogOut, BarChart3 } from 'lucide-react';
import { startHeartbeat, stopHeartbeat } from '../lib/presenceService';
import { initializeNotifications } from '../lib/notificationService';

interface Contact {
  id: string;
  contact_user_id: string;
  nickname: string | null;
  display_name: string;
  avatar_url: string | null;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  is_active: boolean;
  is_custom: boolean;
}

export function Messenger() {
  const { user, signOut } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPersonas();
      loadContacts();

      // Initialize presence tracking
      startHeartbeat(user.id);

      // Initialize notifications
      initializeNotifications();

      // Cleanup on unmount
      return () => {
        stopHeartbeat(user.id);
      };
    }
  }, [user]);

  useEffect(() => {
    if (personas.length > 0 && !selectedPersona) {
      setSelectedPersona(personas[0]);
    }
  }, [personas]);

  const loadPersonas = async () => {
    const { data } = await supabase
      .from('user_personas')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('created_at');

    if (data) {
      setPersonas(data);
    }
  };

  const loadContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select(`
        id,
        contact_user_id,
        nickname,
        profiles!contacts_contact_user_id_fkey(display_name, avatar_url)
      `)
      .eq('user_id', user!.id);

    if (data) {
      const formattedContacts = data.map((contact: any) => ({
        id: contact.id,
        contact_user_id: contact.contact_user_id,
        nickname: contact.nickname,
        display_name: contact.profiles.display_name,
        avatar_url: contact.profiles.avatar_url,
      }));
      setContacts(formattedContacts);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Multi-Persona Messenger</h1>
            <p className="text-sm text-gray-600">Welcome, {user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ContactList
          contacts={contacts}
          selectedContact={selectedContact}
          onSelectContact={setSelectedContact}
          onRefresh={loadContacts}
        />

        {selectedContact && selectedPersona ? (
          <div className="flex-1 flex flex-col">
            <PersonaPanel
              personas={personas}
              selectedPersona={selectedPersona}
              onSelectPersona={setSelectedPersona}
              onRefreshPersonas={loadPersonas}
              contactId={selectedContact.id}
            />
            <ChatView
              contact={selectedContact}
              persona={selectedPersona}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-24 h-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg">Select a contact to start messaging</p>
            </div>
          </div>
        )}

        {showAnalytics && (
          <AnalyticsDashboard
            personas={personas}
            onClose={() => setShowAnalytics(false)}
          />
        )}
      </div>
    </div>
  );
}
