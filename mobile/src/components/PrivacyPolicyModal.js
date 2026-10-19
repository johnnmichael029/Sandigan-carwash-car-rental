import React, { useState, useContext } from 'react';
import {
    Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

const PRIVACY_POLICY_TEXT = `SANDIGAN CARWASH & CAR RENTAL – PRIVACY POLICY

Last Updated: October 2024

1. INFORMATION WE COLLECT
We collect information you provide when booking our services, including your name, email address, phone number, vehicle information, and location data. We may also collect payment-related information such as GCash reference numbers and payment screenshots.

2. HOW WE USE YOUR INFORMATION
Your information is used to:
• Process and confirm your booking or rental reservation
• Send booking confirmations and status updates
• Improve our services and customer experience
• Comply with legal obligations
• Contact you regarding your bookings

3. DATA SHARING
We do not sell, trade, or rent your personal information to third parties. Your data may be shared with our service staff strictly for the purpose of fulfilling your booking.

4. DATA SECURITY
We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

5. YOUR RIGHTS
You have the right to:
• Access your personal data
• Request correction of inaccurate data
• Request deletion of your data
• Withdraw consent at any time

6. COOKIES & TRACKING
Our mobile application may use local storage to maintain your session and preferences. No third-party advertising trackers are used.

7. RETENTION
We retain your booking data for a period necessary to fulfill the services and comply with legal requirements.

8. CONTACT US
If you have any questions about this Privacy Policy, please contact us:
Sandigan Carwash & Car Rental
Email: sandigan.support@gmail.com
Address: 68 Ruhale St. Taguig, 1630 Metro Manila
Phone Number: 0956 691 8854

By checking the box below, you confirm that you have read, understood, and agree to this Privacy Policy.`;

const PrivacyPolicyModal = ({ visible, onClose, onAccept }) => {
    const { COLORS } = useContext(ThemeContext);
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

    const handleScroll = ({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const paddingToBottom = 30;
        const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
        if (isNearBottom) setHasScrolledToBottom(true);
    };

    const handleClose = () => {
        setHasScrolledToBottom(false);
        onClose();
    };

    const handleAccept = () => {
        setHasScrolledToBottom(false);
        onAccept();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: COLORS.cardBackground }]}>
                    <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
                        <Text style={[styles.title, { color: COLORS.text }]}>🔒 Privacy Policy</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14 }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    {!hasScrolledToBottom && (
                        <View style={[styles.scrollHint, { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary + '40' }]}>
                            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>
                                📜 Scroll to the bottom to accept
                            </Text>
                        </View>
                    )}
                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator
                        onScroll={handleScroll}
                        scrollEventThrottle={50}
                        onContentSizeChange={(w, contentHeight) => {
                            const windowHeight = Dimensions.get('window').height;
                            if (contentHeight <= windowHeight * 0.55) {
                                setHasScrolledToBottom(true);
                            }
                        }}
                    >
                        <Text style={[styles.policyText, { color: COLORS.text }]}>{PRIVACY_POLICY_TEXT}</Text>
                        <View style={{ height: 30 }} />
                    </ScrollView>
                    <View style={[styles.footer, { borderTopColor: COLORS.border }]}>
                        <TouchableOpacity
                            style={[styles.acceptBtn, { backgroundColor: hasScrolledToBottom ? COLORS.primary : COLORS.border }]}
                            onPress={hasScrolledToBottom ? handleAccept : null}
                            disabled={!hasScrolledToBottom}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.acceptBtnText, { color: hasScrolledToBottom ? '#fff' : COLORS.textMuted }]}>
                                {hasScrolledToBottom ? '✓ I Agree to the Privacy Policy' : 'Scroll down to accept'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: Math.round(windowHeight * 0.82), paddingBottom: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1 },
    title: { fontSize: 18, fontWeight: '800' },
    scrollHint: { marginHorizontal: 20, marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    scrollArea: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
    policyText: { fontSize: 14, lineHeight: 22 },
    footer: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
    acceptBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    acceptBtnText: { fontSize: 15, fontWeight: '700' },
});

export default PrivacyPolicyModal;
