import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { UnreadBadge } from './UnreadBadge';
import * as LucideIcons from 'lucide-react';

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

interface PersonaPanelProps {
  personas: Persona[];
  selectedPersona: Persona | null;
  onSelectPersona: (persona: Persona) => void;
  onRefreshPersonas: () => void;
  contactId?: string;
}

export function PersonaPanel({ personas, selectedPersona, onSelectPersona, onRefreshPersonas, contactId }: PersonaPanelProps) {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (contactId) {
      loadUnreadCounts();
      subscribeToUnreadUpdates();
    }
  }, [contactId, personas]);

  const loadUnreadCounts = async () => {
    if (!contactId) return;

    const { data } = await supabase
      .from('persona_channels')
      .select('persona_id, unread_count')
      .eq('contact_id', contactId);

    if (data) {
      const counts = new Map(data.map(d => [d.persona_id, d.unread_count]));
      setUnreadCounts(counts);
    }
  };

  const subscribeToUnreadUpdates = () => {
    if (!contactId) return;

    const channel = supabase
      .channel(`persona-channels:${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'persona_channels',
          filter: `contact_id=eq.${contactId}`,
        },
        (payload: any) => {
          const updated = payload.new;
          setUnreadCounts(prev => {
            const newMap = new Map(prev);
            newMap.set(updated.persona_id, updated.unread_count);
            return newMap;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-5 h-5" /> : <LucideIcons.Circle className="w-5 h-5" />;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Personas</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Create custom persona"
        >
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {personas.map((persona) => {
          const unreadCount = unreadCounts.get(persona.id) || 0;

          return (
            <button
              key={persona.id}
              onClick={() => onSelectPersona(persona)}
              className={`relative group px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${selectedPersona?.id === persona.id
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              style={
                selectedPersona?.id === persona.id
                  ? {
                    background: `linear-gradient(135deg, ${persona.color_primary}, ${persona.color_accent})`,
                  }
                  : {}
              }
            >
              {getIconComponent(persona.icon)}
              <span>{persona.name}</span>
              {unreadCount > 0 && (
                <UnreadBadge count={unreadCount} size="sm" />
              )}

              {persona.is_custom && (
                <div className="hidden group-hover:flex absolute -top-2 -right-2 gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPersona(persona);
                    }}
                    className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePersona(persona.id);
                    }}
                    className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {(showCreateForm || editingPersona) && (
        <PersonaForm
          persona={editingPersona}
          onClose={() => {
            setShowCreateForm(false);
            setEditingPersona(null);
          }}
          onSave={() => {
            setShowCreateForm(false);
            setEditingPersona(null);
            onRefreshPersonas();
          }}
        />
      )}
    </div>
  );

  async function handleDeletePersona(personaId: string) {
    if (!confirm('Are you sure you want to delete this persona?')) return;

    await supabase
      .from('user_personas')
      .delete()
      .eq('id', personaId);

    onRefreshPersonas();
  }
}

function PersonaForm({ persona, onClose, onSave }: {
  persona: Persona | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(persona?.name || '');
  const [description, setDescription] = useState(persona?.description || '');
  const [icon, setIcon] = useState(persona?.icon || 'Circle');
  const [colorPrimary, setColorPrimary] = useState(persona?.color_primary || '#3B82F6');
  const [colorSecondary, setColorSecondary] = useState(persona?.color_secondary || '#2563EB');
  const [colorAccent, setColorAccent] = useState(persona?.color_accent || '#60A5FA');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (persona) {
        // Update existing persona
        await supabase
          .from('user_personas')
          .update({
            name,
            description,
            icon,
            color_primary: colorPrimary,
            color_secondary: colorSecondary,
            color_accent: colorAccent,
          })
          .eq('id', persona.id);
      } else {
        // Create new persona
        await supabase
          .from('user_personas')
          .insert({
            user_id: user!.id,
            name,
            description,
            icon,
            color_primary: colorPrimary,
            color_secondary: colorSecondary,
            color_accent: colorAccent,
            is_custom: true,
          });
      }

      onSave();
    } catch (error) {
      console.error('Error saving persona:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {persona ? 'Edit Persona' : 'Create Custom Persona'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Icon (Lucide icon name)
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Heart, Star, Zap"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary
              </label>
              <input
                type="color"
                value={colorPrimary}
                onChange={(e) => setColorPrimary(e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary
              </label>
              <input
                type="color"
                value={colorSecondary}
                onChange={(e) => setColorSecondary(e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Accent
              </label>
              <input
                type="color"
                value={colorAccent}
                onChange={(e) => setColorAccent(e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : persona ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
