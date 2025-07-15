import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Chip,
  Stack
} from '@mui/material';
import { useAWSCredentials } from '../context/AWSCredentialsContext';
import CloudIcon from '@mui/icons-material/Cloud';
import SecurityIcon from '@mui/icons-material/Security';

export default function AWSLoginDialog({ open, onClose }) {
  const { login, isLoading, error, regions, isAuthenticated, credentials, logout } = useAWSCredentials();
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [showSecret, setShowSecret] = useState(false);

  const handleLogin = async () => {
    if (!accessKeyId || !secretAccessKey || !region) {
      return;
    }

    const result = await login(accessKeyId, secretAccessKey, region);
    if (result.success) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    setAccessKeyId('');
    setSecretAccessKey('');
    setRegion('us-east-1');
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudIcon color="primary" />
          <Typography variant="h6">AWS Credentials</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {isAuthenticated && credentials ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="h6">Connected to AWS</Typography>
              <Typography variant="body2">
                Account: {credentials.accountId} | Region: {credentials.region}
              </Typography>
            </Alert>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Account Information:</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label={`Account: ${credentials.accountId}`} size="small" />
                  <Chip label={`Region: ${credentials.region}`} size="small" />
                  <Chip label={`User: ${credentials.userId}`} size="small" />
                </Stack>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>ARN:</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {credentials.arn}
                </Typography>
              </Box>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={3}>
            <Alert severity="info">
              <Typography variant="body2">
                Enter your AWS credentials to test against live WAF instances. 
                Credentials are stored locally and never sent to our servers.
              </Typography>
            </Alert>

            {error && (
              <Alert severity="error">
                <Typography variant="body2">{error}</Typography>
              </Alert>
            )}

            <TextField
              label="Access Key ID"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              fullWidth
              required
              placeholder="AKIA..."
              disabled={isLoading}
            />

            <TextField
              label="Secret Access Key"
              type={showSecret ? 'text' : 'password'}
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              fullWidth
              required
              placeholder="Enter your secret access key"
              disabled={isLoading}
            />

            <FormControl fullWidth disabled={isLoading}>
              <InputLabel>Region</InputLabel>
              <Select
                value={region}
                label="Region"
                onChange={(e) => setRegion(e.target.value)}
              >
                {regions.map((reg) => (
                  <MenuItem key={reg} value={reg}>
                    {reg}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="action" fontSize="small" />
              <Typography variant="caption" color="text.secondary">
                Your credentials are validated against AWS STS and stored locally
              </Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {isAuthenticated ? (
          <Button onClick={handleLogout} color="error" variant="outlined">
            Disconnect
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleLogin}
              variant="contained"
              disabled={!accessKeyId || !secretAccessKey || isLoading}
              startIcon={isLoading ? <CircularProgress size={16} /> : <CloudIcon />}
            >
              {isLoading ? 'Connecting...' : 'Connect to AWS'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
} 