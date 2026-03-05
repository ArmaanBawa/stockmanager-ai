import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    FlatList,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Option {
    id: string;
    name: string;
    [key: string]: any;
}

interface SearchableSelectProps {
    label: string;
    options: Option[];
    selectedId: string;
    onSelect: (id: string) => void;
    placeholder?: string;
}

export default function SearchableSelect({
    label,
    options,
    selectedId,
    onSelect,
    placeholder = 'Select an option...',
}: SearchableSelectProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const selectedOption = options.find((o) => o.id === selectedId);

    const filteredOptions = options.filter((o) =>
        o.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (id: string) => {
        onSelect(id);
        setModalVisible(false);
        setSearchQuery('');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={styles.trigger}
                onPress={() => setModalVisible(true)}
            >
                <Text style={[styles.triggerText, !selectedOption && styles.placeholderText]}>
                    {selectedOption ? selectedOption.name : placeholder}
                </Text>
                <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.modalOverlay} edges={['bottom', 'top']}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search..."
                            placeholderTextColor="#6a6860"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />

                        <FlatList
                            data={filteredOptions}
                            keyExtractor={(item) => item.id}
                            initialNumToRender={15}
                            maxToRenderPerBatch={10}
                            windowSize={10}
                            removeClippedSubviews={true}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        selectedId === item.id && styles.optionItemActive,
                                    ]}
                                    onPress={() => handleSelect(item.id)}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            selectedId === item.id && styles.optionTextActive,
                                        ]}
                                    >
                                        {item.name}
                                    </Text>
                                    {selectedId === item.id && (
                                        <Text style={styles.checkIcon}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No matches found</Text>
                                </View>
                            }
                        />
                    </View>
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        color: '#a8a498',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    trigger: {
        backgroundColor: '#1e1e1c',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#2e2e2b',
    },
    triggerText: {
        color: '#f0ede3',
        fontSize: 14,
    },
    placeholderText: {
        color: '#6a6860',
    },
    chevron: {
        color: '#6a6860',
        fontSize: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e1e1c',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: '#f0ede3',
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        color: '#a8a498',
        fontSize: 20,
        padding: 4,
    },
    searchInput: {
        backgroundColor: '#131312',
        color: '#f0ede3',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2e2e2b',
    },
    optionItem: {
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#2e2e2b',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    optionItemActive: {
        backgroundColor: 'rgba(196,98,45,0.1)',
    },
    optionText: {
        color: '#a8a498',
        fontSize: 15,
    },
    optionTextActive: {
        color: '#c4622d',
        fontWeight: '600',
    },
    checkIcon: {
        color: '#c4622d',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyState: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#6a6860',
        fontSize: 14,
    },
});
