import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CssBaseline from '@mui/material/CssBaseline';
import { DataSourceProvider } from './context/DataSourceContext';
import { ThemeProvider } from './context/ThemeContext';
import { AWSCredentialsProvider } from './context/AWSCredentialsContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AWSCredentialsProvider>
        <DataSourceProvider>
          <CssBaseline />
          <App />
        </DataSourceProvider>
      </AWSCredentialsProvider>
    </ThemeProvider>
  </StrictMode>,
)
