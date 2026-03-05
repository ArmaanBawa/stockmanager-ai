/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, FlatList,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDrawer } from '../components/AppDrawer';
import { Order, Customer, Product } from '../types';
import * as ordersService from '../services/orders';
import * as customersService from '../services/customers';
import * as productsService from '../services/products';
import SearchableSelect from '../components/SearchableSelect';

const STATUSES = ['PLACED', 'ACCEPTED', 'IN_MANUFACTURING', 'DISPATCHED', 'DELIVERED'];
const STATUS_EMOJI: Record<string, string> = {
  PLACED: '📋', ACCEPTED: '✅', IN_MANUFACTURING: '🏭',
  DISPATCHED: '🚚', DELIVERED: '📦', CANCELLED: '❌',
};
const MFG_LABELS: Record<string, string> = {
  RAW_MATERIAL_PREP: 'Raw Material Prep', ASSEMBLY: 'Assembly',
  QUALITY_CHECK: 'Quality Check', PACKAGING: 'Packaging',
};
const FILTER_OPTIONS = ['', 'PLACED', 'ACCEPTED', 'IN_MANUFACTURING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];
const BADGE_COLORS: Record<string, string> = {
  placed: 'rgba(59,130,246,0.2)',
  accepted: 'rgba(34,197,94,0.2)',
  in_manufacturing: 'rgba(245,158,11,0.2)',
  dispatched: 'rgba(168,85,247,0.2)',
  delivered: 'rgba(34,197,94,0.2)',
  cancelled: 'rgba(239,68,68,0.2)',
};

export default function OrdersScreen() {
  const { openDrawer } = useDrawer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newItems, setNewItems] = useState([{ productId: '', quantity: '', unitPrice: '' }]);

  const loadData = useCallback(async () => {
    try {
      const [o, c, p] = await Promise.all([
        ordersService.fetchOrders(filterStatus || undefined),
        customersService.fetchCustomers(),
        productsService.fetchProducts(),
      ]);
      setOrders(o);
      setCustomers(c);
      setProducts(p);
    } catch (e) {
      console.error('Orders load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const viewOrder = async (id: string) => {
    try {
      const data = await ordersService.fetchOrder(id);
      setSelectedOrder(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load order details');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Order', 'Are you sure you want to delete this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await ordersService.deleteOrder(id);
            setSelectedOrder(null);
            loadData();
          } catch { Alert.alert('Error', 'Failed to delete order'); }
        },
      },
    ]);
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await ordersService.updateOrderStatus(orderId, status);
      const updated = await ordersService.fetchOrder(orderId);
      setSelectedOrder(updated);
      loadData();
    } catch { Alert.alert('Error', 'Failed to update status'); }
  };

  const handleUpdateMfg = async (orderId: string, stageId: string, status: string) => {
    try {
      await ordersService.updateMfgStage(orderId, stageId, status);
      const updated = await ordersService.fetchOrder(orderId);
      setSelectedOrder(updated);
    } catch { Alert.alert('Error', 'Failed to update stage'); }
  };

  const handleCreate = async () => {
    if (!newCustomerId) { Alert.alert('Error', 'Select a customer'); return; }
    const items = newItems.filter(i => i.productId && i.quantity).map(i => ({
      productId: i.productId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) || 0,
    }));
    if (items.length === 0) { Alert.alert('Error', 'Add at least one item'); return; }
    try {
      await ordersService.createOrder({ customerId: newCustomerId, notes: newNotes, items });
      setShowCreate(false);
      resetCreateForm();
      loadData();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to create order'); }
  };

  const resetCreateForm = () => {
    setNewCustomerId('');
    setNewNotes('');
    setNewItems([{ productId: '', quantity: '', unitPrice: '' }]);
  };

  // ─── ORDER DETAIL VIEW ───
  if (selectedOrder) {
    const currentIdx = STATUSES.indexOf(selectedOrder.status);
    const nextStatus = currentIdx < STATUSES.length - 1 ? STATUSES[currentIdx + 1] : null;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{selectedOrder.orderNumber}</Text>
            <Text style={styles.headerSubtitle}>
              {selectedOrder.customer.name} • ₹{selectedOrder.totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status + Actions */}
          <View style={styles.detailActions}>
            <View style={[styles.badge, { backgroundColor: BADGE_COLORS[selectedOrder.status.toLowerCase()] || 'rgba(196,98,45,0.2)' }]}>
              <Text style={styles.badgeText}>{selectedOrder.status.replace('_', ' ')}</Text>
            </View>
            {nextStatus && selectedOrder.status !== 'CANCELLED' && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleUpdateStatus(selectedOrder.id, nextStatus)}
              >
                <Text style={styles.actionBtnText}>→ {nextStatus.replace('_', ' ')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(selectedOrder.id)}
            >
              <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>

          {/* Timeline */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order Timeline</Text>
            {STATUSES.map((status, i) => {
              const historyEntry = selectedOrder.statusHistory?.find(h => h.status === status);
              const isCompleted = currentIdx >= i;
              const isActive = currentIdx === i;
              return (
                <View key={status} style={styles.timelineItem}>
                  <View style={[
                    styles.timelineDot,
                    isCompleted && styles.timelineDotCompleted,
                    isActive && styles.timelineDotActive,
                  ]}>
                    {isCompleted && <Text style={styles.timelineCheck}>✓</Text>}
                  </View>
                  <View style={[styles.timelineContent, !isCompleted && { opacity: 0.4 }]}>
                    <Text style={styles.timelineLabel}>
                      {STATUS_EMOJI[status]} {status.replace('_', ' ')}
                    </Text>
                    {historyEntry?.note && (
                      <Text style={styles.timelineNote}>{historyEntry.note}</Text>
                    )}
                    {historyEntry && (
                      <Text style={styles.timelineDate}>
                        {new Date(historyEntry.createdAt).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Manufacturing Stages */}
          {selectedOrder.manufacturingStages && selectedOrder.manufacturingStages.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏭 Manufacturing Progress</Text>
              {selectedOrder.manufacturingStages.map(stage => (
                <View key={stage.id} style={styles.mfgRow}>
                  <View style={styles.mfgInfo}>
                    <Text style={styles.mfgLabel}>{MFG_LABELS[stage.stage] || stage.stage}</Text>
                    <View style={[styles.badge, {
                      backgroundColor: stage.status === 'COMPLETED'
                        ? BADGE_COLORS.delivered : stage.status === 'IN_PROGRESS'
                          ? BADGE_COLORS.in_manufacturing : BADGE_COLORS.placed
                    }]}>
                      <Text style={styles.badgeText}>{stage.status}</Text>
                    </View>
                  </View>
                  {stage.status !== 'COMPLETED' && selectedOrder.status === 'IN_MANUFACTURING' && (
                    <View style={styles.mfgActions}>
                      {stage.status === 'PENDING' && (
                        <TouchableOpacity
                          style={styles.smallBtn}
                          onPress={() => handleUpdateMfg(selectedOrder.id, stage.id, 'IN_PROGRESS')}
                        >
                          <Text style={styles.smallBtnText}>Start</Text>
                        </TouchableOpacity>
                      )}
                      {stage.status === 'IN_PROGRESS' && (
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: 'rgba(34,197,94,0.2)' }]}
                          onPress={() => handleUpdateMfg(selectedOrder.id, stage.id, 'COMPLETED')}
                        >
                          <Text style={[styles.smallBtnText, { color: '#22c55e' }]}>Complete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Items */}
          <View style={[styles.card, { marginBottom: 40 }]}>
            <Text style={styles.cardTitle}>Items</Text>
            {selectedOrder.items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} × ₹{item.unitPrice.toLocaleString()} = ₹{item.total.toLocaleString()}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{selectedOrder.totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── CREATE ORDER MODAL ───
  const renderCreateModal = () => (
    <Modal visible={showCreate} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Order</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); resetCreateForm(); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Customer Picker */}
                <SearchableSelect
                  label="Customer *"
                  options={customers}
                  selectedId={newCustomerId}
                  onSelect={setNewCustomerId}
                  placeholder="Select a customer..."
                />

                {/* Items */}
                <Text style={[styles.formLabel, { marginTop: 16 }]}>Items *</Text>
                {newItems.map((item, idx) => (
                  <View key={idx} style={styles.itemForm}>
                    <SearchableSelect
                      label="Product *"
                      options={products}
                      selectedId={item.productId}
                      onSelect={(id) => {
                        const product = products.find(p => p.id === id);
                        const updated = [...newItems];
                        updated[idx] = {
                          ...updated[idx],
                          productId: id,
                          unitPrice: product ? String(product.unitPrice) : updated[idx].unitPrice
                        };
                        setNewItems(updated);
                      }}
                      placeholder="Select a product..."
                    />
                    <View style={styles.itemInputRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Qty"
                        placeholderTextColor="#6a6860"
                        keyboardType="numeric"
                        returnKeyType="next"
                        value={item.quantity}
                        onChangeText={v => {
                          const updated = [...newItems];
                          updated[idx] = { ...updated[idx], quantity: v };
                          setNewItems(updated);
                        }}
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Price"
                        placeholderTextColor="#6a6860"
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        value={item.unitPrice}
                        onChangeText={v => {
                          const updated = [...newItems];
                          updated[idx] = { ...updated[idx], unitPrice: v };
                          setNewItems(updated);
                        }}
                      />
                      {newItems.length > 1 && (
                        <TouchableOpacity
                          style={styles.removeItemBtn}
                          onPress={() => setNewItems(newItems.filter((_, i) => i !== idx))}
                        >
                          <Text style={styles.removeItemText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={() => setNewItems([...newItems, { productId: '', quantity: '', unitPrice: '' }])}
                >
                  <Text style={styles.addItemBtnText}>+ Add Item</Text>
                </TouchableOpacity>

                {/* Notes */}
                <Text style={[styles.formLabel, { marginTop: 16 }]}>Notes</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Optional notes..."
                  placeholderTextColor="#6a6860"
                  multiline
                  returnKeyType="done" blurOnSubmit
                  onSubmitEditing={Keyboard.dismiss}
                  value={newNotes}
                  onChangeText={setNewNotes}
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                  <Text style={styles.submitBtnText}>Create Order</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // ─── ORDERS LIST VIEW ───
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c4622d" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      {renderCreateModal()}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => openDrawer()} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📋 Orders</Text>
        </View>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.addOrderBtn}>
          <Text style={styles.addOrderBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Status Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        {FILTER_OPTIONS.map(s => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.filterChipText, filterStatus === s && styles.filterChipTextActive]}>
              {s ? s.replace('_', ' ') : 'ALL'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        getItemLayout={(_, index) => ({
          length: 94, // Height of orderCard (padding + info + gap)
          offset: 94 * index,
          index,
        })}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c4622d" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        renderItem={({ item: order }) => (
          <TouchableOpacity style={styles.orderCard} onPress={() => viewOrder(order.id)}>
            <Text style={styles.orderEmoji}>{STATUS_EMOJI[order.status] || '📋'}</Text>
            <View style={styles.orderInfo}>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
              <Text style={styles.orderMeta}>
                {order.customer.name} • ₹{order.totalAmount.toLocaleString()}
              </Text>
              <View style={styles.orderRow}>
                <View style={[styles.badge, { backgroundColor: BADGE_COLORS[order.status.toLowerCase()] || 'rgba(196,98,45,0.2)' }]}>
                  <Text style={styles.badgeText}>{order.status.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No orders found</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.emptyBtnText}>Create Order</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#131312' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
  addOrderBtn: {
    backgroundColor: '#c4622d', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  addOrderBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  content: { flex: 1, paddingHorizontal: 16 },

  filterBar: { paddingHorizontal: 16, paddingVertical: 10, maxHeight: 50 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#1e1e1c', marginRight: 8, borderWidth: 1, borderColor: '#2e2e2b',
  },
  filterChipActive: { backgroundColor: '#c4622d', borderColor: '#c4622d' },
  filterChipText: { color: '#a8a498', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },

  orderCard: {
    flexDirection: 'row', backgroundColor: '#1e1e1c', borderRadius: 12,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2e2e2b',
    gap: 12, alignItems: 'center',
  },
  orderEmoji: { fontSize: 28 },
  orderInfo: { flex: 1 },
  orderNumber: { color: '#f0ede3', fontSize: 14, fontWeight: '600' },
  orderMeta: { color: '#a8a498', fontSize: 13, marginTop: 2 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  chevron: { color: '#6a6860', fontSize: 24, fontWeight: '300' },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(196,98,45,0.2)' },
  badgeText: { color: '#f0ede3', fontSize: 11, fontWeight: '600' },
  orderDate: { color: '#6a6860', fontSize: 12 },

  detailActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginHorizontal: 16 },
  actionBtn: { backgroundColor: '#c4622d', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  deleteBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  card: {
    backgroundColor: '#1e1e1c', borderRadius: 14, padding: 16, marginTop: 16,
    marginHorizontal: 16, borderWidth: 1, borderColor: '#2e2e2b',
  },
  cardTitle: { color: '#f0ede3', fontSize: 16, fontWeight: '600', marginBottom: 16 },

  timelineItem: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  timelineDot: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#2e2e2b',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  timelineDotCompleted: { backgroundColor: '#22c55e' },
  timelineDotActive: { backgroundColor: '#c4622d' },
  timelineCheck: { color: '#fff', fontSize: 12, fontWeight: '700' },
  timelineContent: { flex: 1 },
  timelineLabel: { color: '#f0ede3', fontSize: 14, fontWeight: '500' },
  timelineNote: { color: '#a8a498', fontSize: 12, marginTop: 2 },
  timelineDate: { color: '#6a6860', fontSize: 11, marginTop: 2 },

  mfgRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2e2e2b',
  },
  mfgInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  mfgLabel: { color: '#f0ede3', fontSize: 13, fontWeight: '500' },
  mfgActions: { flexDirection: 'row', gap: 6 },
  smallBtn: { backgroundColor: 'rgba(196,98,45,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  smallBtnText: { color: '#c4622d', fontSize: 12, fontWeight: '600' },

  itemRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2e2e2b' },
  itemName: { color: '#f0ede3', fontSize: 14, fontWeight: '500' },
  itemMeta: { color: '#a8a498', fontSize: 13, marginTop: 2 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4,
  },
  totalLabel: { color: '#a8a498', fontSize: 14, fontWeight: '600' },
  totalValue: { color: '#c4622d', fontSize: 18, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1c', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
  },
  keyboardAvoid: { width: '100%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { color: '#f0ede3', fontSize: 20, fontWeight: '700' },
  modalClose: { color: '#a8a498', fontSize: 24, padding: 4 },

  formLabel: { color: '#a8a498', fontSize: 13, fontWeight: '600', marginBottom: 8 },

  itemForm: { marginBottom: 12, backgroundColor: '#262624', borderRadius: 10, padding: 10 },
  itemInputRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: {
    backgroundColor: '#1e1e1c', color: '#f0ede3', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    borderWidth: 1, borderColor: '#2e2e2b',
  },
  removeItemBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  removeItemText: { color: '#ef4444', fontSize: 16 },
  addItemBtn: {
    paddingVertical: 10, alignItems: 'center', borderWidth: 1,
    borderColor: '#2e2e2b', borderRadius: 10, borderStyle: 'dashed', marginTop: 4,
  },
  addItemBtnText: { color: '#c4622d', fontSize: 13, fontWeight: '600' },

  submitBtn: {
    backgroundColor: '#c4622d', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 20, marginBottom: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  emptyState: {
    backgroundColor: '#1e1e1c', borderRadius: 12, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#2e2e2b', marginTop: 20,
  },
  emptyText: { color: '#a8a498', fontSize: 14 },
  emptyBtn: {
    backgroundColor: '#c4622d', paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 10, marginTop: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

