import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  // Simple markdown: bold **text** and line breaks
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={i} style={styles.bold}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      // Handle bullet points
      const processed = part.replace(/^• /gm, '  •  ');
      return <Text key={i}>{processed}</Text>;
    });
  };

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🤖</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.text,
            isUser ? styles.userText : styles.assistantText,
          ]}
        >
          {renderContent(message.content)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e1e1c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  avatarText: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#c4622d',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#1e1e1c',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#ffffff',
  },
  assistantText: {
    color: '#f0ede3',
  },
  bold: {
    fontWeight: '700',
  },
});
