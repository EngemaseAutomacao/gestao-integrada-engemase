import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Check, X } from "lucide-react";

type Requirement = {
  label: string;
  test: (pw: string) => boolean;
  required: boolean;
};

const REQUIREMENTS: Requirement[] = [
  { label: "Pelo menos 8 caracteres", test: (pw) => pw.length >= 8, required: true },
  { label: "Letra maiúscula (A-Z)", test: (pw) => /[A-Z]/.test(pw), required: true },
  { label: "Letra minúscula (a-z)", test: (pw) => /[a-z]/.test(pw), required: true },
  { label: "Número (0-9)", test: (pw) => /[0-9]/.test(pw), required: true },
  { label: "Símbolo (recomendado)", test: (pw) => /[^A-Za-z0-9]/.test(pw), required: false },
];

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: "", color: "bg-muted" };
  const passed = REQUIREMENTS.filter((r) => r.test(pw)).length;
  if (pw.length < 8) return { score: 1, label: "Muito curta", color: "bg-destructive" };
  if (passed <= 2) return { score: 2, label: "Fraca", color: "bg-destructive" };
  if (passed === 3) return { score: 3, label: "Regular", color: "bg-yellow-500" };
  if (passed === 4) return { score: 4, label: "Forte", color: "bg-primary" };
  return { score: 5, label: "Muito forte", color: "bg-chart-2" };
}

export function passwordMeetsRequirements(pw: string): boolean {
  return REQUIREMENTS.filter((r) => r.required).every((r) => r.test(pw));
}

interface Props {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

export function PasswordStrengthField({
  id = "password",
  value,
  onChange,
  placeholder = "Digite a senha (mínimo 8 caracteres)",
  autoComplete = "new-password",
}: Props) {
  const [show, setShow] = useState(false);
  const strength = useMemo(() => getStrength(value), [value]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          minLength={8}
          maxLength={128}
          className="pr-10"
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {value.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`flex-1 transition-colors ${
                    i <= strength.score ? strength.color : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-muted-foreground min-w-[80px] text-right">
              {strength.label}
            </span>
          </div>

          <ul className="space-y-1 pt-1">
            {REQUIREMENTS.map((req) => {
              const ok = req.test(value);
              return (
                <li
                  key={req.label}
                  className={`flex items-center gap-2 text-xs transition-colors ${
                    ok ? "text-chart-2" : "text-muted-foreground"
                  }`}
                >
                  {ok ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{req.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
