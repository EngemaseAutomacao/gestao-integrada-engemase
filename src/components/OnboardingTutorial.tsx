import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tour guiado de primeiro login usando driver.js.
 * Apresenta os módulos da Home com passos específicos para cada papel:
 *  - admin               → tour completo + módulo de Administração
 *  - employee (Engemase) → ferramentas, veículos, ponto, histórico, transferências
 *  - third_party         → ferramentas, veículos, histórico (sem ponto)
 *
 * Critério: profile.first_login === true && profile.approved === true.
 * Ao concluir (ou pular), grava first_login=false no perfil.
 */

type Role = "admin" | "employee" | "third_party";

function buildStepsForRole(role: Role): DriveStep[] {
  const welcome: DriveStep = {
    popover: {
      title: "Bem-vindo à Gestão Integrada Engemase",
      description:
        "Vamos fazer um tour rápido pelos principais módulos do sistema. Você pode pular a qualquer momento.",
      side: "over",
      align: "center",
    },
  };

  const ferramentas: DriveStep = {
    element: "#tour-ferramentas",
    popover: {
      title: "Ferramentas",
      description:
        "Retire e devolva ferramentas, registre manutenções e abra ocorrências. Toda movimentação fica registrada com foto e assinatura.",
    },
  };

  const veiculos: DriveStep = {
    element: "#tour-veiculos",
    popover: {
      title: "Veículos",
      description:
        "Registre saídas e chegadas de veículos com fotos obrigatórias dos 4 lados + painel. O sistema calcula rota e quilometragem automaticamente.",
    },
  };

  const ponto: DriveStep = {
    element: "#tour-ponto",
    popover: {
      title: "Ponto Online",
      description:
        "Marque entrada e saída com geolocalização. Acompanhe seu histórico de horas trabalhadas direto no sistema.",
    },
  };

  const historico: DriveStep = {
    element: "#tour-historico",
    popover: {
      title: "Meu Histórico",
      description:
        "Veja todas as suas movimentações (ferramentas, veículos, ponto) em um só lugar, com exportação em PDF e Excel.",
    },
  };

  const transferencias: DriveStep = {
    element: "#tour-transferencias",
    popover: {
      title: "Transferências",
      description:
        "Faça handover de ferramentas e veículos para outro usuário. Toda transferência passa por aprovação do administrador.",
    },
  };

  const admin: DriveStep = {
    element: "#tour-admin",
    popover: {
      title: "Painel de Administração",
      description:
        "Gerencie usuários, aprove cadastros, configure permissões, veja logs e auditoria — tudo em um painel central.",
    },
  };

  const busca: DriveStep = {
    popover: {
      title: "Busca Rápida (Ctrl + K)",
      description:
        "Pressione Ctrl + K (ou Cmd + K no Mac) em qualquer tela para buscar ferramentas, veículos, usuários e navegar instantaneamente.",
      side: "over",
      align: "center",
    },
  };

  const final: DriveStep = {
    popover: {
      title: "Tudo pronto!",
      description:
        "Você pode rever este tour a qualquer momento na tela de Ajuda. Bom trabalho! 🚀",
      side: "over",
      align: "center",
    },
  };

  if (role === "admin") {
    return [welcome, ferramentas, veiculos, ponto, historico, transferencias, admin, busca, final];
  }
  if (role === "third_party") {
    // Terceiros normalmente não usam Ponto Online nem Administração
    return [welcome, ferramentas, veiculos, historico, transferencias, busca, final];
  }
  // employee (Engemase)
  return [welcome, ferramentas, veiculos, ponto, historico, transferencias, busca, final];
}

export function OnboardingTutorial() {
  const { profile, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!profile || !profile.first_login || !profile.approved) return;
    if (startedRef.current) return;

    // Garante que o tour rode na Home, onde os alvos existem.
    if (location.pathname !== "/") {
      navigate("/", { replace: true });
      return;
    }

    startedRef.current = true;

    const markDone = async () => {
      try {
        await supabase
          .from("profiles")
          .update({ first_login: false })
          .eq("id", profile.id);
        await refreshProfile();
      } catch (e) {
        console.error("[OnboardingTutorial] falha ao marcar first_login:", e);
      }
    };

    // Pequeno delay garante que os cards já estejam montados.
    const timer = window.setTimeout(() => {
      const steps = buildStepsForRole(profile.role as Role);

      const driverObj = driver({
        showProgress: true,
        allowClose: true,
        overlayOpacity: 0.6,
        nextBtnText: "Próximo →",
        prevBtnText: "← Anterior",
        doneBtnText: "Concluir",
        progressText: "{{current}} de {{total}}",
        steps,
        onDestroyed: () => {
          void markDone();
        },
      });

      driverObj.drive();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [profile, location.pathname, navigate, refreshProfile]);

  return null;
}
