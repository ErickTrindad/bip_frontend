import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  WifiOff,
  ShieldCheck,
  CircleAlert,
} from "lucide-react";
import { LoginForm } from "../components/auth/LoginForm";
import { RegisterForm } from "../components/auth/RegisterForm";
import { ForgotPasswordForm } from "../components/auth/ForgotPasswordForm";
import { JwtModal } from "../components/auth/JwtModal";
import { useAuth } from "../contexts/useAuth";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from "../types/auth";
import { ApiError } from "../services/api";

type AuthTab = "login" | "register" | "forgot";

export function AuthPage() {
  const [activeTab, setActiveTab] = useState<AuthTab>("register");
  const [authResponse, setAuthResponse] = useState<AuthResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (payload: LoginPayload) => {
    setErrorMessage(null);
    try {
      const res = await login(payload);
      setAuthResponse(res);
      setIsModalOpen(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Erro ao realizar login. Tente novamente.");
      }
    }
  };

  const handleRegisterSubmit = async (payload: RegisterPayload) => {
    setErrorMessage(null);
    try {
      const res = await register(payload);
      setAuthResponse(res);
      setIsModalOpen(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.issues && Object.keys(err.issues).length > 0) {
          const firstKey = Object.keys(err.issues)[0];
          const firstIssue = err.issues[firstKey]?.[0];
          setErrorMessage(firstIssue || err.message);
        } else {
          setErrorMessage(err.message);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Erro ao criar conta. Tente novamente.");
      }
    }
  };

  const handleModalContinue = () => {
    setIsModalOpen(false);
    navigate("/");
  };

  return (
    <div className="bg-canvas text-text-primary min-h-screen flex items-center justify-center p-3 sm:p-6 antialiased">
      {/* Main Container */}
      <main className="w-full max-w-4xl">
        <div className="bg-card rounded-3xl shadow-xl sm:shadow-2xl sm:shadow-neutral-200/60 overflow-hidden border border-border-neutral grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
          {/* Left Hero Sidebar (hidden on mobile, visible on desktop) */}
          <div className="hidden md:flex md:col-span-5 bg-brand-50 p-8 flex-col justify-between relative overflow-hidden border-r border-border-neutral/60">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-100/60 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 mt-4">
              <div className="inline-flex items-center gap-2 bg-card border border-brand-100 px-3 py-1.5 rounded-full text-[11px] font-bold text-brand-700 mb-8 shadow-sm uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                Simples, Rápido e Seguro
              </div>
              <h2 className="text-3xl font-extrabold text-text-primary leading-tight mb-4 tracking-tight">
                O controle da sua loja,
                <br />
                agora nas suas mãos.
              </h2>
              <p className="text-text-muted text-sm leading-relaxed font-medium">
                Abandone as planilhas complexas. Nosso sistema foi desenhado para ser tão fácil de usar quanto um
                aplicativo de mensagens.
              </p>
            </div>

            <div className="relative z-10 space-y-5 my-8">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-card text-text-primary rounded-xl shadow-sm border border-border-neutral/40">
                  <CircleAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Interface Minimalista</h3>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                    Sem poluição visual. Foco total nas operações do seu caixa e estoque.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-card text-brand-600 rounded-xl shadow-sm border border-border-neutral/40">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Offline-First (PWA)</h3>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                    Continue registrando vendas e bipes no chão de loja mesmo se a internet cair.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-6 border-t border-brand-100 text-xs text-text-muted font-medium flex items-center justify-between">
              <span>Tecnologia em Nuvem</span>
              <span className="flex items-center gap-1.5 text-text-primary">
                <ShieldCheck className="w-4 h-4 text-status-success" /> Dados Seguros
              </span>
            </div>
          </div>

          {/* Right Forms Area */}
          <div className="col-span-1 md:col-span-7 bg-card p-6 sm:p-10 flex flex-col justify-between overflow-y-auto max-h-[90vh] sm:max-h-none">
            <div>
              {/* Tab Selector (Oculto na tela de recuperação de senha) */}
              {activeTab !== "forgot" && (
                <div className="flex bg-canvas p-1.5 rounded-2xl mb-8 border border-border-neutral/80">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("login");
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl select-none outline-none cursor-pointer border ${
                      activeTab === "login"
                        ? "bg-card text-text-primary shadow-sm border-border-neutral/60"
                        : "bg-transparent text-text-muted hover:text-text-primary border-transparent"
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("register");
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl select-none outline-none cursor-pointer border ${
                      activeTab === "register"
                        ? "bg-card text-text-primary shadow-sm border-border-neutral/60"
                        : "bg-transparent text-text-muted hover:text-text-primary border-transparent"
                    }`}
                  >
                    Criar Conta
                  </button>
                </div>
              )}

              {/* Formulários dinâmicos */}
              {activeTab === "login" && (
                <LoginForm
                  onSubmit={handleLoginSubmit}
                  onForgotPassword={() => {
                    setActiveTab("forgot");
                    setErrorMessage(null);
                  }}
                  isLoading={isLoading}
                  error={errorMessage}
                />
              )}

              {activeTab === "register" && (
                <RegisterForm
                  onSubmit={handleRegisterSubmit}
                  isLoading={isLoading}
                  error={errorMessage}
                />
              )}

              {activeTab === "forgot" && (
                <ForgotPasswordForm
                  onBackToLogin={() => {
                    setActiveTab("login");
                    setErrorMessage(null);
                  }}
                  onSuccess={() => {
                    setActiveTab("login");
                    setErrorMessage(null);
                  }}
                />
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-border-neutral/60 flex items-center justify-between text-xs font-medium text-text-muted">
              <span>Plano gratuito com até 100 produtos cadastrados.</span>
              <a
                href="#termos"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Termos de Uso do GO PME.");
                }}
                className="text-text-muted hover:text-text-primary hover:underline transition-colors"
              >
                Termos de Uso
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Result Modal */}
      <JwtModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        authData={authResponse}
        onContinue={handleModalContinue}
      />
    </div>
  );
}
