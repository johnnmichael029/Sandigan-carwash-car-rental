import React, { useState, useContext } from 'react';
import {
    Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

const RENTAL_TERMS_TEXT = `SANDIGAN CAR RENTAL – TERMS & CONDITIONS

Last Updated: October 2024

RENTAL REQUIREMENTS
Before you may take possession of the rented vehicle, you must present the following at our office:
• Valid Professional Driver's License (original + photocopy)
• 1 Additional Valid Government-Issued ID
• Latest Proof of Billing (must match your ID address)
• Security Deposit of ₱5,000 (refundable upon safe return)

DRIVER ELIGIBILITY
• The primary driver must be at least 21 years of age.
• The driver's license must be valid and not expired at the time of rental.
• A Professional Driver's License is strictly required for all rentals.

PAYMENT & DOWN PAYMENT
• A non-refundable down payment is required to confirm your reservation.
• The remaining balance must be settled before vehicle pick-up.
• Accepted payment methods: GCash, bank transfer, or cash at the counter.

VEHICLE USE & RESTRICTIONS
• The rented vehicle must be used only for lawful purposes within the Philippines.
• Driving under the influence of alcohol or illegal substances is strictly prohibited.
• Sub-renting or lending the vehicle to any third party is not allowed.
• Off-road use is not permitted unless specifically agreed upon in writing.

FUEL POLICY
• The vehicle will be provided with a full tank. It must be returned with the same fuel level.
• Any fuel deficit will be charged to the renter at prevailing market rates.

DAMAGE & LIABILITY
• The renter is fully responsible for any damage, loss, or theft of the vehicle during the rental period.
• Damage caused by negligence, accidents, or violation of these terms will be charged to the renter.
• The security deposit may be forfeited in full or in part to cover damages.

RETURN POLICY
• The vehicle must be returned on or before the agreed return date and time.
• Late returns are subject to additional charges per day based on the daily rental rate.
• The vehicle must be returned to the same location unless otherwise agreed.

CANCELLATION POLICY
• Cancellations made at least 48 hours before the pickup date will receive a partial refund.
• Cancellations within 48 hours of pickup are non-refundable.
• No-shows are considered automatic cancellations with no refund.

ACCIDENTS & EMERGENCIES
• In case of an accident, immediately contact local authorities and notify Sandigan.
• Do not leave the scene of an accident. Obtain a police report.
• Emergency contact: +63 XXX XXX XXXX

GOVERNING LAW
• This agreement is governed by the laws of the Republic of the Philippines.
• Any disputes shall be resolved through mediation before legal action.

By accepting, you confirm that you have read, understood, and agree to these Terms and Conditions.`;

const RentalTermsModal = ({ visible, onClose, onAccept }) => {
    const { COLORS } = useContext(ThemeContext);
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

    const handleScroll = ({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
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
                        <Text style={[styles.title, { color: COLORS.text }]}>📋 Rental Terms & Conditions</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14 }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    {!hasScrolledToBottom && (
                        <View style={[styles.scrollHint, { backgroundColor: '#f59e0b20', borderColor: '#f59e0b50' }]}>
                            <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '600' }}>
                                📜 Please read all terms before accepting
                            </Text>
                        </View>
                    )}
                    <ScrollView
                        style={styles.scrollArea}
                        showsVerticalScrollIndicator
                        onScroll={handleScroll}
                        scrollEventThrottle={100}
                    >
                        <Text style={[styles.policyText, { color: COLORS.text }]}>{RENTAL_TERMS_TEXT}</Text>
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
                                {hasScrolledToBottom ? '✓ I Accept the Rental Terms & Conditions' : 'Scroll down to accept'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1 },
    title: { fontSize: 17, fontWeight: '800' },
    scrollHint: { marginHorizontal: 20, marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    scrollArea: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
    policyText: { fontSize: 13, lineHeight: 21 },
    footer: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
    acceptBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    acceptBtnText: { fontSize: 15, fontWeight: '700' },
});

export default RentalTermsModal;
