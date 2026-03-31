import { HelpCircle, Wrench, Car, MapPin, Shield, Bell, Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqSections = [
  {
    title: "Ferramentas",
    icon: Wrench,
    questions: [
      {
        q: "Como retirar uma ferramenta?",
        a: "Acesse o módulo Ferramentas, clique em 'Retirada', selecione a ferramenta desejada, preencha as informações solicitadas (obra, assinatura, foto) e confirme."
      },
      {
        q: "Como devolver uma ferramenta?",
        a: "Acesse o módulo Ferramentas, clique em 'Devolução', selecione a ferramenta que está com você, tire a foto da ferramenta e confirme a devolução."
      },
      {
        q: "O que fazer se a ferramenta estiver com defeito?",
        a: "Ao devolver ou durante o uso, acesse 'Reportar Problema' e descreva o defeito encontrado. O administrador será notificado automaticamente."
      },
    ]
  },
  {
    title: "Veículos",
    icon: Car,
    questions: [
      {
        q: "Como registrar a saída de um veículo?",
        a: "Acesse o módulo Veículos, clique em 'Registrar Saída', selecione o veículo, informe a quilometragem atual, destino, e tire as fotos obrigatórias do veículo."
      },
      {
        q: "Como registrar a chegada de um veículo?",
        a: "Acesse o módulo Veículos, clique em 'Registrar Chegada', informe a quilometragem de retorno, se abasteceu, e tire as fotos do veículo."
      },
      {
        q: "Como registrar um abastecimento?",
        a: "Acesse a seção 'Combustível' no módulo Veículos. Preencha os dados do abastecimento como litros, valor e quilometragem."
      },
    ]
  },
  {
    title: "Ponto Online",
    icon: MapPin,
    questions: [
      {
        q: "Como registrar meu ponto?",
        a: "Acesse o módulo Ponto Online e clique em 'Registrar Ponto'. O sistema capturará sua localização automaticamente. Confirme para registrar a entrada ou saída."
      },
      {
        q: "Como ver meu histórico de ponto?",
        a: "Acesse 'Histórico de Ponto' no módulo Ponto Online para visualizar todos os seus registros com datas, horários e localizações."
      },
    ]
  },
  {
    title: "Geral",
    icon: HelpCircle,
    questions: [
      {
        q: "Como alterar minha senha?",
        a: "Sua senha pode ser alterada através do menu do usuário ou entrando em contato com o administrador do sistema."
      },
      {
        q: "O que fazer se o sistema estiver offline?",
        a: "O sistema possui modo offline limitado. Algumas funcionalidades podem ser acessadas mesmo sem internet. Quando a conexão for restaurada, os dados serão sincronizados automaticamente."
      },
      {
        q: "Como ativar as notificações?",
        a: "Ao acessar o sistema pela primeira vez, permita as notificações quando solicitado. Você também pode ativar nas configurações do navegador."
      },
    ]
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
