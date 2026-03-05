/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, FlatList,
  ScrollView, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDrawer } from '../components/AppDrawer';
import { Customer } from '../types';
import * as customersService from '../services/customers';

export default function CustomersScreen() {
  const { openDrawer } = useDrawer();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', contactName: '', email: '', phone: '', address: '' });

  const loadData = useCallback(async () => {
    try {
      const data = await customersService.fetchCustomers();
      setCustomers(data);
    } catch (e) {
      console.error('Customers load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const resetForm = () => {
    setForm({ name: '', contactName: '', email: '', phone: '', address: '' });
    setEditId(null);
  };

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (c: Customer) => {
    setForm({
      name: c.name, contactName: c.contactName || '', email: c.email || '',
      phone: c.phone || '', address: c.address || '',
    });
    setEditId(c.id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try {
      if (editId) {
        await customersService.updateCustomer(editId, form);
      } else {
        await customersService.createCustomer(form);
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Customer', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await customersService.deleteCustomer(id); loadData(); }
          catch { Alert.alert('Error', 'Failed to delete customer'); }
        },
      },
    ]);
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

      {/* Modal */}
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
              <Text style={styles.modalTitle}>{editId ? 'Edit Customer' : 'New Customer'}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.input} placeholder="Customer name"
                placeholderTextColor="#6a6860"
                returnKeyType="next"
                value={form.name} onChangeText={v => setForm({ ...form, name: v })}
              />
              <Text style={styles.formLabel}>Contact Person</Text>
              <TextInput
                style={styles.input} placeholder="Contact name"
                placeholderTextColor="#6a6860"
                returnKeyType="next"
                value={form.contactName} onChangeText={v => setForm({ ...form, contactName: v })}
              />
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.input} placeholder="email@example.com"
                placeholderTextColor="#6a6860" keyboardType="email-address"
                returnKeyType="next"
                value={form.email} onChangeText={v => setForm({ ...form, email: v })}
              />
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.input} placeholder="Phone number"
                placeholderTextColor="#6a6860" keyboardType="phone-pad"
                returnKeyType="next"
                value={form.phone} onChangeText={v => setForm({ ...form, phone: v })}
              />
              <Text style={styles.formLabel}>Address</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Address" placeholderTextColor="#6a6860" multiline
                returnKeyType="done" blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
                value={form.address} onChangeText={v => setForm({ ...form, address: v })}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>{editId ? 'Update' : 'Create'}</Text>
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
          <Text style={styles.headerTitle}>👥 Customers</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={customers}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c4622d" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}
        renderItem={({ item: customer }) => (
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>
                  {customer.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customer.name}</Text>
                {customer.contactName ? (
                  <Text style={styles.customerMeta}>{customer.contactName}</Text>
                ) : null}
                {customer.email ? (
                  <Text style={styles.customerMeta}>{customer.email}</Text>
                ) : null}
                {customer.phone ? (
                  <Text style={styles.customerMeta}>{customer.phone}</Text>
                ) : null}
              </View>
            </View>

            {customer.createdBy && (
              <Text style={styles.customerAttribution}>Added by: {customer.createdBy.name}</Text>
            )}

            <View style={styles.customerStats}>
              <View style={styles.customerStat}>
                <Text style={styles.customerStatValue}>{customer._count?.products || 0}</Text>
                <Text style={styles.customerStatLabel}>Products</Text>
              </View>
              <View style={styles.customerStat}>
                <Text style={styles.customerStatValue}>{customer._count?.orders || 0}</Text>
                <Text style={styles.customerStatLabel}>Orders</Text>
              </View>
            </View>

            <View style={styles.customerActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(customer)}>
                <Text style={styles.editBtnText}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(customer.id)}>
                <Text style={styles.delBtnText}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No customers yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
              <Text style={styles.emptyBtnText}>Add Customer</Text>
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

  customerCard: {
    backgroundColor: '#1e1e1c', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#2e2e2b',
  },
  customerHeader: { flexDirection: 'row', gap: 14 },
  customerAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#c4622d',
    alignItems: 'center', justifyContent: 'center',
  },
  customerAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  customerInfo: { flex: 1 },
  customerName: { color: '#f0ede3', fontSize: 15, fontWeight: '600' },
  customerMeta: { color: '#6a6860', fontSize: 13, marginTop: 1 },
  customerAttribution: { color: '#c4622d', fontSize: 11, marginTop: 8, fontStyle: 'italic' },

  customerStats: { flexDirection: 'row', gap: 20, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2e2e2b' },
  customerStat: { alignItems: 'center' },
  customerStatValue: { color: '#f0ede3', fontSize: 18, fontWeight: '700' },
  customerStatLabel: { color: '#6a6860', fontSize: 11 },

  customerActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: { flex: 1, backgroundColor: 'rgba(196,98,45,0.15)', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  editBtnText: { color: '#c4622d', fontSize: 13, fontWeight: '600' },
  delBtn: { flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  delBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1e1e1c', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { color: '#f0ede3', fontSize: 20, fontWeight: '700' },
  modalClose: { color: '#a8a498', fontSize: 24, padding: 4 },
  formLabel: { color: '#a8a498', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#131312', color: '#f0ede3', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#2e2e2b',
  },
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

