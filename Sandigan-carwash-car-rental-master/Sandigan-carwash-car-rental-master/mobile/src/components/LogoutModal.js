import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

const logOutIcon = require('../../assets/icon/log-out.png');

const LogoutModal = ({ 
    visible, 
    onClose, 
    onConfirm, 
    title = "Ready to leave?", 
    subtitle = "Sign out of your account.", 
    cancelText = "Cancel", 
    confirmText = "Sign Out" 
}) => {
    const { COLORS } = useContext(ThemeContext);
    const styles = getStyles(COLORS);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.logoutModalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={styles.logoutModalContent}>
                    <View style={styles.logoutIconContainer}>
                        <Image source={logOutIcon} style={styles.logoutModalIcon} resizeMode="contain" />
                    </View>
                    <Text style={styles.logoutModalTitle}>{title}</Text>
                    <Text style={styles.logoutModalSubtitle}>{subtitle}</Text>

                    <View style={styles.logoutModalActions}>
                        <TouchableOpacity style={styles.logoutBtnCancel} onPress={onClose}>
                            <Text style={styles.logoutCancelText}>{cancelText}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.logoutBtnConfirm} onPress={() => {
                            onClose();
                            onConfirm();
                        }}>
                            <Text style={styles.logoutConfirmText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const getStyles = (COLORS) => StyleSheet.create({
    logoutModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    logoutModalContent: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: COLORS.cardBackground,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    logoutIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ef444415',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoutModalIcon: {
        width: 28,
        height: 28,
        tintColor: '#ef4444',
    },
    logoutModalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 8,
    },
    logoutModalSubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    logoutModalActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    logoutBtnCancel: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    logoutBtnConfirm: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutCancelText: {
        color: COLORS.text,
        fontWeight: '700',
        fontSize: 15,
        textAlign: 'center'
    },
    logoutConfirmText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
        textAlign: 'center'
    },
});

export default LogoutModal;
