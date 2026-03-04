/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDrawer } from '../components/AppDrawer';
import { LedgerEntry, LedgerSummary, Customer, Product } from '../types';
import * as ledgerService from '../services/ledger';
import * as customersService from '../services/customers';
import * as productsService from '../services/products';

export default function LedgerScreen() {
  const { openDrawer } = useDrawer();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({ totalSales: 0, totalRevenue: 0, totalItemsSold: 0 });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [ledgerData, c, p] = await Promise.all([
        ledgerService.fetchLedger({
          customerId: filterCustomer || undefined,
          productId: filterProduct || undefined,
        }),
        customersService.fetchCustomers(),
        productsService.fetchProducts(),
      ]);
      setEntries(ledgerData.entries);
      setSummary(ledgerData.summary);
      setCustomers(c);
      setProducts(p);
    } catch (e) {
      console.error('Ledger load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterCustomer, filterProduct]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return '—';
    return customers.find(c => c.id === customerId)?.name || '—';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.center}><ActivityIndicator size="large" color="#c4622d" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => openDrawer()} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>💰 Sales Ledger</Text>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c4622d" />}
        ListHeaderComponent={
          <>
            {/* Summary Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Sales</Text>
                <Text style={styles.statValue}>{summary.totalSales}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Revenue</Text>
                <Text style={styles.statValue}>₹{(summary.totalRevenue || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Items Sold</Text>
                <Text style={styles.statValue}>{summary.totalItemsSold}</Text>
              </View>
            </View>

            {/* Customer Filter */}
            <Text style={styles.filterLabel}>Filter by Customer</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, !filterCustomer && styles.filterChipActive]}
                onPress={() => setFilterCustomer('')}
              >
                <Text style={[styles.filterChipText, !filterCustomer && styles.filterChipTextActive]}>All</Text>
              </TouchableOpacity>
              {customers.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.filterChip, filterCustomer === c.id && styles.filterChipActive]}
                  onPress={() => setFilterCustomer(filterCustomer === c.id ? '' : c.id)}
                >
                  <Text style={[styles.filterChipText, filterCustomer === c.id && styles.filterChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Product Filter */}
            <Text style={styles.filterLabel}>Filter by Product</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, !filterProduct && styles.filterChipActive]}
                onPress={() => setFilterProduct('')}
              >
                <Text style={[styles.filterChipText, !filterProduct && styles.filterChipTextActive]}>All</Text>
              </TouchableOpacity>
              {products.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.filterChip, filterProduct === p.id && styles.filterChipActive]}
                  onPress={() => setFilterProduct(filterProduct === p.id ? '' : p.id)}
                >
                  <Text style={[styles.filterChipText, filterProduct === p.id && styles.filterChipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.transactionsTitle}>Transactions</Text>
          </>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        renderItem={({ item: entry }) => (
          <View style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <View style={styles.entryBadge}>
                <Text style={styles.entryBadgeText}>{entry.type}</Text>
              </View>
              <Text style={styles.entryDate}>
                {new Date(entry.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.entryProduct}>{entry.product.name}</Text>
            <View style={styles.entryDetails}>
              <Text style={styles.entryMeta}>
                {entry.quantity} × ₹{entry.unitPrice.toLocaleString()}
              </Text>
              <Text style={styles.entryTotal}>₹{entry.totalAmount.toLocaleString()}</Text>
            </View>
            {entry.order && (
              <Text style={styles.entryOrder}>Order: {entry.order.orderNumber}</Text>
            )}
            <Text style={styles.entryCustomer}>
              Customer: {getCustomerName(entry.customerId)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>
              Create orders to see ledger entries here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#131312' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  statsGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statCard: {
    flex: 1, backgroundColor: '#1e1e1c', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2e2e2b', alignItems: 'center',
  },
  statLabel: { color: '#6a6860', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { color: '#f0ede3', fontSize: 20, fontWeight: '700', marginTop: 4 },

  filterLabel: { color: '#a8a498', fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  filterRow: { maxHeight: 40, marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1e1e1c', marginRight: 8, borderWidth: 1, borderColor: '#2e2e2b',
  },
  filterChipActive: { backgroundColor: '#c4622d', borderColor: '#c4622d' },
  filterChipText: { color: '#a8a498', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },

  transactionsTitle: { color: '#f0ede3', fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 12 },

  entryCard: {
    backgroundColor: '#1e1e1c', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#2e2e2b',
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryBadge: { backgroundColor: 'rgba(196,98,45,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  entryBadgeText: { color: '#c4622d', fontSize: 11, fontWeight: '600' },
  entryDate: { color: '#6a6860', fontSize: 12 },
  entryProduct: { color: '#f0ede3', fontSize: 14, fontWeight: '600' },
  entryDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  entryMeta: { color: '#a8a498', fontSize: 13 },
  entryTotal: { color: '#c4622d', fontSize: 15, fontWeight: '700' },
  entryOrder: { color: '#6a6860', fontSize: 12, marginTop: 6 },
  entryCustomer: { color: '#6a6860', fontSize: 12, marginTop: 2 },

  emptyState: {
    backgroundColor: '#1e1e1c', borderRadius: 12, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#2e2e2b', marginTop: 20,
  },
  emptyText: { color: '#a8a498', fontSize: 14 },
  emptySubtext: { color: '#6a6860', fontSize: 13, marginTop: 4, textAlign: 'center' },
});

