import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, KeyRound, Eye, EyeOff, Check, X } from "lucide-react";
import engemaseLogo from "@/assets/engemase-logo.png";

type Requirement = {
  label: string;
  test: (pw: string) => boolean;
  required: boolean;
};

const REQUIREMENTS: Requirement[] = [
  { label: "Pelo menos 8 caracteres", test: (pw) => pw.length >= 8, required: true },
  { label: "Letra maiúscula (recomendado)", test: (pw) => /[A-Z]/.test(pw), required: false },
  { label: "Letra minúscula (recomendado)", test: (pw) => /[a-z]/.test(pw), required: false },
  { label: "Número (recomendado)", test: (pw) => /[0-9]/.test(pw), required: false },
  { label: "Símbolo (recomendado)", test: (pw) => /[^A-Za-z0-9]/.test(pw), required: false },
];

function getStrength(pw: string): { score: number; label: string; color: string } {
  const passed = REQUIREMENTS.filter((r) => r.test(pw)).length;
  if (pw.length === 0) return { score: 0, label: "", color: "bg-muted" };
  if (pw.length < 8) return { score: 1, label: "Muito curta", color: "bg-destructive" };
  if (passed === 1) return { score: 1, label: "Básica", color: "bg-primary/50" };
  if (passed === 2) return { score: 2, label: "Regular", color: "bg-primary/60" };
  if (passed === 3) return { score: 3, label: "Boa", color: "bg-primary/75" };
  if (passed === 4) return { score: 4, label: "Forte", color: "bg-primary" };
  return { score: 5, label: "Muito forte", color: "bg-green-600" };
}

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isFirstLogin = profile?.first_login === true;

  const strength = useMemo(() => getStrength(newPassword), [newPassword]);
  const requiredRequirementsMet = useMemo(
    () => REQUIREMENTS.filter((r) => r.required).every((r) => r.test(newPassword)),
    [newPassword]
  );
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requiredRequirementsMet) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        const msg = updateError.message?.toLowerCase() || "";
        if (msg.includes("pwned") || msg.includes("weak")) {
          toast.error("Senha muito comum", {
            description:
              "Esta senha aparece em vazamentos públicos. Escolha uma combinação mais única.",
          });
        } else {
          toast.error("Erro ao alterar senha", { description: updateError.message });
        }
        return;
      }

      if (user) {
        await supabase
          .from("profiles")
          .update({ first_login: false } as any)
          .eq("id", user.id);
      }

      toast.success("Senha alterada com sucesso!");
      await refreshProfile();
      navigate("/");
    } catch (error: any) {
      toast.error("Erro inesperado", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-48 h-auto">
            <img src={engemaseLogo} alt="Engemase Engenharia" className="w-full h-auto" />
          </div>
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Alterar Senha</CardTitle>
          <CardDescription>
            {isFirstLogin
              ? "Este é seu primeiro acesso. Crie uma senha com pelo menos 8 caracteres para continuar."
              : "Digite sua nova senha. Apenas 8 caracteres são obrigatórios; letras, números e símbolos só aumentam a força."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showNew ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {newPassword.length > 0 && (
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
                      const ok = req.test(newPassword);
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p
                  className={`text-xs flex items-center gap-1.5 ${
                    passwordsMatch ? "text-chart-2" : "text-destructive"
                  }`}
                >
                  {passwordsMatch ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> As senhas coincidem
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" /> As senhas não coincidem
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {!isFirstLogin && (
                <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                  Voltar
                </Button>
              )}
              <Button
                type="submit"
                className={isFirstLogin ? "w-full" : "flex-1"}
                disabled={loading || !requiredRequirementsMet || !passwordsMatch}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Nova Senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
