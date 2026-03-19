import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Mermaid Flow error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: 24,
          textAlign: 'center',
          color: '#ae2a19',
          background: '#ffedeb',
          borderRadius: 4,
          margin: 8,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#6b778c' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 12,
              padding: '6px 16px',
              fontSize: 13,
              background: '#fff',
              border: '1px solid #dfe1e6',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
