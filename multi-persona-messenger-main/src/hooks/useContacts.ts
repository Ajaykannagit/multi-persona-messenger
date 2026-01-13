import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/database.types';

type Contact = {
  id: string;
  contact_user_id: string;
  nickname: string | null;
  display_name: string;
  avatar_url: string | null;
};

type ContactWithProfile = Database['public']['Tables']['contacts']['Row'] & {
  profiles: Pick<
    Database['public']['Tables']['profiles']['Row'],
    'display_name' | 'avatar_url'
  > | null;
};

export function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContacts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(
          `
          id,
          contact_user_id,
          nickname,
          profiles!contacts_contact_user_id_fkey(display_name, avatar_url)
        `
        )
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      if (data) {
        const formattedContacts: Contact[] = data.map(
          (contact: ContactWithProfile) => ({
            id: contact.id,
            contact_user_id: contact.contact_user_id,
            nickname: contact.nickname,
            display_name: contact.profiles?.display_name ?? '',
            avatar_url: contact.profiles?.avatar_url ?? null,
          })
        );
        setContacts(formattedContacts);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [user]);

  return { contacts, loading, refreshContacts: loadContacts };
}
