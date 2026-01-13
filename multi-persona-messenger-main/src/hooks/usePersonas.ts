import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/database.types';

type Persona = Database['public']['Tables']['user_personas']['Row'];

export function usePersonas() {
  const { user } = useAuth();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPersonas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at');

      if (error) {
        throw error;
      }

      if (data) {
        setPersonas(data);
      }
    } catch (error) {
      console.error('Error loading personas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonas();
  }, [user]);

  return { personas, loading, refreshPersonas: loadPersonas };
}
