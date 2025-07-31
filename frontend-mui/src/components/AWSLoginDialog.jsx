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
  const { login, isLoading, error, regions, isAuthenticated, logout } = useAWSCredentials();
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');

  const handleLogin = async () => {
    if (!accessKeyId || !secretAccessKey || !region) {
      return;
    }

    const result = await login(accessKeyId, secretAccessKey, region);
    if (result.success) {
      onClose();
      // Clear sensitive data
      setAccessKeyId('');
      setSecretAccessKey('');
      setRegion('us-east-1');
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
        {isAuthenticated ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="h6">Connected to AWS</Typography>
              <Typography variant="body2">
                Your AWS credentials are securely stored in the session and will be used for all AWS operations.
              </Typography>
            </Alert>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Session Status:</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label="Authenticated" color="success" size="small" />
                  <Chip label="Session Active" color="primary" size="small" />
                </Stack>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Security Note:</Typography>
                <Typography variant="body2" color="text.secondary">
                  Your credentials are stored securely in the server session and are never exposed to the frontend.
                </Typography>
              </Box>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={3}>
            <Alert severity="info">
              <Typography variant="body2">
                Enter your AWS credentials to access your WAF and ALB configurations. 
                Credentials are stored securely in the server session and never exposed to the frontend.
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
              type="password"
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
                Your credentials will be validated against AWS and stored securely in the server session
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