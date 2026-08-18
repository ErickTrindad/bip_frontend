import { useState, type SubmitEvent } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CircleAlert,
} from "lucide-react";
import type { LoginPayload } from "../../types/auth";

interface LoginFormProps {
  onSubmit: (data: LoginPayload) => Promise<void>;
  onForgotPassword: () => void;
  isLoading: boolean;
  error?: string | null;
}

export function LoginForm({
  onSubmit,
  onForgotPassword,
  isLoading,
  error,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    onSubmit({ email, password });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div className="mb-2">
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
          Acesse sua conta
        </h2>
        <p className="text-sm text-text-muted mt-1 font-medium">
          Gerencie seu estoque e gôndolas em tempo real
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-status-danger-bg border border-status-danger/20 rounded-xl flex items-center gap-2.5 text-xs text-status-danger font-medium">
          <CircleAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
            E-mail de Acesso
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-text-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="gestor@loja.com"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-canvas border border-border-neutral rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wide">
              Senha
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[11px] font-bold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
            >
              Esqueceu a senha?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-text-muted" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-canvas border border-border-neutral rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-6 py-3.5 bg-text-primary hover:bg-neutral-800 disabled:opacity-70 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Acessando...</span>
          </>
        ) : (
          <>
            <span>Acessar Painel</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
