import React, { createContext, useContext, useState, useEffect } from 'react';

const AWSCredentialsContext = createContext();

export function AWSCredentialsProvider({ children }) {
  const [credentials, setCredentials] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regions, setRegions] = useState([
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'
  ]);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.authenticated && data.hasCredentials) {
        setIsAuthenticated(true);
        // We don't store the actual credentials in frontend for security
        setCredentials({ authenticated: true });
      } else {
        setIsAuthenticated(false);
        setCredentials(null);
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
      setIsAuthenticated(false);
      setCredentials(null);
    }
  };

  const login = async (accessKeyId, secretAccessKey, region) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          accessKeyId,
          secretAccessKey,
          region
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        setCredentials({ authenticated: true, region });
        setIsLoading(false);
        return { success: true };
      } else {
        setError(data.message || 'Login failed');
        setIsLoading(false);
        return { success: false, error: data.message };
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    setCredentials(null);
    setIsAuthenticated(false);
    setError(null);
  };

  const getWAFClient = () => {
    // This is now handled by the backend with session credentials
    // Frontend doesn't need to create AWS clients directly
    return null;
  };

  const getSTSClient = () => {
    // This is now handled by the backend with session credentials
    // Frontend doesn't need to create AWS clients directly
    return null;
  };

  return (
    <AWSCredentialsContext.Provider value={{
      credentials,
      isAuthenticated,
      isLoading,
      error,
      regions,
      login,
      logout,
      getWAFClient,
      getSTSClient,
      checkAuthStatus
    }}>
      {children}
    </AWSCredentialsContext.Provider>
  );
}

export function useAWSCredentials() {
  return useContext(AWSCredentialsContext);
} 