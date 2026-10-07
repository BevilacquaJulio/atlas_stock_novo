import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from './AppLayout';
import { Spinner } from '../components/feedback';

const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const FinanceiroPage = lazy(
  () => import('../features/financeiro/FinanceiroPage'),
);
const ClientesPage = lazy(() => import('../features/clientes/ClientesPage'));
const VeiculosPage = lazy(() => import('../features/veiculos/VeiculosPage'));
const ProdutosPage = lazy(() => import('../features/produtos/ProdutosPage'));
const FornecedoresPage = lazy(
  () => import('../features/fornecedores/FornecedoresPage'),
);
const CategoriasPage = lazy(
  () => import('../features/categorias/CategoriasPage'),
);
const MovimentacoesPage = lazy(
  () => import('../features/movimentacoes/MovimentacoesPage'),
);
const ComprasPage = lazy(() => import('../features/compras/ComprasPage'));
const ProjetosPage = lazy(() => import('../features/projetos/ProjetosPage'));
const ProjetoDetalhesPage = lazy(
  () => import('../features/projetos/ProjetoDetalhesPage'),
);

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center">
                <Spinner />
              </div>
            }
          >
            <LoginPage />
          </Suspense>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="cadastros/clientes" element={<ClientesPage />} />
          <Route path="cadastros/veiculos" element={<VeiculosPage />} />
          <Route path="cadastros/produtos" element={<ProdutosPage />} />
          <Route
            path="cadastros/fornecedores"
            element={<FornecedoresPage />}
          />
          <Route path="cadastros/categorias" element={<CategoriasPage />} />
          <Route
            path="cadastros/movimentacoes"
            element={<MovimentacoesPage />}
          />
          <Route path="compras" element={<ComprasPage />} />
          <Route path="projetos" element={<ProjetosPage />} />
          <Route path="projetos/:id" element={<ProjetoDetalhesPage />} />
          <Route path="financeiro" element={<FinanceiroPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
