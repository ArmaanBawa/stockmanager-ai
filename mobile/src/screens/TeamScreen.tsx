/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, Modal, FlatList,
    TextInput, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useDrawer } from '../components/AppDrawer';
import { useAuth } from '../context/AuthContext';
import { TeamMember } from '../types';
import * as teamService from '../services/team';

export default function TeamScreen() {
    const { openDrawer } = useDrawer();
    const { user } = useAuth();
    const isOwner = user?.role === 'OWNER';

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Invite modal state
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);

    // Join modal state
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await teamService.getTeamMembers();
            setMembers(data);
        } catch (e: any) {
            console.error('Team load error:', e);
            Alert.alert('Error', e.message || 'Failed to load team members');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleGenerateInvite = async () => {
        setInviteLoading(true);
        try {
            const result = await teamService.generateInviteCode();
            setInviteCode(result.code);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to generate invite code');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleCopyCode = async () => {
        if (inviteCode) {
            await Clipboard.setStringAsync(inviteCode);
            Alert.alert('Copied!', 'Invite code copied to clipboard');
        }
    };

    const handleJoinTeam = async () => {
        if (!joinCode.trim()) return;
        setJoinLoading(true);
        try {
            const result = await teamService.joinTeam(joinCode.trim());
            Alert.alert('Success', result.message);
            setShowJoinModal(false);
            setJoinCode('');
            loadData();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to join team');
        } finally {
            setJoinLoading(false);
        }
    };

    const handleChangeRole = (member: TeamMember) => {
        const newRole = member.role === 'OWNER' ? 'MEMBER' : 'OWNER';
        Alert.alert(
            'Change Role',
            `Change ${member.name} to ${newRole}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            await teamService.updateMemberRole(member.id, newRole);
                            loadData();
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    },
                },
            ]
        );
    };

    const handleRemoveMember = (member: TeamMember) => {
        Alert.alert(
            'Remove Member',
            `Remove ${member.name} from the team? They will lose access to all shared data.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await teamService.removeMember(member.id);
                            loadData();
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#c4622d" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />

            {/* Invite Modal */}
            <Modal visible={showInviteModal} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ flex: 1 }} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Invite Team Member</Text>
                            <TouchableOpacity onPress={() => { setShowInviteModal(false); setInviteCode(null); }}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {inviteCode ? (
                            <View style={styles.codeContainer}>
                                <Text style={styles.codeLabel}>Share this code with your team member:</Text>
                                <Text style={styles.codeText}>{inviteCode}</Text>
                                <Text style={styles.codeExpiry}>Valid for 24 hours</Text>
                                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                                    <Text style={styles.copyBtnText}>📋 Copy Code</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.codeContainer}>
                                <Text style={styles.codeLabel}>
                                    Generate an invite code for a new team member to join your organization.
                                </Text>
                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={handleGenerateInvite}
                                    disabled={inviteLoading}
                                >
                                    {inviteLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Generate Invite Code</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Join Modal */}
            <Modal visible={showJoinModal} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ flex: 1 }} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Join Team</Text>
                            <TouchableOpacity onPress={() => { setShowJoinModal(false); setJoinCode(''); }}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.formLabel}>Enter the invite code shared by the team owner:</Text>
                        <TextInput
                            style={[styles.input, styles.codeInput]}
                            placeholder="e.g. A1B2C3"
                            placeholderTextColor="#6a6860"
                            value={joinCode}
                            onChangeText={setJoinCode}
                            autoCapitalize="characters"
                            maxLength={6}
                            returnKeyType="done"
                            onSubmitEditing={handleJoinTeam}
                        />
                        <TouchableOpacity
                            style={[styles.submitBtn, (!joinCode.trim() || joinLoading) && styles.submitBtnDisabled]}
                            onPress={handleJoinTeam}
                            disabled={!joinCode.trim() || joinLoading}
                        >
                            {joinLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>Join Team</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.menuBtn} onPress={openDrawer}>
                    <Text style={styles.menuIcon}>☰</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Team</Text>
                </View>
                {isOwner && (
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowInviteModal(true)}>
                        <Text style={styles.addBtnText}>+ Invite</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Join Team Button (for members or anyone) */}
            <View style={styles.joinRow}>
                <TouchableOpacity style={styles.joinBtn} onPress={() => setShowJoinModal(true)}>
                    <Text style={styles.joinBtnText}>🔗 Join another team</Text>
                </TouchableOpacity>
            </View>

            {/* Team Members List */}
            <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c4622d" />}
                renderItem={({ item: member }) => (
                    <View style={styles.memberCard}>
                        <View style={styles.memberRow}>
                            <View style={[styles.memberAvatar, member.role === 'OWNER' && styles.ownerAvatar]}>
                                <Text style={styles.memberAvatarText}>
                                    {member.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.memberInfo}>
                                <View style={styles.memberNameRow}>
                                    <Text style={styles.memberName}>{member.name}</Text>
                                    {member.id === user?.id && (
                                        <View style={styles.youBadge}>
                                            <Text style={styles.youBadgeText}>You</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.memberEmail}>{member.email}</Text>
                            </View>
                            <View style={[styles.roleBadge, member.role === 'OWNER' ? styles.ownerBadge : styles.memberBadge]}>
                                <Text style={[styles.roleBadgeText, member.role === 'OWNER' ? styles.ownerBadgeText : styles.memberBadgeText]}>
                                    {member.role}
                                </Text>
                            </View>
                        </View>

                        {isOwner && member.id !== user?.id && (
                            <View style={styles.memberActions}>
                                <TouchableOpacity
                                    style={styles.roleBtn}
                                    onPress={() => handleChangeRole(member)}
                                >
                                    <Text style={styles.roleBtnText}>
                                        {member.role === 'OWNER' ? '⬇ Make Member' : '⬆ Make Owner'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.removeBtn}
                                    onPress={() => handleRemoveMember(member)}
                                >
                                    <Text style={styles.removeBtnText}>🗑️ Remove</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No team members yet</Text>
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

    joinRow: { paddingHorizontal: 16, paddingVertical: 10 },
    joinBtn: {
        backgroundColor: 'rgba(196,98,45,0.1)', borderWidth: 1, borderColor: '#c4622d',
        borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderStyle: 'dashed',
    },
    joinBtnText: { color: '#c4622d', fontSize: 14, fontWeight: '600' },

    // Member card
    memberCard: {
        backgroundColor: '#1e1e1c', borderRadius: 14, padding: 16, marginBottom: 10,
        borderWidth: 1, borderColor: '#2e2e2b',
    },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    memberAvatar: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#3e3e3a',
        alignItems: 'center', justifyContent: 'center',
    },
    ownerAvatar: { backgroundColor: '#c4622d' },
    memberAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    memberInfo: { flex: 1 },
    memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    memberName: { color: '#f0ede3', fontSize: 15, fontWeight: '600' },
    memberEmail: { color: '#6a6860', fontSize: 13, marginTop: 1 },
    youBadge: {
        backgroundColor: 'rgba(59,130,246,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    },
    youBadgeText: { color: '#3b82f6', fontSize: 10, fontWeight: '700' },
    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    ownerBadge: { backgroundColor: 'rgba(196,98,45,0.2)' },
    memberBadge: { backgroundColor: 'rgba(107,114,128,0.2)' },
    roleBadgeText: { fontSize: 11, fontWeight: '700' },
    ownerBadgeText: { color: '#c4622d' },
    memberBadgeText: { color: '#6b7280' },

    memberActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2e2e2b' },
    roleBtn: { flex: 1, backgroundColor: 'rgba(196,98,45,0.15)', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    roleBtnText: { color: '#c4622d', fontSize: 13, fontWeight: '600' },
    removeBtn: { flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    removeBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#1e1e1c', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
    },
    modalTitle: { color: '#f0ede3', fontSize: 20, fontWeight: '700' },
    modalClose: { color: '#a8a498', fontSize: 24, padding: 4 },
    formLabel: { color: '#a8a498', fontSize: 13, fontWeight: '600', marginBottom: 12 },
    input: {
        backgroundColor: '#131312', color: '#f0ede3', borderRadius: 10, paddingHorizontal: 14,
        paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#2e2e2b',
    },
    codeInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center', paddingVertical: 16 },
    submitBtn: {
        backgroundColor: '#c4622d', borderRadius: 12, paddingVertical: 14,
        alignItems: 'center', marginTop: 20, marginBottom: 20,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Invite code display
    codeContainer: { alignItems: 'center', paddingVertical: 12 },
    codeLabel: { color: '#a8a498', fontSize: 14, textAlign: 'center', marginBottom: 20 },
    codeText: {
        color: '#f0ede3', fontSize: 36, fontWeight: '800', letterSpacing: 8,
        backgroundColor: '#131312', paddingHorizontal: 24, paddingVertical: 16,
        borderRadius: 14, borderWidth: 1, borderColor: '#c4622d', overflow: 'hidden',
    },
    codeExpiry: { color: '#6a6860', fontSize: 12, marginTop: 12 },
    copyBtn: {
        backgroundColor: 'rgba(196,98,45,0.15)', paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 10, marginTop: 20,
    },
    copyBtnText: { color: '#c4622d', fontSize: 14, fontWeight: '600' },

    emptyState: {
        backgroundColor: '#1e1e1c', borderRadius: 12, padding: 24, alignItems: 'center',
        borderWidth: 1, borderColor: '#2e2e2b', marginTop: 20,
    },
    emptyText: { color: '#a8a498', fontSize: 14 },
});
