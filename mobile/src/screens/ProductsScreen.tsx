/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, FlatList,
  Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDrawer } from '../components/AppDrawer';
import { Product, InventoryItem } from '../types';
import * as productsService from '../services/products';

export default function ProductsScreen() {
  const { openDrawer } = useDrawer();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Product form
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', unitPrice: '' });

  // Usage form
  const [showUsage, setShowUsage] = useState(false);
  const [usageForm, setUsageForm] = useState({ productId: '', quantity: '1', reason: '' });

  // Add stock form
  const [showAddStock, setShowAddStock] = useState(false);
  const [addStockForm, setAddStockForm] = useState({ productId: '', quantity: '1', costPerUnit: '' });

  const loadData = useCallback(async () => {
    try {
      const [p, inv] = await Promise.all([
        productsService.fetchProducts(),
        productsService.fetchInventory(),
      ]);
      setProducts(p);
      setInventory(inv);
    } catch (e) {
      console.error('Products load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const getStock = (productId: string) => inventory.find(i => i.productId === productId);

  const openAdd = () => {
    setForm({ name: '', description: '', unitPrice: '' });
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setForm({ name: p.name, description: p.description || '', unitPrice: String(p.unitPrice) });
    setEditId(p.id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try {
      const payload = { name: form.name, description: form.description, unitPrice: Number(form.unitPrice) || 0 };
      if (editId) {
        await productsService.updateProduct(editId, payload);
      } else {
        await productsService.createProduct(payload);
      }
      setShowModal(false);
      loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Product', 'This will also remove inventory data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await productsService.deleteProduct(id); loadData(); }
          catch { Alert.alert('Error', 'Failed to delete product'); }
        },
      },
    ]);
  };

  const handleUsage = async () => {
    if (!usageForm.productId || !usageForm.quantity) { Alert.alert('Error', 'Fill all fields'); return; }
    try {
      await productsService.recordUsage({
        productId: usageForm.productId,
        quantity: Number(usageForm.quantity),
        reason: usageForm.reason,
      });
      setShowUsage(false);
      setUsageForm({ productId: '', quantity: '1', reason: '' });
      loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleAddStock = async () => {
    if (!addStockForm.productId || !addStockForm.quantity) { Alert.alert('Error', 'Fill all fields'); return; }
    try {
      await productsService.addStock({
        productId: addStockForm.productId,
        quantity: Number(addStockForm.quantity),
        costPerUnit: Number(addStockForm.costPerUnit) || 0,
      });
      setShowAddStock(false);
      setAddStockForm({ productId: '', quantity: '1', costPerUnit: '' });
      loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
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

      {/* Product Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Edit Product' : 'New Product'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Product name"
                placeholderTextColor="#6a6860"
                returnKeyType="next"
                value={form.name}
                onChangeText={v => setForm({ ...form, name: v })}
              />
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Description"
                placeholderTextColor="#6a6860"
                multiline
                returnKeyType="next"
                value={form.description}
                onChangeText={v => setForm({ ...form, description: v })}
              />
              <Text style={styles.formLabel}>Unit Price (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#6a6860"
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                value={form.unitPrice}
                onChangeText={v => setForm({ ...form, unitPrice: v })}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>{editId ? 'Update' : 'Create'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Usage Modal */}
      <Modal visible={showUsage} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Usage</Text>
              <TouchableOpacity onPress={() => setShowUsage(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Product</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                {products.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pickerChip, usageForm.productId === p.id && styles.pickerChipActive]}
                    onPress={() => setUsageForm({ ...usageForm, productId: p.id })}
                  >
                    <Text style={[styles.pickerChipText, usageForm.productId === p.id && styles.pickerChipTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.formLabel}>Quantity</Text>
              <TextInput
                style={styles.input} keyboardType="numeric"
                returnKeyType="next"
                value={usageForm.quantity}
                onChangeText={v => setUsageForm({ ...usageForm, quantity: v })}
              />
              <Text style={styles.formLabel}>Reason</Text>
              <TextInput
                style={styles.input} placeholder="Optional"
                placeholderTextColor="#6a6860"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                value={usageForm.reason}
                onChangeText={v => setUsageForm({ ...usageForm, reason: v })}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleUsage}>
                <Text style={styles.submitBtnText}>Record Usage</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Stock Modal */}
      <Modal visible={showAddStock} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Stock</Text>
              <TouchableOpacity onPress={() => setShowAddStock(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Product</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                {products.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pickerChip, addStockForm.productId === p.id && styles.pickerChipActive]}
                    onPress={() => setAddStockForm({ ...addStockForm, productId: p.id })}
                  >
                    <Text style={[styles.pickerChipText, addStockForm.productId === p.id && styles.pickerChipTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.formLabel}>Quantity</Text>
              <TextInput
                style={styles.input} keyboardType="numeric"
                returnKeyType="next"
                value={addStockForm.quantity}
                onChangeText={v => setAddStockForm({ ...addStockForm, quantity: v })}
              />
              <Text style={styles.formLabel}>Cost per Unit (₹)</Text>
              <TextInput
                style={styles.input} keyboardType="numeric" placeholder="0"
                placeholderTextColor="#6a6860"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                value={addStockForm.costPerUnit}
                onChangeText={v => setAddStockForm({ ...addStockForm, costPerUnit: v })}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddStock}>
                <Text style={styles.submitBtnText}>Add Stock</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => openDrawer()} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📦 Products & Inventory</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionChip} onPress={() => setShowUsage(true)}>
          <Text style={styles.actionChipText}>📉 Record Usage</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionChip} onPress={() => setShowAddStock(true)}>
          <Text style={styles.actionChipText}>📈 Add Stock</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c4622d" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        renderItem={({ item: product }) => {
          const stock = getStock(product.id);
          const isExpanded = expanded === product.id;
          return (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => setExpanded(isExpanded ? null : product.id)}
              activeOpacity={0.8}
            >
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.description ? (
                    <Text style={styles.productDesc} numberOfLines={1}>{product.description}</Text>
                  ) : null}
                  <Text style={styles.productPrice}>₹{product.unitPrice.toLocaleString()} / {product.unit}</Text>
                  {product.createdBy && (
                    <Text style={styles.productAttribution}>Added by: {product.createdBy.name}</Text>
                  )}
                </View>
                <View style={styles.stockBadge}>
                  {stock ? (
                    <>
                      <Text style={[styles.stockValue, stock.isLowStock && { color: '#ef4444' }]}>
                        {stock.totalStock}
                      </Text>
                      <Text style={styles.stockLabel}>stock</Text>
                      {stock.isLowStock && <Text style={styles.lowStockBadge}>⚠️ LOW</Text>}
                    </>
                  ) : (
                    <Text style={styles.stockLabel}>No stock</Text>
                  )}
                </View>
              </View>

              {/* Expanded details */}
              {isExpanded && stock && (
                <View style={styles.expandedSection}>
                  <View style={styles.stockRow}>
                    <Text style={styles.stockMeta}>Used: {stock.totalUsed}</Text>
                    <Text style={styles.stockMeta}>
                      Days left: {stock.daysRemaining != null ? stock.daysRemaining : '∞'}
                    </Text>
                    <Text style={styles.stockMeta}>
                      Daily usage: {stock.dailyUsageRate.toFixed(1)}
                    </Text>
                  </View>
                  {stock.lots.length > 0 && (
                    <View style={styles.lotsSection}>
                      <Text style={styles.lotsTitle}>Lots</Text>
                      {stock.lots.map(lot => (
                        <View key={lot.id} style={styles.lotRow}>
                          <Text style={styles.lotNum}>{lot.lotNumber}</Text>
                          <Text style={styles.lotInfo}>
                            {lot.remainingQty}/{lot.quantity} • ₹{lot.costPerUnit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.productActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(product)}>
                      <Text style={styles.editBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(product.id)}>
                      <Text style={styles.delBtnText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No products yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
              <Text style={styles.emptyBtnText}>Add Product</Text>
            </TouchableOpacity>
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
  addBtn: { backgroundColor: '#c4622d', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  actionBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  actionChip: {
    flex: 1, backgroundColor: '#1e1e1c', paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#2e2e2b',
  },
  actionChipText: { color: '#a8a498', fontSize: 13, fontWeight: '500' },

  productCard: {
    backgroundColor: '#1e1e1c', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#2e2e2b',
  },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  productInfo: { flex: 1, marginRight: 12 },
  productName: { color: '#f0ede3', fontSize: 15, fontWeight: '600' },
  productDesc: { color: '#6a6860', fontSize: 13, marginTop: 2 },
  productPrice: { color: '#c4622d', fontSize: 13, marginTop: 4, fontWeight: '500' },
  productAttribution: { color: '#c4622d', fontSize: 11, marginTop: 8, fontStyle: 'italic' },

  stockBadge: { alignItems: 'center', minWidth: 60 },
  stockValue: { color: '#f0ede3', fontSize: 22, fontWeight: '700' },
  stockLabel: { color: '#6a6860', fontSize: 11 },
  lowStockBadge: { fontSize: 10, color: '#ef4444', fontWeight: '700', marginTop: 2 },

  expandedSection: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#2e2e2b', paddingTop: 12 },
  stockRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  stockMeta: { color: '#a8a498', fontSize: 12 },

  lotsSection: { marginTop: 12 },
  lotsTitle: { color: '#a8a498', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  lotRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: '#262624',
  },
  lotNum: { color: '#f0ede3', fontSize: 12 },
  lotInfo: { color: '#6a6860', fontSize: 12 },

  productActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: { flex: 1, backgroundColor: 'rgba(196,98,45,0.15)', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  editBtnText: { color: '#c4622d', fontSize: 13, fontWeight: '600' },
  delBtn: { flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  delBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },

  modalContent: {
    backgroundColor: '#1e1e1c', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { color: '#f0ede3', fontSize: 20, fontWeight: '700' },
  modalClose: { color: '#a8a498', fontSize: 24, padding: 4 },
  formLabel: { color: '#a8a498', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#131312', color: '#f0ede3', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#2e2e2b',
  },
  pickerRow: { marginBottom: 8, maxHeight: 44 },
  pickerChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#2e2e2b', marginRight: 8,
  },
  pickerChipActive: { backgroundColor: '#c4622d' },
  pickerChipText: { color: '#a8a498', fontSize: 13 },
  pickerChipTextActive: { color: '#fff', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#c4622d', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 20, marginBottom: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  emptyState: {
    backgroundColor: '#1e1e1c', borderRadius: 12, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#2e2e2b', marginTop: 20,
  },
  emptyText: { color: '#a8a498', fontSize: 14 },
  emptyBtn: {
    backgroundColor: '#c4622d', paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 10, marginTop: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

