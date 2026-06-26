import { HelpCircle, Wrench, Car, Shield, Bell, History, Package } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqSections = [
  {
    title: "Ferramentas",
    icon: Wrench,
    questions: [
      {
        q: "Como retirar uma ferramenta?",
        a: "Acesse Ferramentas › Registrar Saída, selecione a ferramenta, informe a obra, escolha o prazo de devolução (1, 7, 15 ou 30 dias), indique se a ferramenta está Completa ou Incompleta e confirme.",
      },
      {
        q: "Como funciona a Retirada em Lote?",
        a: "Na tela de Saída, ative 'Retirada em Lote', selecione várias ferramentas, clique em 'Confirmar Seleção' e finalize informando obra e prazo uma única vez para todas.",
      },
      {
        q: "Como devolver uma ferramenta?",
        a: "Acesse Ferramentas › Devolução, selecione a ferramenta que está com você e confirme. Para devolver várias de uma vez, use 'Devolução em Lote' na tela de Pendências.",
      },
      {
        q: "Como prorrogar uma devolução em atraso?",
        a: "Em Pendências, abra a ferramenta atrasada e use a opção 'Prorrogar' para definir um novo prazo.",
      },
    ],
  },
  {
    title: "Veículos",
    icon: Car,
    questions: [
      {
        q: "Como registrar a saída de um veículo?",
        a: "Acesse Veículos › Registrar Saída, selecione o veículo, informe a quilometragem, destino e tire as fotos obrigatórias (hodômetro e laterais).",
      },
      {
        q: "Como registrar a chegada de um veículo?",
        a: "Acesse Veículos › Registrar Chegada, informe a quilometragem de retorno, se houve abastecimento e tire as fotos finais do veículo.",
      },
      {
        q: "O que é uma viagem fora da cidade?",
        a: "Ao registrar a saída, marque 'Fora da cidade' e informe o endereço de destino. O sistema calcula a distância prevista automaticamente.",
      },
    ],
  },
  {
    title: "Modo Manual (Administradores)",
    icon: Shield,
    questions: [
      {
        q: "O que é o Modo Manual?",
        a: "Administradores podem ativar o 'Modo Manual' nas telas de retirada/devolução para registrar operações em nome de outro usuário, ajustar data/hora retroativamente e, em veículos, dispensar a obrigatoriedade de fotos.",
      },
      {
        q: "Quando devo usar?",
        a: "Use para corrigir registros esquecidos, lançamentos retroativos ou quando o colaborador não pôde acessar o sistema no momento da operação.",
      },
    ],
  },
  {
    title: "Histórico e Notificações",
    icon: History,
    questions: [
      {
        q: "Onde vejo o histórico de uso?",
        a: "Acesse 'Histórico Geral' no menu lateral para ver todas as movimentações de ferramentas e veículos. Os filtros permitem buscar por usuário, obra, período e tipo.",
      },
      {
        q: "Como ativar as notificações push?",
        a: "Permita as notificações quando o navegador solicitar. Você receberá avisos de prazos próximos do vencimento, devoluções atrasadas e atualizações importantes.",
      },
    ],
  },
  {
    title: "Geral",
    icon: HelpCircle,
    questions: [
      {
        q: "Como alterar minha senha?",
        a: "Acesse seu perfil pelo menu do usuário e use a opção 'Alterar Senha'. No primeiro login, o sistema solicita a troca automaticamente.",
      },
      {
        q: "O sistema funciona offline?",
        a: "Sim, parcialmente. Você pode visualizar dados em cache e registrar operações de texto. Quando a conexão retornar, a sincronização ocorre automaticamente.",
      },
      {
        q: "Como instalar o app no celular?",
        a: "No navegador do celular, abra o menu e selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'. O app funcionará como um aplicativo nativo.",
      },
    ],
  },
];

export default function Help() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold hidden sm:block">Central de Ajuda</h1>
        <p className="text-sm text-muted-foreground">
          Encontre respostas para as dúvidas mais frequentes sobre o sistema.
        </p>
      </div>

      {faqSections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <section.icon className="w-5 h-5 text-primary" />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion type="single" collapsible className="w-full">
              {section.questions.map((item, idx) => (
                <AccordionItem key={idx} value={`${section.title}-${idx}`}>
                  <AccordionTrigger className="text-sm text-left">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
