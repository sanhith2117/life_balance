'use client';
await axios.post("/api/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Snackbar,
  CircularProgress,
  Paper,
} from '@mui/material';
import { styled } from '@mui/system';
import axios from 'axios';
import { useUser  } from '@clerk/nextjs';

// Styled components for a more creative layout
const StyledContainer = styled(Container)(({ theme }) => ({
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: theme.spacing(4),
  boxShadow: theme.shadows[5],
  marginTop: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const UploadPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  borderRadius: '12px',
  boxShadow: theme.shadows[3],
  width: '100%',
  maxWidth: '400px',
  margin: '20px 0',
}));

const UploadButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  borderRadius: '8px',
  padding: theme.spacing(1.5, 4),
  fontWeight: 'bold',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'scale(1.05)',
  },
}));

export default function UploadDocument() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { user } = useUser ();

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.idToken}`, // Ensure you have the correct token
        },
      });
      // Set success message from server response
      set
