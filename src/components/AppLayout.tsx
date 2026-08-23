import { useState, useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  TrendingDown,
  Sparkles,
  Store,
  Wifi,
  WifiOff,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { GlobalVoiceFab } from './GlobalVoiceFab';

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, tenant, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auth Guard: se não estiver autenticado, redireciona para login
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  // Itens de navegação principal
  const navItems = [
    {
      id: 'products',
      label: 'Estoque',
      path: '/products',
      icon: Package,
      badge: undefined,
    },
    {
      id: 'pos',
      label: 'Frente de Caixa (PDV)',
      shortLabel: 'PDV',
      path: '/products?modal=pos',
      icon: ShoppingCart,
    },
    {
      id: 'critical',
      label: 'Reposição Urgente',
      shortLabel: 'Reposição',
      path: '/products?tab=critical',
      icon: TrendingDown,
    },
    {
      id: 'ai',
      label: 'Assistente de Voz',
      shortLabel: 'Assistente',
      path: '/ai',
      icon: Sparkles,
    },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const isNavActive = (path: string) => {
    if (path === '/products') {
      return (
        location.pathname === '/products' &&
        !location.search.includes('modal=pos') &&
        !location.search.includes('tab=critical')
      );
    }
    if (path.includes('modal=pos')) {
      return location.pathname === '/products' && location.search.includes('modal=pos');
    }
    if (path.includes('tab=critical')) {
      return location.pathname === '/products' && location.search.includes('tab=critical');
    }
    if (path === '/ai') {
      return location.pathname === '/ai';
    }
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col md:flex-row antialiased">
      {/* Sidebar Fixa Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border-neutral shrink-0 sticky top-0 h-screen z-30 justify-between p-4 shadow-xs">
        <div className="flex flex-col gap-6">
          {/* Logo & Marca */}
          <div
            onClick={() => navigate('/products')}
            className="flex items-center gap-3 px-2 py-1 cursor-pointer select-none"
          >
            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100 flex items-center justify-center shadow-xs">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-brand-600 tracking-tight text-lg">
                  GO PME
                </span>
              </div>
              <p className="text-[11px] text-text-muted font-medium truncate max-w-[130px]">
                {tenant?.name || 'Gestão de Estoque'}
              </p>
            </div>
          </div>

          {/* Links de Navegação */}
          <nav className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-3 mb-1">
              Menu Principal
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.path);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer text-left ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                      : 'text-text-muted hover:text-text-primary hover:bg-canvas'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar Desktop: Usuário & Logout */}
        <div className="pt-4 border-t border-border-neutral flex flex-col gap-3">
          {/* Card Usuário */}
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-text-primary truncate">
                {user?.name || 'Lojista'}
              </span>
              <span className="text-[10px] text-text-muted truncate">
                {user?.email || 'conta@gopme.com'}
              </span>
            </div>
            <button
              onClick={logout}
              title="Encerrar sessão"
              className="p-2 text-text-muted hover:text-status-danger hover:bg-status-danger-bg rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Área Principal (Header Superior Unificado + Conteúdo) */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        {/* Header Superior Unificado */}
        <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border-neutral px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
          {/* Info da Loja Ativa */}
          <div className="flex items-center gap-3">
            <div className="md:hidden p-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-text-primary text-sm sm:text-base">
                  {tenant?.name || 'Minha Loja'}
                </span>
                <span className="text-[10px] bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {tenant?.category || 'PME'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted hidden sm:block">
                Painel Operacional Integrado
              </p>
            </div>
          </div>

          {/* Status Online/Offline e Ações */}
          <div className="flex items-center gap-2.5">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                isOnline
                  ? 'bg-status-success-bg text-status-success border-status-success/30'
                  : 'bg-status-warning-bg text-status-warning border-status-warning/40'
              }`}
              title={isOnline ? 'Online (Supabase Conectado)' : 'Offline (Modo Local Dexie)'}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Logout Mobile */}
            <button
              onClick={logout}
              title="Encerrar sessão"
              className="md:hidden p-2 text-text-muted hover:text-status-danger rounded-xl border border-border-neutral"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Conteúdo da Página */}
        <main className="flex-1 w-full">{children}</main>
      </div>

      {/* Bottom Navigation Bar Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border-neutral px-2 py-2 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item.path);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-all cursor-pointer ${
                active
                  ? 'text-brand-600 font-extrabold'
                  : 'text-text-muted hover:text-text-primary font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-lg ${
                  active ? 'bg-brand-50 text-brand-600' : 'text-text-muted'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] leading-none">
                {item.shortLabel || item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Botão Flutuante Global de Microfone (FAB) */}
      <GlobalVoiceFab />
    </div>
  );
}
