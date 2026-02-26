import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

const SUGGESTIONS = [
  'How is my business doing?',
  'Show me recent sales',
  'How much stock is left?',
  'Show me my customers',
  'Any recommendations?',
  'What are my top sellers?',
  'Sales this month?',
];

interface Props {
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export default function SuggestionChips({ onSelect, disabled }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {SUGGESTIONS.map((s, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.chip, disabled && styles.chipDisabled]}
          onPress={() => onSelect(s)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, disabled && styles.chipTextDisabled]}>
            {s}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 50,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#1e1e1c',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2e2e2b',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    color: '#a8a498',
    fontSize: 13,
  },
  chipTextDisabled: {
    color: '#6a6860',
  },
});

