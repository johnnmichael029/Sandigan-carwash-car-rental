import React, { useContext, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Alert, Image, Modal, TextInput, ActivityIndicator,
    KeyboardAvoidingView, Platform, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_BASE } from '../api/config';
import axios from 'axios';
import Toast from 'react-native-toast-message';

const MeScreen = () => {
    const { userInfo, logout, fetchCurrentUser } = useContext(AuthContext);
    const { COLORS, isDarkMode } = useContext(ThemeContext);
    const styles = getStyles(COLORS, isDarkMode);

    // Edit Profile State
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editFirstName, setEditFirstName] = useState(userInfo?.firstName || '');
    const [editLastName, setEditLastName] = useState(userInfo?.lastName || '');
    const [editPhone, setEditPhone] = useState(userInfo?.phone || '');

    const handleOpenEdit = () => {
        setEditFirstName(userInfo?.firstName || '');
        setEditLastName(userInfo?.lastName || '');
        setEditPhone(userInfo?.phone || '');
        setIsEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
        if (!editFirstName.trim() || !editLastName.trim() || !editPhone.trim()) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'All fields are required.' });
            return;
        }
        setIsSaving(true);
        try {
            await axios.put(`${API_BASE}/customer-auth/profile`, {
                firstName: editFirstName.trim(),
                lastName: editLastName.trim(),
                phone: editPhone.trim()
            });
            await fetchCurrentUser();
            setIsEditModalVisible(false);
            Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated successfully.', backgroundC: COLORS.background });
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update profile.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
            ]
        );
    };

    const initials = `${userInfo?.firstName?.[0] || ''}${userInfo?.lastName?.[0] || ''}`.toUpperCase();
    const fullName = `${userInfo?.firstName || ''} ${userInfo?.lastName || ''}`.trim();

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <Text style={styles.fullName}>{fullName}</Text>
                    <Text style={styles.email}>{userInfo?.email}</Text>
                </View>



                {/* ── SMC Membership Card ── */}
                {userInfo?.hasSMC && userInfo?.smcId ? (
                    <View style={styles.smcContainer}>
                        <LinearGradient
                            colors={['#1e293b', '#0f172a', '#000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.smcCard}
                        >
                            <View style={styles.smcHeader}>
                                <Text style={styles.smcTitle}>SANDIGAN</Text>
                                <Text style={styles.smcSubtitle}>PREMIUM VIP</Text>
                            </View>

                            <View style={styles.smcBody}>
                                <View style={styles.smcInfo}>
                                    <Text style={styles.smcLabel}>MEMBER NAME</Text>
                                    <Text style={styles.smcValue}>{fullName.toUpperCase()}</Text>

                                    <Text style={[styles.smcLabel, { marginTop: 12 }]}>MEMBERSHIP ID</Text>
                                    <Text style={styles.smcIdValue}>{userInfo.smcId}</Text>
                                </View>

                                <View style={styles.qrContainer}>
                                    <QRCode
                                        value={userInfo.smcId}
                                        size={70}
                                        color="#000"
                                        backgroundColor="#fff"
                                    />
                                </View>
                            </View>

                            {userInfo.smcExpiryDate && (
                                <Text style={styles.smcExpiry}>VALID THRU: {new Date(userInfo.smcExpiryDate).toLocaleDateString()}</Text>
                            )}
                        </LinearGradient>
                    </View>
                ) : (
                    <View style={styles.smcPromoContainer}>
                        <View style={styles.smcPromoLeft}>
                            <Text style={styles.smcPromoTitle}>Unlock Premium Perks!</Text>
                            <Text style={styles.smcPromoDesc}>Get unlimited discounts with SMC.</Text>
                        </View>
                        <TouchableOpacity style={styles.smcPromoBtn}>
                            <Text style={styles.smcPromoBtnText}>Apply Now</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Info Card ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Account Details</Text>
                        <TouchableOpacity onPress={handleOpenEdit}>
                            <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                    </View>

                    <InfoRow label="First Name" value={userInfo?.firstName} COLORS={COLORS} />
                    <InfoRow label="Last Name" value={userInfo?.lastName} COLORS={COLORS} />
                    <InfoRow label="Email" value={userInfo?.email} COLORS={COLORS} />
                    <InfoRow label="Phone" value={userInfo?.phone || '—'} COLORS={COLORS} last />
                </View>

                {/* ── Sign Out ── */}
                <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Sandigan Carwash & Rental · v1.0</Text>
            </ScrollView>

            {/* ── Edit Profile Modal ── */}
            <Modal visible={isEditModalVisible} animationType="fade" transparent={true} onRequestClose={() => setIsEditModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setIsEditModalVisible(false)}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ width: '100%', justifyContent: 'flex-end' }}
                    >
                        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Update Profile</Text>
                            <Text style={styles.modalSubtitle}>Keep your contact information up to date.</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>First Name</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editFirstName}
                                    onChangeText={setEditFirstName}
                                    placeholder="Enter first name"
                                    placeholderTextColor={COLORS.textMuted}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Last Name</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editLastName}
                                    onChangeText={setEditLastName}
                                    placeholder="Enter last name"
                                    placeholderTextColor={COLORS.textMuted}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Phone Number</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editPhone}
                                    onChangeText={setEditPhone}
                                    keyboardType="phone-pad"
                                    placeholder="Enter phone number"
                                    placeholderTextColor={COLORS.textMuted}
                                    maxLength={11}
                                />
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setIsEditModalVisible(false)}
                                    disabled={isSaving}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalSaveBtn}
                                    onPress={handleSaveProfile}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.modalSaveText}>Save Changes</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const InfoRow = ({ label, value, COLORS, last }) => (
    <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: COLORS.border,
    }}>
        <Text style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: '500' }}>{label}</Text>
        <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }}>{value || '—'}</Text>
    </View>
);

const getStyles = (COLORS, isDarkMode) => StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        padding: 20,
        paddingBottom: 48,
    },
    header: {
        alignItems: 'center',
        paddingTop: 28,
        paddingBottom: 28,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#23A0CE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
        shadowColor: '#23A0CE',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 1,
    },
    fullName: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    email: {
        fontSize: 13,
        color: COLORS.textMuted,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#23A0CE',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    editBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#23A0CE',
    },
    signOutBtn: {
        backgroundColor: '#ef4444',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#ef4444',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    signOutText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    version: {
        textAlign: 'center',
        fontSize: 11,
        color: COLORS.textMuted,
        opacity: 0.5,
    },
    // SMC Card Styles
    smcContainer: {
        marginBottom: 24,
        shadowColor: '#23A0CE',
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    smcCard: {
        borderRadius: 16,
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    smcHeader: {
        marginBottom: 20,
    },
    smcTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 3,
    },
    smcSubtitle: {
        color: '#23A0CE',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },
    smcBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    smcInfo: {
        flex: 1,
    },
    smcLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 2,
    },
    smcValue: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 1,
    },
    smcIdValue: {
        color: '#23A0CE',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 2,
    },
    qrContainer: {
        backgroundColor: '#fff',
        padding: 6,
        borderRadius: 8,
    },
    smcExpiry: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '500',
        marginTop: 15,
        textAlign: 'right',
        letterSpacing: 1,
    },
    smcPromoContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#23A0CE',
        borderStyle: 'dashed',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    smcPromoLeft: {
        flex: 1,
        marginRight: 10,
    },
    smcPromoTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    smcPromoDesc: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    smcPromoBtn: {
        backgroundColor: '#23A0CE',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    smcPromoBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: isDarkMode ? '#1e293b' : '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 48 : 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 25,
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: COLORS.border,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 13,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: 28,
    },
    inputGroup: {
        marginBottom: 18,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#23A0CE',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    modalInput: {
        backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 15,
        fontSize: 15,
        color: COLORS.text,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        gap: 12,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    modalSaveBtn: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: '#23A0CE',
        alignItems: 'center',
        shadowColor: '#23A0CE',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    modalSaveText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});

export default MeScreen;
