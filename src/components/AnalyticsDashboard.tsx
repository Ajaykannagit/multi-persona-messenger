import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, TrendingUp, MessageSquare, Clock, BarChart } from 'lucide-react';
import * as Icons from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
}

interface PersonaStats {
  persona: Persona;
  messageCount: number;
  channelCount: number;
  lastActive: string | null;
}

interface AnalyticsDashboardProps {
  personas: Persona[];
  onClose: () => void;
}

export function AnalyticsDashboard({ personas, onClose }: AnalyticsDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<PersonaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, [personas]);

  const getIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.Star;
    return Icon;
  };

  const loadAnalytics = async () => {
    setLoading(true);

    const personaStats: PersonaStats[] = [];
    let total = 0;

    for (const persona of personas) {
      const { data: channels } = await supabase
        .from('persona_channels')
        .select(`
          id,
          last_message_at,
          contacts!inner(user_id)
        `)
        .eq('persona_id', persona.id)
        .eq('contacts.user_id', user!.id);

      if (channels) {
        let messageCount = 0;
        let latestMessageTime: string | null = null;

        for (const channel of channels) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channel.id);

          messageCount += count || 0;

          if (channel.last_message_at) {
            if (!latestMessageTime || channel.last_message_at > latestMessageTime) {
              latestMessageTime = channel.last_message_at;
            }
          }
        }

        total += messageCount;
        personaStats.push({
          persona,
          messageCount,
          channelCount: channels.length,
          lastActive: latestMessageTime,
        });
      }
    }

    personaStats.sort((a, b) => b.messageCount - a.messageCount);
    setStats(personaStats);
    setTotalMessages(total);
    setLoading(false);
  };

  const getPercentage = (count: number) => {
    if (totalMessages === 0) return 0;
    return Math.round((count / totalMessages) * 100);
  };

  const formatLastActive = (date: string | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <BarChart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
              <p className="text-sm text-gray-600">Communication insights across personas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading analytics...</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-6 h-6" />
                    <div className="text-sm font-medium opacity-90">Total Messages</div>
                  </div>
                  <div className="text-3xl font-bold">{totalMessages}</div>
                </div>

                <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-6 h-6" />
                    <div className="text-sm font-medium opacity-90">Active Personas</div>
                  </div>
                  <div className="text-3xl font-bold">
                    {stats.filter((s) => s.messageCount > 0).length}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-6 h-6" />
                    <div className="text-sm font-medium opacity-90">Active Channels</div>
                  </div>
                  <div className="text-3xl font-bold">
                    {stats.reduce((sum, s) => sum + s.channelCount, 0)}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Persona Breakdown</h3>
                <div className="space-y-3">
                  {stats.map((stat) => {
                    const Icon = getIcon(stat.persona.icon);
                    const percentage = getPercentage(stat.messageCount);

                    return (
                      <div
                        key={stat.persona.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: `${stat.persona.color_primary}20` }}
                            >
                              <Icon
                                className="w-5 h-5"
                                style={{ color: stat.persona.color_primary }}
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{stat.persona.name}</div>
                              <div className="text-sm text-gray-600">
                                {stat.channelCount} {stat.channelCount === 1 ? 'channel' : 'channels'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {stat.messageCount}
                            </div>
                            <div className="text-sm text-gray-600">{percentage}%</div>
                          </div>
                        </div>

                        <div className="mb-2">
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                background: `linear-gradient(90deg, ${stat.persona.color_primary}, ${stat.persona.color_accent})`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{stat.persona.description}</span>
                          <span className="text-gray-500">
                            Last active: {formatLastActive(stat.lastActive)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {stats.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>No data available yet. Start chatting to see analytics!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
