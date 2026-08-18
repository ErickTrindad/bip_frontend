import { useState, useEffect } from "react";
import { X, CheckCircle2, Copy, ArrowRight, ShieldCheck } from "lucide-react";
import type { AuthResponse } from "../../types/auth";

interface JwtModalProps {
  isOpen: boolean;
  onClose: () => void;
  authData: AuthResponse | null;
  onContinue: () => void;
}

export function JwtModal({
  isOpen,
  onClose,
  authData,
  onContinue,
}: JwtModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !authData) return null;
  const jwtPayload = {
    sub: authData.user.id,
    user_email: authData.user.email,
    user_name: authData.user.name,
    tenant_id: authData.tenant?.id || authData.user.tenantId,
    tenant_name: authData.tenant?.name,
    tenant_category: authData.tenant?.category,
    tenant_employee_range: authData.tenant?.employeeRange,
    role: authData.user.role,
    plan: "FREE_MVP",
    max_skus: 100,
    access_token: authData.session?.access_token
      ? `${authData.session.access_token.slice(0, 32)}...`
      : undefined,
  };

  const handleCopy = async () => {
    const textToCopy =
      authData.session?.access_token || JSON.stringify(jwtPayload, null, 2);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para ambientes restritos
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border-neutral text-text-primary w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-border-neutral pb-5 mb-5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-status-success-bg text-status-success rounded-2xl border border-status-success/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg">Autenticação Concluída</h3>
              <p className="text-xs text-text-muted font-medium">
                Token JWT / Configuração Multi-tenant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-text-muted hover:text-text-primary p-1.5 rounded-xl hover:bg-canvas transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <div>
            <label className="block text-text-muted mb-2 font-bold text-[10px] uppercase tracking-widest">
              Payload / Sessão
            </label>
            <div className="bg-canvas p-4 rounded-2xl border border-border-neutral font-mono text-text-primary overflow-x-auto text-[11px] leading-relaxed shadow-inner max-h-48">
              <pre>{JSON.stringify(jwtPayload, null, 2)}</pre>
            </div>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border-neutral space-y-2.5 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-text-muted font-medium text-xs">
                Loja Cadastrada:
              </span>
              <span className="font-bold text-text-primary">
                {authData.tenant?.name || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted font-medium text-xs">
                Segmento:
              </span>
              <span className="font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-100 text-[11px]">
                {authData.tenant?.category || "OUTROS"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted font-medium text-xs">
                Isolamento (RLS):
              </span>
              <span className="font-bold text-status-success flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-3.5 h-3.5" /> Ativo
              </span>
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto px-5 py-3 bg-card hover:bg-canvas text-text-primary font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-border-neutral shadow-sm cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? "Copiado!" : "Copiar Token"}</span>
            </button>
            <button
              onClick={onContinue}
              className="w-full flex-1 py-3 bg-text-primary hover:bg-neutral-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <span>Ir para o Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
