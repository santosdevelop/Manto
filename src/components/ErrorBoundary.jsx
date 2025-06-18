import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    log.error('Error Boundary:', { error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h3>Algo salió mal</h3>
          <button onClick={() => window.location.reload()}>
            Recargar aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}