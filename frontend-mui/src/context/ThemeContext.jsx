import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { lightTheme, darkTheme as muiDarkTheme } from '../theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Get initial theme from localStorage or default to light
    const [darkTheme, setDarkTheme] = useState(() => {
        const saved = localStorage.getItem('darkTheme');
        return saved ? JSON.parse(saved) : false;
    });

    // Save theme preference to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('darkTheme', JSON.stringify(darkTheme));
    }, [darkTheme]);

    const value = useMemo(() => ({ darkTheme, setDarkTheme }), [darkTheme]);
    const muiTheme = darkTheme ? muiDarkTheme : lightTheme;
    
    return (
        <ThemeContext.Provider value={value}>
            <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
        </ThemeContext.Provider>
    );
}

export function useThemeContext() {
    return useContext(ThemeContext);
} 