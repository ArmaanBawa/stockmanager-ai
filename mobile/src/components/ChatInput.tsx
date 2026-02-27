import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, InteractionManager, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as chatService from '../services/chat';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function ChatInput({ onSend, disabled, autoFocus = true }: Props) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    if (autoFocus) {
      // Wait for screen transition/mount to finish, then focus
      const handle = InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);
      });
      return () => handle.cancel();
    }
  }, [autoFocus]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const startRecording = useCallback(async () => {
    if (isRecording || isTranscribing || disabled) return;
    setSpeechError(null);

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setSpeechError('Microphone permission is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      setSpeechError('Unable to start recording.');
    }
  }, [disabled, isRecording, isTranscribing]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      const recording = recordingRef.current;
      recordingRef.current = null;
      await recording.stopAndUnloadAsync();
      setIsRecording(false);

      const uri = recording.getURI();
      if (!uri) return;

      setIsTranscribing(true);
      const transcript = await chatService.transcribeAudio(uri);
      if (transcript.trim()) {
        onSend(transcript.trim());
      }
    } catch (error) {
      console.error(error);
      setSpeechError('Transcription failed. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  }, [onSend]);

  return (
    <>
      <View style={styles.container}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Ask about your sales..."
          placeholderTextColor="#6a6860"
          multiline
          maxLength={500}
          editable={!disabled}
          onSubmitEditing={handleSend}
          blurOnSubmit
          autoFocus={autoFocus}
        />
        <TouchableOpacity
          style={[styles.micBtn, (disabled || isTranscribing) && styles.micBtnDisabled, isRecording && styles.micBtnRecording]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={disabled || isTranscribing}
          activeOpacity={0.7}
        >
          <Text style={styles.micText}>
            {isRecording ? '■' : isTranscribing ? '…' : '🎙️'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || disabled) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
      {speechError ? (
        <Text style={styles.errorText}>{speechError}</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    borderTopWidth: 1,
    borderTopColor: '#2e2e2b',
    backgroundColor: '#131312',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e1e1c',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f0ede3',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#2e2e2b',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#c4622d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f1f1c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2e2e2b',
  },
  micBtnRecording: {
    backgroundColor: '#c4622d',
    borderColor: '#c4622d',
  },
  micBtnDisabled: {
    opacity: 0.5,
  },
  micText: {
    color: '#f0ede3',
    fontSize: 16,
    fontWeight: '700',
  },
  sendBtnDisabled: {
    backgroundColor: '#2e2e2b',
  },
  sendText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 12,
  },
});
