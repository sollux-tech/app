import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Brain, Target, ClipboardCheck, ClipboardList, MessageSquareText } from 'lucide-react'; // Importar MessageSquareText para o novo card

const InsightPage: React.FC = () => {
  const navigate = useNavigate();

  const handleDiagnosticClick = () => {
    navigate('/ops/diagnostics');
  };

  const handleDiagnosticQuestionnaireClick = () => {
    navigate('/ops/insight/questionnaires'); // Rota para gerenciar quais perguntas fazem parte do diagnóstico
  };

  const handleAnswerQuestionnaireClick = () => {
    navigate('/ops/insight/answer-questionnaire'); // Nova rota para responder o questionário
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-foreground">SOLLUX INSIGHT™</CardTitle>
          <CardDescription className="text-xl text-muted-foreground">
            Avaliação do momento atual da sua empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Gerenciar Diagnósticos"
              description="Crie e gerencie os diagnósticos da sua empresa."
              icon={ClipboardCheck}
              onClick={handleDiagnosticClick}
            />
            <FeatureCard
              title="Gerenciar Perguntas do Diagnóstico"
              description="Selecione as perguntas que farão parte de cada diagnóstico."
              icon={ClipboardList}
              onClick={handleDiagnosticQuestionnaireClick}
            />
            <FeatureCard
              title="Responder Questionário"
              description="Responda as perguntas de um diagnóstico selecionado."
              icon={MessageSquareText} // Ícone para o novo card
              onClick={handleAnswerQuestionnaireClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightPage;