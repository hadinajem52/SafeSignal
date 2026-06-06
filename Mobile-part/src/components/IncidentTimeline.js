import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { timelineAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { tokenStorage } from '../services/api';
import getSocketUrl from '../utils/socketUrl';
import EmptyState, { EMPTY_ART } from './EmptyState';
import PressableScale from './PressableScale';
import { haptics } from '../utils/haptics';
import { fontFamilies } from '../../../constants/typography';

// Stable, friendly avatar tints for non-staff participants (staff use theme.info).
const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#0D9488', '#DB2777', '#D97706', '#0EA5E9', '#16A34A'];

const hashStr = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
};

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Pick a readable text color for content sitting on a solid color (own bubble,
// send button) so it works whether the accent is light (dark teal) or dark (blue).
const readableOn = (hex) => {
  const c = typeof hex === 'string' ? hex.replace('#', '') : '';
  if (c.length < 6) return '#FFFFFF';
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0B1220' : '#FFFFFF';
};

const IncidentTimeline = ({ incidentId, onNewActivity }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [focused, setFocused] = useState(false);
  const scrollViewRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    loadTimeline();
    setupSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_incident', { incidentId });
        socketRef.current.disconnect();
      }
    };
  }, [incidentId]);

  const loadTimeline = async () => {
    setLoading(true);
    setError(null);

    const result = await timelineAPI.getTimeline(incidentId);

    if (result.success) {
      setTimeline(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const setupSocket = async () => {
    try {
      const token = await tokenStorage.getToken();
      if (!token) return;

      const socket = io(getSocketUrl(), {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        socket.emit('join_incident', { incidentId });
        setConnected(true);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('comment:new', (comment) => {
        setTimeline((prev) => [...prev, comment].sort((a, b) =>
          new Date(a.created_at) - new Date(b.created_at)
        ));

        // Let the parent (e.g. the floating chat bubble) flag new activity.
        onNewActivity?.(comment);

        // Scroll to bottom when new comment arrives
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      socket.on('error', (err) => {
        console.error('Socket error:', err);
      });

      socketRef.current = socket;
    } catch (err) {
      console.error('Failed to setup socket:', err);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    haptics.light();
    setSending(true);
    const messageText = message.trim();
    setMessage('');

    const result = await timelineAPI.postComment(incidentId, messageText, false);

    if (!result.success) {
      setError(result.error);
      setMessage(messageText); // Restore message on error
    }

    setSending(false);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const getStatusChangedMessage = (notes) => {
    const noteText = typeof notes === 'string' ? notes.trim() : String(notes ?? '').trim();
    if (!noteText) return 'Status updated';

    const normalizedNotes = noteText.toLowerCase();
    const policeClosedPatterns = [
      'closed with outcome:',
      'status changed to police_closed',
      'police_closed',
    ];

    if (policeClosedPatterns.some((pattern) => normalizedNotes.includes(pattern))) {
      return 'Incident resolved by law enforcement';
    }

    return `Status changed - ${noteText}`;
  };

  // Maps a system event to display copy + an icon/color so the activity stream
  // reads as a proper timeline rather than a list of italic lines.
  const getSystemMeta = (item) => {
    switch (item.action_type) {
      case 'verified':
        return { label: 'Report verified by moderator', icon: 'shield-checkmark', color: theme.success };
      case 'rejected':
        return { label: `Report rejected${item.notes ? ` · ${item.notes}` : ''}`, icon: 'close-circle', color: theme.error };
      case 'needs_info':
        return { label: 'Additional information requested', icon: 'help-circle', color: theme.warning };
      case 'status_changed': {
        const label = getStatusChangedMessage(item.notes);
        const resolved = label === 'Incident resolved by law enforcement';
        return { label, icon: resolved ? 'shield-checkmark' : 'sync', color: resolved ? theme.success : theme.info };
      }
      default:
        return { label: `Action: ${item.action_type}`, icon: 'ellipse', color: theme.textTertiary };
    }
  };

  const renderTimelineItem = (item, index) => {
    const key = item.id || item.comment_id || `${item.created_at}-${index}`;

    if (item.item_type === 'system') {
      const meta = getSystemMeta(item);
      return (
        <Animated.View key={key} entering={FadeIn.duration(220)} style={styles.systemRow}>
          <View style={[styles.systemPill, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <View style={[styles.systemIcon, { backgroundColor: `${meta.color}26` }]}>
              <Ionicons name={meta.icon} size={12} color={meta.color} />
            </View>
            <Text style={[styles.systemText, { color: theme.textSecondary }]} numberOfLines={3}>
              {meta.label}
            </Text>
          </View>
          <Text style={[styles.systemTime, { color: theme.textTertiary }]}>{formatTime(item.created_at)}</Text>
        </Animated.View>
      );
    }

    const isOwnMessage = item.user_id === user?.userId;
    const isStaff = ['moderator', 'admin', 'law_enforcement'].includes(item.role);

    if (isOwnMessage) {
      return (
        <Animated.View key={key} entering={FadeIn.duration(220)} style={[styles.msgRow, styles.msgRowRight]}>
          <View style={styles.bubbleColRight}>
            <View style={[styles.bubble, styles.bubbleRight, { backgroundColor: theme.primary }]}>
              <Text style={[styles.messageText, { color: readableOn(theme.primary) }]}>{item.content}</Text>
            </View>
            <Text style={[styles.timeText, styles.timeRight, { color: theme.textTertiary }]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </Animated.View>
      );
    }

    const avatarColor = isStaff
      ? theme.info
      : AVATAR_COLORS[hashStr(item.username || '?') % AVATAR_COLORS.length];

    return (
      <Animated.View key={key} entering={FadeIn.duration(220)} style={[styles.msgRow, styles.msgRowLeft]}>
        <View style={[styles.avatar, { backgroundColor: `${avatarColor}26`, borderColor: `${avatarColor}55` }]}>
          <Text style={[styles.avatarText, { color: avatarColor }]}>{getInitials(item.username)}</Text>
        </View>
        <View style={styles.bubbleColLeft}>
          <View style={styles.nameRow}>
            <Text style={[styles.senderName, { color: theme.text }]} numberOfLines={1}>{item.username}</Text>
            {isStaff ? (
              <View style={[styles.staffChip, { backgroundColor: `${theme.info}1F` }]}>
                <Ionicons name="shield-checkmark" size={9} color={theme.info} />
                <Text style={[styles.staffText, { color: theme.info }]}>Staff</Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.bubble, styles.bubbleLeft, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <Text style={[styles.messageText, { color: theme.text }]}>{item.content}</Text>
          </View>
          <Text style={[styles.timeText, styles.timeLeft, { color: theme.textTertiary }]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <EmptyState
          illustration={EMPTY_ART.errorGeneric}
          title="Couldn't load updates"
          message={error}
          actionLabel="Retry"
          onAction={loadTimeline}
          size={140}
        />
      </View>
    );
  }

  const canSend = Boolean(message.trim()) && !sending;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.toolbar, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.toolbarLeft}>
          <View style={[styles.liveDot, { backgroundColor: connected ? theme.success : theme.textTertiary }]} />
          <Text style={[styles.toolbarText, { color: theme.textSecondary }]}>
            {connected ? 'Live' : 'Connecting…'}
          </Text>
        </View>
        <Text style={[styles.toolbarCount, { color: theme.textTertiary }]}>
          {timeline.length} {timeline.length === 1 ? 'update' : 'updates'}
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.timelineContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
      >
        {timeline.length === 0 ? (
          <EmptyState
            illustration={EMPTY_ART.timeline}
            title="No messages yet"
            message="Witness updates and status changes appear here."
            size={140}
          />
        ) : (
          timeline.map((item, index) => renderTimelineItem(item, index))
        )}
      </ScrollView>

      <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <View style={[styles.inputWrap, { backgroundColor: theme.background, borderColor: focused ? theme.primary : theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Add a comment…"
            placeholderTextColor={theme.inputPlaceholder || theme.textTertiary}
            value={message}
            onChangeText={setMessage}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            multiline
            maxLength={1000}
          />
        </View>
        <PressableScale
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, { backgroundColor: canSend ? theme.primary : theme.surface2 }]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={readableOn(theme.primary)} />
          ) : (
            <Ionicons name="arrow-up" size={20} color={canSend ? readableOn(theme.primary) : theme.textTertiary} />
          )}
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  toolbarText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  toolbarCount: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
  },

  timelineContent: {
    padding: 14,
    paddingBottom: 18,
    flexGrow: 1,
  },

  // System events
  systemRow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  systemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '92%',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  systemIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemText: {
    flexShrink: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
  },
  systemTime: {
    fontFamily: fontFamilies.body,
    fontSize: 10.5,
    marginTop: 4,
  },

  // Chat rows
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    maxWidth: '86%',
  },
  msgRowLeft: {
    alignSelf: 'flex-start',
  },
  msgRowRight: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  avatarText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
  },
  bubbleColLeft: {
    flexShrink: 1,
    alignItems: 'flex-start',
  },
  bubbleColRight: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    marginLeft: 2,
  },
  senderName: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 12.5,
    flexShrink: 1,
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  staffText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 9.5,
  },
  bubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleLeft: {
    borderTopLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleRight: {
    borderTopRightRadius: 6,
  },
  messageText: {
    fontFamily: fontFamilies.body,
    fontSize: 14.5,
    lineHeight: 20,
  },
  timeText: {
    fontFamily: fontFamilies.body,
    fontSize: 10.5,
    marginTop: 4,
  },
  timeLeft: {
    marginLeft: 4,
  },
  timeRight: {
    marginRight: 4,
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 2,
    maxHeight: 110,
    justifyContent: 'center',
  },
  input: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    maxHeight: 96,
    padding: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default IncidentTimeline;
