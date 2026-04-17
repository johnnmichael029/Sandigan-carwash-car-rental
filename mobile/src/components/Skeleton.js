import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

const Skeleton = ({ width, height, borderRadius = 8, style, isDarkMode }) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.8,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [opacity]);

    const backgroundColor = isDarkMode ? '#334155' : '#e2e8f0'; // slate-700 for dark, slate-200 for light

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor,
                    opacity,
                },
                style,
            ]}
        />
    );
};

export default Skeleton;
