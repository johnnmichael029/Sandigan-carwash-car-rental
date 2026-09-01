import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme/colors';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Default to 'light' per user's request for the login/register screen
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('appTheme');
            if (savedTheme === 'dark') {
                setIsDarkMode(true);
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        await AsyncStorage.setItem('appTheme', newTheme ? 'dark' : 'light');
    };

    const COLORS = isDarkMode ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, COLORS }}>
            {children}
        </ThemeContext.Provider>
    );
};
