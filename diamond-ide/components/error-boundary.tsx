"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Diamond IDE] Unhandled error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            background: "#0f172a",
            color: "#e2e8f0",
            fontFamily: "system-ui, -apple-system, sans-serif",
            textAlign: "center"
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "1rem",
              padding: "2.5rem",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)"
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💎</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#94a3b8", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              The Diamond IDE encountered an unexpected error. This is usually caused by a
              malformed compiler output or a WASM crash. Reloading the page should fix it.
            </p>
            {this.state.error && (
              <pre
                style={{
                  background: "#0f172a",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                  fontSize: "0.8rem",
                  overflow: "auto",
                  maxHeight: "120px",
                  textAlign: "left",
                  color: "#f87171",
                  marginBottom: "1.25rem"
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
