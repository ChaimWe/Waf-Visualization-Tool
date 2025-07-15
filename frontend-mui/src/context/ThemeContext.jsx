import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { lightTheme, darkTheme as muiDarkTheme } from '../theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [darkTheme, setDarkTheme] = useState(false);
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