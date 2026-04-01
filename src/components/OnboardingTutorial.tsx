import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Wrench,
  Car,
  Clock,
  Bell,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";

const steps = [
  {
    icon: Wrench,
    title: "Gestão de Ferramentas",
    description:
      "Retire e devolva ferramentas com facilidade. Basta selecionar a ferramenta, a obra de destino e assinar digitalmente. Tudo registrado automaticamente!",
  },
  {
    icon: Car,
    title: "Controle de Veículos",
    description:
      "Registre a saída e chegada de veículos com fotos obrigatórias de todos os lados e do painel. O sistema calcula rotas e monitora o uso.",
  },
  {
    icon: Clock,
    title: "Ponto Online",
    description:
      "Registre sua entrada e saída com geolocalização automática. Acompanhe seu histórico de horas trabalhadas diretamente pelo sistema.",
  },
  {
    icon: Bell,
    title: "Notificações em Tempo Real",
    description:
      "Receba alertas sobre devoluções pendentes, ferramentas atrasadas e aprovações. Ative as notificações push para nunca perder um aviso!",
  },
];

export function OnboardingTutorial() {
  const { profile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (profile && profile.first_login && profile.approved) {
      setOpen(true);
    }
  }, [profile]);

  const handleFinish = async () => {
    setOpen(false);
    if (profile) {
      await supabase
        .from("profiles")
        .update({ first_login: false })
        .eq("id", profile.id);
      refreshProfile();
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleFinish(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-col items-center text-center px-6 py-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-xl font-bold">{step.title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {step.description}
          </p>
        </div>

        <div className="flex items-center justify-between px-6 pb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>

          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </span>

          <Button size="sm" onClick={handleNext}>
            {isLast ? (
              <>
                Começar
                <CheckCircle2 className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
