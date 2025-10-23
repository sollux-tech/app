import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { ClipboardCheck, ClipboardList } from 'lucide-react'; // Importar ClipboardList

const InsightPage: React.FC = () => {
  const navigate = useNavigate();

  const handleDiagnosticClick = () => {
    navigate('/ops/diagnostics');
  };

  const handleDiagnosticQuestionnaireClick = () => {
    navigate('/ops/insight/questionnaires'); // Nova rota para o questionário
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
              title="Diagnósticos"
              description="Gerencie os diagnósticos da sua empresa."
              icon={ClipboardCheck}
              onClick={handleDiagnosticClick}
            />
            <FeatureCard
              title="Questionário do Diagnóstico"
              description="Responda e gerencie as perguntas do diagnóstico."
              icon={ClipboardList} // Novo ícone
              onClick={handleDiagnosticQuestionnaireClick}
            />
            {/* Outros cards do Insight podem ser adicionados aqui no futuro */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightPage;