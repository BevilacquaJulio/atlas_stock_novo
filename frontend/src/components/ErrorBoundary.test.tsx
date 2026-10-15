import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function BrokenRoute(): React.ReactNode {
  throw new Error('synthetic-route-failure');
}

describe('recuperação de erro de tela', () => {
  it('troca a tela com falha por uma recuperação explícita sem revelar erro interno', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      render(
        <ErrorBoundary>
          <BrokenRoute />
        </ErrorBoundary>,
      );
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível carregar esta tela',
      );
      expect(
        screen.getByRole('button', { name: 'Recarregar' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('synthetic-route-failure'),
      ).not.toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });
});
