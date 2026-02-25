import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { ChatMessage } from '../types';
import * as chatService from '../services/chat';
import MessageBubble from '../components/MessageBubble';
import SuggestionChips from '../components/SuggestionChips';
import ChatInput from '../components/ChatInput';

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '👋 Hi! I\'m your AI sales assistant.\n\nI can help you with:\n• **Recent sales & revenue**\n• **Stock levels**\n• **Customer details**\n• **Order tracking**\n• **Business insights**\n\nWhat would you like to know?',
};

export default function ChatScreen() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Load chat history on mount
  useEffect(() => {
    chatService.loadChatHistory().then(history => {
      if (history.length > 0) {
        setMessages([WELCOME, ...history]);
      }
      setHistoryLoading(false);
    });
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      };

      const thinkingMsg: ChatMessage = {
        id: 'thinking',
        role: 'assistant',
        content: '...',
      };

      setMessages(prev => [...prev, userMsg, thinkingMsg]);
      setIsLoading(true);

      // Build messages array for the API (exclude welcome and thinking)
      const apiMessages = [...messages, userMsg]
        .filter(m => m.id !== 'welcome' && m.id !== 'thinking')
        .map(m => ({ role: m.role, content: m.content }));

      await chatService.sendMessage(
        apiMessages,
        // onChunk — update the thinking bubble progressively
        (partialText: string) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === 'thinking'
                ? { ...m, content: partialText }
                : m
            )
          );
        },
        // onDone — finalize the assistant message
        (fullText: string) => {
          const assistantMsg: ChatMessage = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: fullText,
          };
          setMessages(prev =>
            prev.map(m => (m.id === 'thinking' ? assistantMsg : m))
          );
          setIsLoading(false);
        },
        // onError
        (error: string) => {
          setMessages(prev => prev.filter(m => m.id !== 'thinking'));
          setIsLoading(false);
          Alert.alert('Error', error);
        }
      );
    },
    [messages, isLoading]
  );

  const handleClearChat = useCallback(() => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear all chat history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await chatService.clearChatHistory();
          setMessages([WELCOME]);
        },
      },
    ]);
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  }, [logout]);

  if (historyLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🤖 Sales Assistant</Text>
          <Text style={styles.headerSubtitle}>
            {user?.businessName || user?.name || ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {messages.length > 1 && (
            <TouchableOpacity onPress={handleClearChat} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>🗑️</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>↪️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Suggestions */}
        <SuggestionChips onSelect={sendMessage} disabled={isLoading} />

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            // Show a typing indicator for the thinking message
            if (item.id === 'thinking' && item.content === '...') {
              return (
                <View style={[styles.thinkingRow]}>
                  <View style={styles.thinkingAvatar}>
                    <Text style={{ fontSize: 16 }}>🤖</Text>
                  </View>
                  <View style={styles.thinkingBubble}>
                    <ActivityIndicator size="small" color="#6366f1" />
                    <Text style={styles.thinkingText}>Thinking...</Text>
                  </View>
                </View>
              );
            }
            return <MessageBubble message={item} />;
          }}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: 18,
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  thinkingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  thinkingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});

