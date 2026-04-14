import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';

export const AuthContext = createContext();

// Switch this to true when building for the live app/Play Store
const IS_PROD = false; 

export const API_BASE = IS_PROD
    ? 'https://sandigan-carwash-carrental-akd8a6cde6hpg4cc.japaneast-01.azurewebsites.net/api'
    : 'http://192.168.100.254:4000/api';


export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSplashLoading, setIsSplashLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    // Initial check for logged in user
    useEffect(() => {
        isLoggedIn();
    }, []);

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/customer-auth/login`, { email, password });

            const userInfo = res.data;
            setUserInfo(userInfo);
            setUserToken(userInfo.token);

            await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
            await AsyncStorage.setItem('userToken', userInfo.token);

            // Set default headers for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${userInfo.token}`;
            return { success: true };
        } catch (err) {
            const message = err.response?.data?.error || err.message;
            return { success: false, message };
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (firstName, lastName, email, phone, password) => {
        setIsLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/customer-auth/register`, {
                firstName, lastName, email, phone, password
            });

            const userInfo = res.data;
            setUserInfo(userInfo);
            setUserToken(userInfo.token);

            await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
            await AsyncStorage.setItem('userToken', userInfo.token);

            axios.defaults.headers.common['Authorization'] = `Bearer ${userInfo.token}`;
            return { success: true };
        } catch (err) {
            const message = err.response?.data?.error || err.message;
            return { success: false, message };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        setUserToken(null);
        setUserInfo(null);
        await AsyncStorage.removeItem('userInfo');
        await AsyncStorage.removeItem('userToken');
        delete axios.defaults.headers.common['Authorization'];
        setIsLoading(false);
    };

    const isLoggedIn = async () => {
        try {
            setIsSplashLoading(true);
            let userInfo = await AsyncStorage.getItem('userInfo');
            let userToken = await AsyncStorage.getItem('userToken');

            if (userInfo && userToken) {
                setUserInfo(JSON.parse(userInfo));
                setUserToken(userToken);
                axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
            }
        } catch (error) {
            console.log(`isLogged in error ${error}`);
        } finally {
            setIsSplashLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ login, logout, register, isLoading, isSplashLoading, userToken, userInfo }}>
            {children}
        </AuthContext.Provider>
    );
};
