import React, { useContext } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Alert, SafeAreaView,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const MeScreen = () => {
    const { userInfo, logout } = useContext(AuthContext);
    const { COLORS, isDarkMode } = useContext(ThemeContext);
    const styles = getStyles(COLORS);

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

                {/* ── Info Card ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Account Details</Text>

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

const getStyles = (COLORS) => StyleSheet.create({
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
    cardTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#23A0CE',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 4,
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
});

export default MeScreen;
