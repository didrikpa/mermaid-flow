import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 12,
  }}>
    <div style={{
      width: 24,
      height: 24,
      border: '3px solid #ebecf0',
      borderTopColor: '#4c9aff',
      borderRadius: '50%',
      animation: 'mf-spin 0.8s linear infinite',
    }} />
    <div style={{ fontSize: 14, color: '#6b778c' }}>{message}</div>
    <style>{`@keyframes mf-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);
