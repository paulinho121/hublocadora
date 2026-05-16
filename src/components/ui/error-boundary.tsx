import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  /** Componente de fallback customizado. Se não fornecido, usa o padrão. */
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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    // Reporta ao Sentry se estiver configurado
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
          <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
            {/* Ícone */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
              <div className="relative bg-zinc-900 w-24 h-24 rounded-3xl flex items-center justify-center border border-zinc-800 shadow-2xl">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 text-destructive"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>

            {/* Texto */}
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase text-zinc-100 mb-2">
                Algo deu errado
              </h1>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Um erro inesperado ocorreu nesta página. Nossa equipe foi notificada automaticamente.
              </p>
            </div>

            {/* Detalhe do erro (apenas em dev) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-zinc-900 rounded-xl p-4 text-left border border-zinc-800">
                <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-2">
                  Detalhe do Erro (dev only)
                </p>
                <code className="text-xs text-destructive break-all font-mono">
                  {this.state.error.message}
                </code>
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center h-11 px-8 rounded-xl bg-primary text-white font-black uppercase text-xs tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Tentar novamente
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center h-11 px-8 rounded-xl border border-zinc-800 text-zinc-300 font-black uppercase text-xs tracking-widest hover:bg-zinc-900 transition-colors"
              >
                Voltar ao início
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
