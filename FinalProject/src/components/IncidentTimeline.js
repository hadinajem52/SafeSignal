import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { timelineAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { tokenStorage } from '../services/api';
import getSocketUrl from '../utils/socketUrl';

const IncidentTimeline = ({ incidentId, incidentStatus }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
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
        console.log('Socket connected for incident timeline');
        socket.emit('join_incident', { incidentId });
      });

      socket.on('comment:new', (comment) => {
        setTimeline((prev) => [...prev, comment].sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        ));
        
        // Scroll to bottom when new comment arrives
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      socket.on('joined_incident', () => {
        console.log('Joined incident room:', incidentId);
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

  const renderTimelineItem = (item, index) => {
    const isSystemMessage = item.item_type === 'system';
    const isOwnMessage = item.user_id === user?.userId;

    if (isSystemMessage) {
      return (
        <View key={index} style={styles.systemMessageContainer}>
          <Text style={[styles.systemMessageText, { color: theme.textSecondary }]}>
            {getSystemMessage(item)}
          </Text>
          <Text style={[styles.timestampText, { color: theme.textSecondary }]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      );
    }

    const isStaff = ['moderator', 'admin', 'law_enforcement'].includes(item.role);

    return (
      <View
        key={index}
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.messageRight : styles.messageLeft,
        ]}
      >
        {!isOwnMessage && (
          <Text style={[styles.senderName, { color: isStaff ? '#3B82F6' : theme.textSecondary }]}>
            {item.username} {isStaff && '(Staff)'}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOwnMessage ? theme.primary : theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isOwnMessage ? '#FFFFFF' : theme.text },
            ]}
          >
            {item.content}
          </Text>
        </View>
        <Text style={[styles.timestampText, { color: theme.textSecondary }]}>
          {formatTime(item.created_at)}
        </Text>
      </View>
    );
  };

  const getSystemMessage = (item) => {
    switch (item.action_type) {
      case 'status_changed':
        return `Status changed ${item.notes ? `- ${item.notes}` : ''}`;
      case 'verified':
        return 'Report verified by moderator';
      case 'rejected':
        return `Report rejected ${item.notes ? `- ${item.notes}` : ''}`;
      case 'needs_info':
        return 'Additional information requested';
      default:
        return `Action: ${item.action_type}`;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        <TouchableOpacity onPress={loadTimeline} style={styles.retryButton}>
          <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.timelineContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
      >
        {timeline.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        ) : (
          timeline.map((item, index) => renderTimelineItem(item, index))
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Add a comment..."
          placeholderTextColor={theme.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!message.trim() || sending}
          style={[
            styles.sendButton,
            { backgroundColor: message.trim() && !sending ? theme.primary : theme.border },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timelineContent: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  messageLeft: {
    alignSelf: 'flex-start',
  },
  messageRight: {
    alignSelf: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestampText: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  systemMessageText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default IncidentTimeline;
