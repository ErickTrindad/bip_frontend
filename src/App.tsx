import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { AiPage } from './pages/AiPage';
import { ReportsPage } from './pages/ReportsPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { RemoteScannerPage } from './pages/RemoteScannerPage';
import { AppLayout } from './components/AppLayout';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota pública de boas-vindas / landing */}
          <Route path="/" element={<HomePage />} />

          {/* Rota pública de autenticação */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />

          {/* Rota pública para scanner remoto / bipador mobile via QR Code */}
          <Route path="/scanner-remote" element={<RemoteScannerPage />} />

          {/* Rotas autenticadas envolvidas pelo AppLayout Shell */}
          <Route
            element={
              <AppLayout>
                <Outlet />
              </AppLayout>
            }
          >
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/sales" element={<SalesHistoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/ai" element={<AiPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
