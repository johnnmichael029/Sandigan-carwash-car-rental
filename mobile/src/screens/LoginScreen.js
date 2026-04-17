import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const showIcon = require('../../assets/icon/show.png');
const hideIcon = require('../../assets/icon/hide.png');
const loginIcon = require('../../assets/icon/log-in.png');
const LoginScreen = ({ navigation }) => {
    const { login, employeeLogin, isLoading } = useContext(AuthContext);
    const { COLORS } = useContext(ThemeContext);

    const [loginMode, setLoginMode] = useState('customer'); // 'customer' or 'employee'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const styles = getStyles(COLORS);

    const handleLogin = async () => {
        setErrorMessage('');

        let result;
        if (loginMode === 'employee') {
            result = await employeeLogin(email, password);
        } else {
            result = await login(email, password);
        }

        if (!result.success) {
            setErrorMessage(result.message);
            setPassword(''); // specifically clears password if login failed

            // Auto dismiss the error block after 3 seconds
            setTimeout(() => {
                setErrorMessage('');
            }, 3000);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>SANDIGAN</Text>
                <Text style={styles.subtitle}>CARWASH & RENTAL</Text>
                <View style={styles.brandLine} />
            </View>

            <View style={styles.formContainer}>
                {/* LOGIN MODE TOGGLE */}
                <View style={styles.modeToggleContainer}>
                    <TouchableOpacity
                        style={[styles.modeToggleBtn, loginMode === 'customer' && { backgroundColor: COLORS.primary }]}
                        onPress={() => { setLoginMode('customer'); setErrorMessage(''); }}
                    >
                        <Text style={[styles.modeToggleText, loginMode === 'customer' && { color: '#fff', fontWeight: 'bold' }]}>Customer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeToggleBtn, loginMode === 'employee' && { backgroundColor: COLORS.primary }]}
                        onPress={() => { setLoginMode('employee'); setErrorMessage(''); }}
                    >
                        <Text style={[styles.modeToggleText, loginMode === 'employee' && { color: '#fff', fontWeight: 'bold' }]}>Detailer</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.welcomeText}>
                    {loginMode === 'employee' ? 'Detailer Portal' : 'Welcome Back'}
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
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
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator color={COLORS.buttonText} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Signing in...</Text>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Text style={styles.buttonText}>SIGN IN</Text>
                            <Image
                                source={loginIcon}
                                style={styles.signInIcon}
                            />
                        </View>
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
                    <Text style={styles.footerText}>
                        {loginMode === 'employee' ? 'Need an account? Contact Admin' : "Don't have an account? "}
                    </Text>
                    {loginMode === 'customer' && (
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.linkText}>Register here</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const getStyles = (COLORS) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
        letterSpacing: 4,
        marginTop: 4,
    },
    brandLine: {
        width: 80,
        height: 2,
        backgroundColor: COLORS.primaryAccent,
        marginTop: 16,
    },
    formContainer: {
        width: '100%',
        backgroundColor: COLORS.cardBackground,
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    modeToggleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.inputBackground,
        borderRadius: 8,
        padding: 4,
        marginBottom: 24,
    },
    modeToggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 6,
    },
    modeToggleText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 24,
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
        tintColor: COLORS.text,
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
        marginTop: 8,
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
    },
    footerText: {
        color: COLORS.textMuted,
        fontSize: 14,
    },
    linkText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },
    signInIcon: {
        width: 16,
        height: 16,
        tintColor: COLORS.buttonText,
    }
});

export default LoginScreen;
