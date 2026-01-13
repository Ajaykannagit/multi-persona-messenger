import { useState } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  is_active: boolean;
}

interface PersonaPanelProps {
  personas: Persona[];
  selectedPersona: Persona;
  onSelectPersona: (persona: Persona) => void;
  onRefreshPersonas: () => void;
}

export function PersonaPanel({ personas, selectedPersona, onSelectPersona, onRefreshPersonas }: PersonaPanelProps) {
  const { user } = useAuth();
  const [showCreatePersona, setShowCreatePersona] = useState(false);
  const [editingPersona, setEditingPersona] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'Star',
    color_primary: '#6366F1',
    color_secondary: '#4F46E5',
    color_accent: '#818CF8',
  });

  const getIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.Star;
    return Icon;
  };

  const handleCreatePersona = async (e: React.FormEvent) => {
    e.preventDefault();

    await supabase.from('user_personas').insert({
      user_id: user!.id,
      ...formData,
      is_custom: true,
      is_active: true,
    });

    setFormData({
      name: '',
      description: '',
      icon: 'Star',
      color_primary: '#6366F1',
      color_secondary: '#4F46E5',
      color_accent: '#818CF8',
    });
    setShowCreatePersona(false);
    onRefreshPersonas();
  };

  const handleUpdatePersona = async (personaId: string) => {
    await supabase
      .from('user_personas')
      .update(formData)
      .eq('id', personaId);

    setEditingPersona(null);
    onRefreshPersonas();
  };

  const handleDeletePersona = async (personaId: string) => {
    if (confirm('Are you sure you want to delete this persona?')) {
      await supabase.from('user_personas').delete().eq('id', personaId);
      onRefreshPersonas();
    }
  };

  const startEdit = (persona: Persona) => {
    setFormData({
      name: persona.name,
      description: persona.description,
      icon: persona.icon,
      color_primary: persona.color_primary,
      color_secondary: persona.color_secondary,
      color_accent: persona.color_accent,
    });
    setEditingPersona(persona.id);
  };

  return (
    <div
      className="border-b border-gray-200 transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${selectedPersona.color_primary} 0%, ${selectedPersona.color_secondary} 100%)`,
      }}
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = getIcon(selectedPersona.icon);
              return <Icon className="w-6 h-6 text-white" />;
            })()}
            <div>
              <h2 className="text-xl font-bold text-white">{selectedPersona.name}</h2>
              <p className="text-white/80 text-sm">{selectedPersona.description}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreatePersona(!showCreatePersona)}
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            title="Create persona"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {personas.map((persona) => {
            const Icon = getIcon(persona.icon);
            const isEditing = editingPersona === persona.id;

            return (
              <div
                key={persona.id}
                className={`flex-shrink-0 group relative ${
                  selectedPersona.id === persona.id
                    ? 'ring-2 ring-white ring-offset-2'
                    : ''
                }`}
              >
                <button
                  onClick={() => onSelectPersona(persona)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-lg transition-all"
                  style={{ color: persona.color_primary }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{persona.name}</span>
                </button>

                {!isEditing && (
                  <div className="absolute top-0 right-0 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={() => startEdit(persona)}
                      className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded shadow-lg"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeletePersona(persona.id)}
                      className="p-1 bg-red-500 hover:bg-red-600 text-white rounded shadow-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {(showCreatePersona || editingPersona) && (
          <form
            onSubmit={editingPersona ? (e) => {
              e.preventDefault();
              handleUpdatePersona(editingPersona);
            } : handleCreatePersona}
            className="mt-4 bg-white rounded-lg p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Persona name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Icon name (e.g., Star)"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Primary</label>
                <input
                  type="color"
                  value={formData.color_primary}
                  onChange={(e) => setFormData({ ...formData, color_primary: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Secondary</label>
                <input
                  type="color"
                  value={formData.color_secondary}
                  onChange={(e) => setFormData({ ...formData, color_secondary: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Accent</label>
                <input
                  type="color"
                  value={formData.color_accent}
                  onChange={(e) => setFormData({ ...formData, color_accent: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg"
              >
                <Check className="w-4 h-4" />
                {editingPersona ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreatePersona(false);
                  setEditingPersona(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
