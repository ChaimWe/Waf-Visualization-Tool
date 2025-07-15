import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { DataSourceProvider } from './context/DataSourceContext';
import { ThemeProvider } from './context/ThemeContext';
import { AWSCredentialsProvider } from './context/AWSCredentialsContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AWSCredentialsProvider>
        <DataSourceProvider>
          <MuiThemeProvider theme={theme}>
            <CssBaseline />
            <App />
          </MuiThemeProvider>
        </DataSourceProvider>
      </AWSCredentialsProvider>
    </ThemeProvider>
  </StrictMode>,
)
