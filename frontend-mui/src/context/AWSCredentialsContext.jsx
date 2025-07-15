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

  // Load credentials from localStorage on mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem('aws-credentials');
    if (savedCredentials) {
      try {
        const parsed = JSON.parse(savedCredentials);
        setCredentials(parsed);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Failed to parse saved credentials:', err);
        localStorage.removeItem('aws-credentials');
      }
    }
  }, []);

  const login = async (accessKeyId, secretAccessKey, region) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate credentials by making a test call to STS
      const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
      
      const stsClient = new STSClient({
        region: region,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey
        }
      });

      const command = new GetCallerIdentityCommand({});
      const response = await stsClient.send(command);

      const newCredentials = {
        accessKeyId,
        secretAccessKey,
        region,
        accountId: response.Account,
        userId: response.UserId,
        arn: response.Arn
      };

      // Save to localStorage
      localStorage.setItem('aws-credentials', JSON.stringify(newCredentials));
      
      setCredentials(newCredentials);
      setIsAuthenticated(true);
      setIsLoading(false);

      return { success: true, accountId: response.Account };
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('aws-credentials');
    setCredentials(null);
    setIsAuthenticated(false);
    setError(null);
  };

  const getWAFClient = () => {
    if (!credentials) return null;
    
    const { WAFV2Client } = require('@aws-sdk/client-wafv2');
    return new WAFV2Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });
  };

  const getSTSClient = () => {
    if (!credentials) return null;
    
    const { STSClient } = require('@aws-sdk/client-sts');
    return new STSClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });
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
      getSTSClient
    }}>
      {children}
    </AWSCredentialsContext.Provider>
  );
}

export function useAWSCredentials() {
  return useContext(AWSCredentialsContext);
} 