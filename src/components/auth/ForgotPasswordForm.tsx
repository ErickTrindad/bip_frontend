import { useState, type SubmitEvent } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";
import { authService } from "../../services/authService";
import { ApiError } from "../../services/api";

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  onSuccess: () => void;
}

export function ForgotPasswordForm({
  onBackToLogin,
  onSuccess,
}: ForgotPasswordFormProps) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Envio do e-mail para solicitar OTP
  const sendOtpRequest = async () => {
    if (!email.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await authService.forgotPassword({ email: email.trim() });
      setSuccessMessage(response.message || "Código enviado com sucesso!");
      setStep("verify");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Erro ao solicitar código de recuperação.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = (e: SubmitEvent) => {
    e.preventDefault();
    sendOtpRequest();
  };

  // 2. Validação do OTP de 6 a 8 dígitos e redefinição de senha
  const handleResetPassword = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!email || !token || !newPassword) return;

    if (!/^\d{6,8}$/.test(token)) {
      setErrorMessage("O código OTP deve ter entre 6 e 8 dígitos numéricos.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await authService.resetPasswordWithOtp({
        email: email.trim(),
        token: token.trim(),
        newPassword,
      });
      setSuccessMessage(response.message || "Senha redefinida com sucesso!");
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          "Erro ao redefinir senha. Verifique o código e tente novamente.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="mb-2">
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Login</span>
        </button>
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
          {step === "request" ? "Recuperar Senha" : "Criar Nova Senha"}
        </h2>
        <p className="text-sm text-text-muted mt-1 font-medium">
          {step === "request"
            ? "Informe seu e-mail para receber o código OTP de recuperação"
            : `Digite o código OTP de 6 a 8 dígitos enviado para ${email}`}
        </p>
      </div>

      {/* Alertas */}
      {errorMessage && (
        <div className="p-3.5 bg-status-danger-bg border border-status-danger/20 rounded-xl flex items-center gap-2.5 text-xs text-status-danger font-medium">
          <CircleAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-status-success-bg border border-status-success/20 rounded-xl flex items-center gap-2.5 text-xs text-status-success font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ETAPA 1: Solicitar OTP */}
      {step === "request" && (
        <form onSubmit={handleRequestOtp} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
              E-mail Cadastrado
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-canvas border border-border-neutral rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-70 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando código...</span>
              </>
            ) : (
              <>
                <span>Enviar Código</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* ETAPA 2: Digitar OTP e Nova Senha */}
      {step === "verify" && (
        <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
              Código OTP (6 a 8 dígitos)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-text-muted" />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                required
                placeholder="123456"
                className="w-full pl-10 pr-4 py-2.5 text-sm tracking-widest font-mono bg-canvas border border-border-neutral rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all text-center sm:text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
              Nova Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Mín. 6 caracteres"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-canvas border border-border-neutral rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-text-muted hover:text-text-primary cursor-pointer"
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

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={isLoading}
              onClick={sendOtpRequest}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
            >
              Reenviar código
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-70 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Atualizando senha...</span>
              </>
            ) : (
              <>
                <span>Redefinir Senha</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
