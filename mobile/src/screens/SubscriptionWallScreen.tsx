import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function SubscriptionWallScreen() {
  const { user, logout } = useAuth();

  const handleSubscribe = () => {
    // Open the billing page on the web app
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const isLocal = baseUrl.includes('localhost') || baseUrl.includes('192.168') || baseUrl.includes('10.0');
    const billingUrl = isLocal
      ? 'https://stockmanagerai.vercel.app/billing'
      : `${baseUrl}/billing`;
    Linking.openURL(billingUrl).catch(() => {
      Linking.openURL('https://stockmanagerai.vercel.app/billing');
    });
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Subscription Required</Text>

        {/* Description */}
        <Text style={styles.description}>
          The AI Sales Assistant is available exclusively for{' '}
          <Text style={styles.accent}>Super++ Plan</Text> subscribers.
        </Text>

        {/* Features */}
        <View style={styles.featuresBox}>
          <Text style={styles.featuresTitle}>What you get with Super++</Text>
          {[
            '🤖 Full AI Inventory Analysis',
            '🎙️ Voice Assistant Mobile Access',
            '📋 Unlimited Order Tracking',
            '📊 AI-Powered Ledger & Reports',
            '🔔 Smart Reorder Alerts',
          ].map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹1,499</Text>
          <Text style={styles.priceUnit}>/month</Text>
        </View>
        <Text style={styles.priceNote}>Cancel anytime</Text>

        {/* Subscribe Button */}
        <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe}>
          <Text style={styles.subscribeBtnText}>Subscribe Now</Text>
        </TouchableOpacity>

        {/* Logged in as */}
        <Text style={styles.loggedInAs}>
          Signed in as {user?.email || ''}
        </Text>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131312',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(196, 98, 45, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    color: '#f0ede3',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    color: '#a8a498',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  accent: {
    color: '#c4622d',
    fontWeight: '700',
  },
  featuresBox: {
    width: '100%',
    backgroundColor: '#1e1e1c',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2e2e2b',
  },
  featuresTitle: {
    color: '#f0ede3',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    color: '#a8a498',
    fontSize: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    color: '#f0ede3',
    fontSize: 36,
    fontWeight: '800',
  },
  priceUnit: {
    color: '#6a6860',
    fontSize: 16,
    marginLeft: 4,
  },
  priceNote: {
    color: '#6a6860',
    fontSize: 13,
    marginBottom: 24,
  },
  subscribeBtn: {
    width: '100%',
    backgroundColor: '#c4622d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  subscribeBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  loggedInAs: {
    color: '#6a6860',
    fontSize: 13,
    marginBottom: 8,
  },
  logoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
});


