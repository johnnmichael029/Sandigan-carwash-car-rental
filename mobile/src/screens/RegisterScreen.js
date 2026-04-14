import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const showIcon = require('../../assets/icon/show.png');
const hideIcon = require('../../assets/icon/hide.png');

const RegisterScreen = ({ navigation }) => {
    const { register, isLoading } = useContext(AuthContext);
    const { COLORS } = useContext(ThemeContext);
    
    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const styles = getStyles(COLORS);

    const handleRegister = async () => {
        setErrorMessage('');
        const result = await register(firstName, lastName, email, phone, password);
        if (!result.success) {
            setErrorMessage(result.message);
            setPassword(''); // specifically clears password if registration failed

            // Auto dismiss the error block after 3 seconds
            setTimeout(() => {
                setErrorMessage('');
            }, 3000);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>JOIN US</Text>
                <View style={styles.brandLine} />
            </View>

            <View style={styles.formContainer}>
                <Text style={styles.subtitle}>Create your Sandigan account</Text>
                
                <View style={styles.row}>
                    <TextInput 
                        style={[styles.input, { flex: 1, marginRight: 8 }]}
                        placeholder="First Name"
                        placeholderTextColor={COLORS.textMuted}
                        value={firstName}
                        onChangeText={setFirstName}
                    />
                    <TextInput 
                        style={[styles.input, { flex: 1, marginLeft: 8 }]}
                        placeholder="Last Name"
                        placeholderTextColor={COLORS.textMuted}
                        value={lastName}
                        onChangeText={setLastName}
                    />
                </View>

                <TextInput 
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput 
                    style={styles.input}
                    placeholder="Phone Number (11 digits)"
                    placeholderTextColor={COLORS.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={11}
                />

                <View style={styles.passwordContainer}>
                    <TextInput 
                        style={styles.passwordInput}
                        placeholder="Password"
                        placeholderTextColor={COLORS.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity 
                        style={styles.iconToggle} 
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Image 
                            source={showPassword ? hideIcon : showIcon} 
                            style={styles.iconImage} 
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={handleRegister}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator color={COLORS.buttonText} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Creating Account...</Text>
                        </View>
                    ) : (
                        <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
                    )}
                </TouchableOpacity>

                {errorMessage ? (
                    <View style={styles.errorBlock}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                        <TouchableOpacity onPress={() => setErrorMessage('')}>
                            <Ionicons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ) : null}

                <View style={styles.footerRow}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.linkText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const getStyles = (COLORS) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContainer: {
        padding: 24,
        paddingTop: 60,
        minHeight: '100%',
        justifyContent: 'center',
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: 2,
    },
    brandLine: {
        width: 60,
        height: 2,
        backgroundColor: COLORS.primaryAccent,
        marginTop: 12,
    },
    formContainer: {
        width: '100%',
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textMuted,
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        width: '100%',
    },
    input: {
        backgroundColor: COLORS.inputBackground,
        borderColor: COLORS.inputBorder,
        borderWidth: 1,
        borderRadius: 8,
        color: COLORS.text,
        padding: 16,
        marginBottom: 16,
        fontSize: 16,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBackground,
        borderColor: COLORS.inputBorder,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 16,
    },
    passwordInput: {
        flex: 1,
        color: COLORS.text,
        padding: 16,
        fontSize: 16,
    },
    iconToggle: {
        padding: 16,
    },
    iconImage: {
        width: 20,
        height: 20,
        tintColor: COLORS.textMuted,
    },
    primaryButton: {
        backgroundColor: COLORS.primaryButton,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
    },
    buttonText: {
        color: COLORS.buttonText,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    errorBlock: {
        backgroundColor: '#ef4444',
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    errorText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
        marginBottom: 40,
    },
    footerText: {
        color: COLORS.textMuted,
        fontSize: 14,
    },
    linkText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: 'bold',
    }
});

export default RegisterScreen;
