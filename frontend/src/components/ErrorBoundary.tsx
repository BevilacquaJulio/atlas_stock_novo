import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="mx-auto max-w-lg p-8" role="alert">
          <h1 className="text-xl font-semibold">
            Não foi possível carregar esta tela
          </h1>
          <p className="my-4">
            Confira sua conexão e recarregue a página. Dados ainda não enviados
            podem precisar ser preenchidos novamente.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded border px-4 py-2"
          >
            Recarregar
          </button>
        </main>
      );
    return this.props.children;
  }
}
