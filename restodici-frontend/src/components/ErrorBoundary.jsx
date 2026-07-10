import { Component } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { ORANGE, ORANGE_DARK, BG, TEXT, TEXT_MUTED } from '../theme/colors';

/**
 * Capture les erreurs de rendu React pour éviter l'écran blanc.
 * Affiche un écran de repli et permet de recharger.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Point d'accroche pour un futur reporting (Sentry, etc.)
    console.error('ErrorBoundary a capturé une erreur :', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: BG, padding: 24, fontFamily: "'Manrope', system-ui, sans-serif",
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '40px 32px', maxWidth: 420, width: '100%',
          textAlign: 'center', boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${ORANGE}18`,
          }}>
            <AlertTriangle style={{ width: 30, height: 30, color: ORANGE }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: '0 0 8px' }}>
            Une erreur est survenue
          </h1>
          <p style={{ fontSize: 14, color: TEXT_MUTED, margin: '0 0 24px', lineHeight: 1.5 }}>
            L'application a rencontré un problème inattendu. Vous pouvez recharger la page pour continuer.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, background: ORANGE, color: '#fff',
              border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = ORANGE_DARK; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ORANGE; }}
          >
            <RefreshCcw style={{ width: 16, height: 16 }} /> Recharger
          </button>
        </div>
      </div>
    );
  }
}
