import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { LogOut, Store, ArrowRight, Sparkles } from 'lucide-react';

export function HomePage() {
  const { user, tenant, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col items-center justify-center p-6 antialiased">
      <div className="w-full max-w-md bg-card border border-border-neutral rounded-3xl p-8 shadow-xl text-center flex flex-col items-center gap-6">
        <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100">
          <Store className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-4xl font-extrabold text-brand-600 tracking-tight lowercase">bip</h1>
          <p className="text-sm text-text-muted mt-2 font-medium">
            Controle de estoque e reposição de gôndolas offline-first
          </p>
        </div>

        {isAuthenticated && user ? (
          <div className="w-full bg-canvas border border-border-neutral rounded-2xl p-4 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-text-muted">Usuário:</span>
              <span className="font-bold">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">E-mail:</span>
              <span className="font-bold">{user.email}</span>
            </div>
            {tenant && (
              <div className="flex justify-between">
                <span className="text-text-muted">Empresa:</span>
                <span className="font-bold">{tenant.name} ({tenant.category})</span>
              </div>
            )}
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/products"
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>Acessar Painel de Produtos</span>
              </Link>
              <Link
                to="/ai"
                className="w-full py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>AI Studio (Voz & Transcrição)</span>
              </Link>
              <button
                onClick={logout}
                className="w-full py-2 bg-card hover:bg-neutral-100 border border-border-neutral rounded-xl font-bold text-text-primary flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-3">
            <Link
              to="/auth"
              className="w-full py-3.5 bg-text-primary hover:bg-neutral-800 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Acessar Login / Cadastro</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
