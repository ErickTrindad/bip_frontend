import { useState, useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Receipt,
  TrendingDown,
  Sparkles,
  BarChart3,
  Store,
  Wifi,
  WifiOff,
  LogOut,
  ChevronLeft,
  ChevronRight,
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('@gopme:sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev: boolean) => {
      const next = !prev;
      localStorage.setItem('@gopme:sidebar_collapsed', JSON.stringify(next));
      return next;
    });
  };

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
      id: 'sales',
      label: 'Histórico de Vendas',
      shortLabel: 'Vendas',
      path: '/sales',
      icon: Receipt,
    },
    {
      id: 'critical',
      label: 'Reposição Urgente',
      shortLabel: 'Reposição',
      path: '/products?tab=critical',
      icon: TrendingDown,
    },
    {
      id: 'reports',
      label: 'Relatórios & BI',
      shortLabel: 'Relatórios',
      path: '/reports',
      icon: BarChart3,
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
      {/* Sidebar Fixa Desktop (Colapsável) */}
      <aside
        className={`hidden md:flex flex-col bg-card border-r border-border-neutral shrink-0 sticky top-0 h-screen z-30 justify-between p-3 transition-all duration-300 shadow-xs ${
          isSidebarCollapsed ? 'w-20 items-center' : 'w-64'
        }`}
      >
        <div className="flex flex-col gap-6 w-full">
          {/* Logo & Marca + Botão de Colapsar no Canto Superior Direito */}
          <div className="flex items-center justify-between px-1 py-1 gap-2">
            <div
              onClick={() => navigate('/products')}
              className={`flex items-center gap-3 cursor-pointer select-none min-w-0 ${
                isSidebarCollapsed ? 'justify-center w-full' : ''
              }`}
              title={isSidebarCollapsed ? 'GO PME' : undefined}
            >
              <div className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100 flex items-center justify-center shadow-xs shrink-0">
                <Store className="w-6 h-6" />
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-brand-600 tracking-tight text-lg truncate">
                      GO PME
                    </span>
                  </div>
                  <p className="text-tiny text-text-muted font-medium truncate max-w-[110px]">
                    {tenant?.name || 'Gestão de Estoque'}
                  </p>
                </div>
              )}
            </div>

            {/* Botão de Alternar Sidebar no topo direito */}
            {!isSidebarCollapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                title="Recolher Menu (apenas ícones)"
                className="p-2 text-text-muted hover:text-text-primary hover:bg-canvas rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botão para Expandir quando a sidebar estiver colapsada */}
          {isSidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expandir Menu"
              className="p-2 mx-auto text-text-muted hover:text-text-primary hover:bg-canvas rounded-xl transition-colors cursor-pointer flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {/* Links de Navegação */}
          <nav className="flex flex-col gap-1.5 w-full">
            {!isSidebarCollapsed && (
              <span className="text-tiny font-bold uppercase tracking-wider text-text-muted px-3 mb-1">
                Menu Principal
              </span>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.path);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`flex items-center rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                    isSidebarCollapsed
                      ? 'justify-center p-3 w-12 h-12 mx-auto'
                      : 'gap-3 px-3.5 py-3 text-left w-full'
                  } ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                      : 'text-text-muted hover:text-text-primary hover:bg-canvas'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar Desktop: Usuário & Logout */}
        <div className="pt-3 border-t border-border-neutral flex flex-col gap-3 w-full">
          {/* Card Usuário */}
          <div
            className={`flex items-center rounded-xl p-1.5 ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between px-2 bg-canvas'
            }`}
          >
            {!isSidebarCollapsed && (
              <div className="flex flex-col overflow-hidden max-w-[130px]">
                <span className="text-xs font-bold text-text-primary truncate">
                  {user?.name || 'Lojista'}
                </span>
                <span className="text-tiny text-text-muted truncate">
                  {user?.email || 'conta@gopme.com'}
                </span>
              </div>
            )}
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
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
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
