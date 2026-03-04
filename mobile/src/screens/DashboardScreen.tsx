import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDrawer } from '../components/AppDrawer';
import { DashboardData, Insight } from '../types';
import * as dashboardService from '../services/dashboard';

const STATUS_EMOJI: Record<string, string> = {
  PLACED: '📋', ACCEPTED: '✅', IN_MANUFACTURING: '🏭',
  DISPATCHED: '🚚', DELIVERED: '📦', CANCELLED: '❌',
};

const INSIGHT_STYLES: Record<string, { icon: string; bg: string }> = {
  critical: { icon: '🔴', bg: 'rgba(239,68,68,0.15)' },
  warning: { icon: '🟡', bg: 'rgba(245,158,11,0.15)' },
  info: { icon: 'ℹ️', bg: 'rgba(59,130,246,0.15)' },
};

const BADGE_COLORS: Record<string, string> = {
  placed: 'rgba(59,130,246,0.2)',
  accepted: 'rgba(34,197,94,0.2)',
  in_manufacturing: 'rgba(245,158,11,0.2)',
  dispatched: 'rgba(168,85,247,0.2)',
  delivered: 'rgba(34,197,94,0.2)',
  cancelled: 'rgba(239,68,68,0.2)',
};

export default function DashboardScreen() {
  const { openDrawer, navigateTo } = useDrawer();
  const [data, setData] = useState<DashboardData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dash, ins] = await Promise.all([
        dashboardService.fetchDashboard(),
        dashboardService.fetchInsights(),
      ]);
      setData(dash);
      setInsights(ins);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c4622d" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = data?.stats;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => openDrawer()}
          style={styles.menuBtn}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📊 Dashboard</Text>
          <Text style={styles.headerSubtitle}>Overview of your activity</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigateTo('Orders')}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+ Order</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c4622d" />}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Orders</Text>
            <Text style={styles.statValue}>{stats?.totalOrders || 0}</Text>
            <Text style={styles.statSub}>{stats?.activeOrders || 0} active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Customers</Text>
            <Text style={styles.statValue}>{stats?.totalCustomers || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Products</Text>
            <Text style={styles.statValue}>{stats?.totalProducts || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Inventory</Text>
            <Text style={styles.statValue}>{stats?.totalStockUnits || 0}</Text>
            <Text style={styles.statSub}>₹{(stats?.totalStockValue || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigateTo('Orders')}>
              <Text style={styles.sectionLink}>View all →</Text>
            </TouchableOpacity>
          </View>
          {data?.recentOrders && data.recentOrders.length > 0 ? (
            data.recentOrders.slice(0, 5).map(order => (
              <View key={order.id} style={styles.orderCard}>
                <Text style={styles.orderEmoji}>
                  {STATUS_EMOJI[order.status] || '📋'}
                </Text>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <Text style={styles.orderMeta}>
                    {order.customer.name} • ₹{order.totalAmount.toLocaleString()}
                  </Text>
                  <View style={styles.orderRow}>
                    <View style={[styles.badge, { backgroundColor: BADGE_COLORS[order.status.toLowerCase()] || 'rgba(196,98,45,0.2)' }]}>
                      <Text style={styles.badgeText}>{order.status.replace('_', ' ')}</Text>
                    </View>
                    <Text style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No orders yet</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigateTo('Orders')}
              >
                <Text style={styles.emptyBtnText}>Create your first order</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AI Insights */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🤖 AI Insights</Text>
            <TouchableOpacity onPress={() => navigateTo('Chat')}>
              <Text style={styles.sectionLink}>Ask AI →</Text>
            </TouchableOpacity>
          </View>
          {insights.length > 0 ? (
            insights.slice(0, 5).map((insight, i) => {
              const style = INSIGHT_STYLES[insight.severity] || INSIGHT_STYLES.info;
              return (
                <View key={i} style={[styles.insightCard, { backgroundColor: style.bg }]}>
                  <Text style={styles.insightIcon}>{style.icon}</Text>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightMsg}>{insight.message}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>✨ All looking good! No alerts.</Text>
              <Text style={styles.emptySubtext}>
                Add customers, products, and orders to get AI insights.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#131312' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#a8a498', fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2e2e2b', gap: 12,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#1e1e1c',
    alignItems: 'center', justifyContent: 'center',
  },
  menuIcon: { color: '#f0ede3', fontSize: 20 },
  headerCenter: { flex: 1 },
  headerTitle: { color: '#f0ede3', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: '#6a6860', fontSize: 13, marginTop: 1 },
  addBtn: {
    backgroundColor: '#c4622d', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  content: { flex: 1, paddingHorizontal: 16 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16,
  },
  statCard: {
    width: '48%', backgroundColor: '#1e1e1c', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#2e2e2b', marginBottom: 10,
  },
  statLabel: { color: '#6a6860', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { color: '#f0ede3', fontSize: 28, fontWeight: '700', marginTop: 6 },
  statSub: { color: '#c4622d', fontSize: 12, marginTop: 4 },

  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { color: '#f0ede3', fontSize: 16, fontWeight: '600' },
  sectionLink: { color: '#6a6860', fontSize: 13 },

  orderCard: {
    flexDirection: 'row', backgroundColor: '#1e1e1c', borderRadius: 12,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2e2e2b', gap: 12,
  },
  orderEmoji: { fontSize: 28 },
  orderInfo: { flex: 1 },
  orderNumber: { color: '#f0ede3', fontSize: 14, fontWeight: '600' },
  orderMeta: { color: '#a8a498', fontSize: 13, marginTop: 2 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(196,98,45,0.2)',
  },
  badgeText: { color: '#f0ede3', fontSize: 11, fontWeight: '600' },
  orderDate: { color: '#6a6860', fontSize: 12 },

  insightCard: {
    flexDirection: 'row', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12,
  },
  insightIcon: { fontSize: 20 },
  insightContent: { flex: 1 },
  insightTitle: { color: '#f0ede3', fontSize: 14, fontWeight: '600' },
  insightMsg: { color: '#a8a498', fontSize: 13, marginTop: 4 },

  emptyState: {
    backgroundColor: '#1e1e1c', borderRadius: 12, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#2e2e2b',
  },
  emptyText: { color: '#a8a498', fontSize: 14 },
  emptySubtext: { color: '#6a6860', fontSize: 13, marginTop: 4, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: '#c4622d', paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 10, marginTop: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

