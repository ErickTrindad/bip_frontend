import { useState, type SubmitEvent } from "react";
import {
  Eye,
  EyeOff,
  Rocket,
  Loader2,
  CircleAlert,
  ChevronDown,
} from "lucide-react";
import type {
  RegisterPayload,
  TenantCategory,
  EmployeeRange,
} from "../../types/auth";

interface RegisterFormProps {
  onSubmit: (data: RegisterPayload) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

const CATEGORIES: { value: TenantCategory; label: string }[] = [
  { value: "PADARIA", label: "🍞 Padaria" },
  { value: "MERCEARIA", label: "🛒 Mercearia" },
  { value: "BAR", label: "🍺 Bar" },
  { value: "LANCHONETE", label: "🍔 Lanchonete" },
  { value: "FARMACIA", label: "💊 Farmácia" },
  { value: "CONVENIENCIA", label: "🏪 Conveniência" },
  { value: "PET_SHOP", label: "🐶 Pet Shop" },
  { value: "MERCADO", label: "🏬 Mercado" },
  { value: "OUTROS", label: "📦 Outros" },
];

const EMPLOYEE_RANGES: { value: EmployeeRange; label: string }[] = [
  { value: "solo_1", label: "Apenas eu" },
  { value: "team_2_5", label: "2 a 5 funcionários" },
  { value: "team_6_10", label: "6 a 10 funcionários" },
  { value: "team_11_plus", label: "Mais de 10 funcionários" },
];

export function RegisterForm({
  onSubmit,
  isLoading,
  error,
}: RegisterFormProps) {
  const [formData, setFormData] = useState<RegisterPayload>({
    name: "",
    email: "",
    password: "",
    tenantName: "",
    tenantCategory: "OUTROS",
    tenantEmployeeRange: "solo_1",
    tenantEmail: "",
    tenantPhone: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const formatPhone = (val: string) => {
    let raw = val.replace(/\D/g, "");
    if (raw.length > 11) raw = raw.slice(0, 11);

    if (raw.length > 6) {
      return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    } else if (raw.length > 2) {
      return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    } else if (raw.length > 0) {
      return `(${raw}`;
    }
    return "";
  };

  const validateField = (
    name: keyof RegisterPayload,
    value: string,
  ): string | null => {
    switch (name) {
      case "name":
        return value.trim().length >= 2 ? null : "Mín. de 2 caracteres.";
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ? null
          : "E-mail inválido.";
      case "password":
        return value.length >= 6 ? null : "Mín. de 6 caracteres.";
      case "tenantName":
        return value.trim().length >= 2 ? null : "Mín. de 2 caracteres.";
      case "tenantEmail":
        if (!value || value.trim() === "") return null;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ? null
          : "E-mail da loja inválido.";
      default:
        return null;
    }
  };

  const handleChange = (name: keyof RegisterPayload, value: string) => {
    const formattedValue = name === "tenantPhone" ? formatPhone(value) : value;
    setFormData((prev) => ({ ...prev, [name]: formattedValue }));

    const err = validateField(name, formattedValue);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: err || "",
    }));
  };

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    (
      [
        "name",
        "email",
        "password",
        "tenantName",
        "tenantEmail",
      ] as (keyof RegisterPayload)[]
    ).forEach((key) => {
      const err = validateField(key, formData[key] || "");
      if (err) errors[key] = err;
    });

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-2">
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
          Crie sua conta grátis
        </h2>
        <p className="text-sm text-text-muted mt-1 font-medium">
          Leva menos de 1 minuto e não pede cartão.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-status-danger-bg border border-status-danger/20 rounded-xl flex items-center gap-2.5 text-xs text-status-danger font-medium">
          <CircleAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
            Seu Nome
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="Ex: Carlos Silva"
            className={`w-full px-4 py-2.5 text-sm bg-canvas border ${
              fieldErrors.name
                ? "border-status-danger bg-status-danger-bg/40"
                : "border-border-neutral"
            } rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all`}
          />
          {fieldErrors.name && (
            <p className="text-[11px] font-medium text-status-danger mt-1.5 flex items-center gap-1">
              <CircleAlert className="w-3 h-3" />
              <span>{fieldErrors.name}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
              E-mail de Acesso
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
              placeholder="seu@email.com"
              className={`w-full px-4 py-2.5 text-sm bg-canvas border ${
                fieldErrors.email
                  ? "border-status-danger bg-status-danger-bg/40"
                  : "border-border-neutral"
              } rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all`}
            />
            {fieldErrors.email && (
              <p className="text-[11px] font-medium text-status-danger mt-1.5 flex items-center gap-1">
                <CircleAlert className="w-3 h-3" />
                <span>{fieldErrors.email}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
              Criar Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
                placeholder="Mín. 6 caracteres"
                className={`w-full pl-4 pr-10 py-2.5 text-sm bg-canvas border ${
                  fieldErrors.password
                    ? "border-status-danger bg-status-danger-bg/40"
                    : "border-border-neutral"
                } rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all`}
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
            {fieldErrors.password && (
              <p className="text-[11px] font-medium text-status-danger mt-1.5 flex items-center gap-1">
                <CircleAlert className="w-3 h-3" />
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>
        </div>

        <hr className="border-border-neutral/60 my-2" />

        <div>
          <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
            Nome do Estabelecimento
          </label>
          <input
            type="text"
            value={formData.tenantName}
            onChange={(e) => handleChange("tenantName", e.target.value)}
            required
            placeholder="Ex: Mercearia do Bairro, Adega Central"
            className={`w-full px-4 py-2.5 text-sm bg-canvas border ${
              fieldErrors.tenantName
                ? "border-status-danger bg-status-danger-bg/40"
                : "border-border-neutral"
            } rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all`}
          />
          {fieldErrors.tenantName && (
            <p className="text-[11px] font-medium text-status-danger mt-1.5 flex items-center gap-1">
              <CircleAlert className="w-3 h-3" />
              <span>{fieldErrors.tenantName}</span>
            </p>
          )}
        </div>

        {/* Grid Segmento & Quantidade de Funcionários */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
              Tipo de Negócio / Ramo
            </label>
            <div className="relative">
              <select
                value={formData.tenantCategory}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tenantCategory: e.target.value as TenantCategory,
                  }))
                }
                className="w-full px-4 py-2.5 text-sm bg-canvas border border-border-neutral rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all appearance-none cursor-pointer font-medium text-text-primary"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-text-muted pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
              Quantidade de Funcionários
            </label>
            <div className="relative">
              <select
                value={formData.tenantEmployeeRange}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tenantEmployeeRange: e.target.value as EmployeeRange,
                  }))
                }
                className="w-full px-4 py-2.5 text-sm bg-canvas border border-border-neutral rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all appearance-none cursor-pointer font-medium text-text-primary"
              >
                {EMPLOYEE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
              E-mail da Loja{" "}
              <span className="text-text-muted font-medium lowercase tracking-normal">
                (Opcional)
              </span>
            </label>
            <input
              type="email"
              value={formData.tenantEmail}
              onChange={(e) => handleChange("tenantEmail", e.target.value)}
              placeholder="contato@empresa.com"
              className={`w-full px-4 py-2.5 text-sm bg-canvas border ${
                fieldErrors.tenantEmail
                  ? "border-status-danger bg-status-danger-bg/40"
                  : "border-border-neutral"
              } rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all`}
            />
            {fieldErrors.tenantEmail && (
              <p className="text-[11px] font-medium text-status-danger mt-1.5 flex items-center gap-1">
                <CircleAlert className="w-3 h-3" />
                <span>{fieldErrors.tenantEmail}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">
              WhatsApp{" "}
              <span className="text-text-muted font-medium lowercase tracking-normal">
                (Opcional)
              </span>
            </label>
            <input
              type="tel"
              value={formData.tenantPhone}
              onChange={(e) => handleChange("tenantPhone", e.target.value)}
              placeholder="(11) 99999-9999"
              maxLength={15}
              className="w-full px-4 py-2.5 text-sm bg-canvas border border-border-neutral rounded-xl focus:bg-card focus:ring-2 focus:ring-text-primary focus:border-text-primary outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-70 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Criando sua conta...</span>
            </>
          ) : (
            <>
              <span>Começar Agora (Grátis)</span>
              <Rocket className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
