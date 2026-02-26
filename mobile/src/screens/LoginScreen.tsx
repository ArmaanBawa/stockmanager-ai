import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '335604282591-m3kh1o4f958gbthdpjbtac2qt9tnni47.apps.googleusercontent.com';

export default function LoginScreen() {
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;

  // Google Auth
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'procureflow' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
    },
    discovery
  );

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(cardFade, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(cardSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    // Floating orb animations
    const animateOrb = (anim: Animated.Value) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 4000, useNativeDriver: true }),
        ])
      ).start();
    };
    animateOrb(orb1);
    setTimeout(() => animateOrb(orb2), 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Google response
  useEffect(() => {
    if (response?.type === 'success') {
      const { access_token } = response.params;
      handleGoogleTokenAsync(access_token);
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const handleGoogleTokenAsync = async (accessToken: string) => {
    try {
      setGoogleLoading(true);
      // Fetch user info from Google
      const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoRes.json();

      await googleLogin({
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      Alert.alert('Login Failed', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const orb1TranslateY = orb1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });
  const orb1TranslateX = orb1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  });
  const orb2TranslateY = orb2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });
  const orb2TranslateX = orb2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      {/* Floating orbs */}
      <Animated.View style={[styles.orb1, { transform: [{ translateY: orb1TranslateY }, { translateX: orb1TranslateX }] }]} />
      <Animated.View style={[styles.orb2, { transform: [{ translateY: orb2TranslateY }, { translateX: orb2TranslateX }] }]} />
      <View style={styles.orb3} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>AI-Powered Platform</Text>
          </View>
          <Text style={styles.title}>SalesManager</Text>
          <Text style={styles.titleAccent}>AI</Text>
          <Text style={styles.subtitle}>
            Your intelligent sales assistant
          </Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[styles.card, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
          {/* Google Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => {
              setGoogleLoading(true);
              promptAsync();
            }}
            disabled={googleLoading || !request}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color="#f0ede3" size="small" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor="#6a6860"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#6a6860"
              secureTextEntry
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.footer}>
          Use the same credentials as your web dashboard
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131312',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  // Floating orbs
  orb1: {
    position: 'absolute',
    top: '10%',
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(217, 119, 87, 0.08)',
    zIndex: 0,
  },
  orb2: {
    position: 'absolute',
    bottom: '15%',
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(196, 98, 45, 0.06)',
    zIndex: 0,
  },
  orb3: {
    position: 'absolute',
    top: '50%',
    right: '20%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(217, 119, 87, 0.04)',
    zIndex: 0,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
    zIndex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(217, 119, 87, 0.1)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 87, 0.2)',
    marginBottom: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d97757',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97757',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#f0ede3',
    letterSpacing: -0.5,
  },
  titleAccent: {
    fontSize: 34,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#d97757',
    marginTop: -4,
  },
  subtitle: {
    fontSize: 15,
    color: '#a8a498',
    marginTop: 10,
  },
  // Card
  card: {
    backgroundColor: '#1a1a18',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2e2e2b',
    zIndex: 1,
  },
  // Google button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#242422',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#3a3a36',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f0ede3',
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2e2e2b',
  },
  dividerText: {
    fontSize: 12,
    color: '#6a6860',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Form
  inputGroup: {
    marginBottom: 16,
    gap: 6,
  },
  label: {
    color: '#a8a498',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1e1e1c',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f0ede3',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2e2e2b',
  },
  button: {
    backgroundColor: '#c4622d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    color: '#6a6860',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    zIndex: 1,
  },
});
