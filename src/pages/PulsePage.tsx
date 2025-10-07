import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HeartPulse, TrendingUp, Activity, Bell } from 'lucide-react';
import FeatureCard from '@/components/FeatureCard';

const PulsePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-sollux-black">SOLLUX PULSE</h1>
        <p className="text-gray-600 mt-2">Monitore a saúde e o desempenho da sua empresa em tempo real.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Status Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Operacional</div>
            <p className="text-xs text-gray-500">+10% desde o mês passado</p>
          </CardContent>
        </Card>
        
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Alertas Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sollux-red">2</div>
            <p className="text-xs text-gray-500">Críticos: 1, Advertências: 1</p>
          </CardContent>
        </Card>
        
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Uptime Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sollux-black">99.9%</div>
            <p className="text-xs text-gray-500">Últimos 30 dias</p>
          </CardContent>
        </Card>
        
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Incidentes Resolvidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sollux-black">15</div>
            <p className="text-xs text-gray-500">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sollux-black">Visão Geral do PULSE</CardTitle>
          <CardDescription>
            Acompanhe as métricas vitais e a saúde dos seus sistemas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              title="Monitoramento de Desempenho"
              description="Visualize gráficos e dados de desempenho em tempo real."
              icon={TrendingUp}
              onClick={() => alert('Monitoramento de Desempenho em breve!')}
            />
            <FeatureCard
              title="Gerenciamento de Incidentes"
              description="Acompanhe e resolva incidentes rapidamente."
              icon={Bell}
              onClick={() => alert('Gerenciamento de Incidentes em breve!')}
            />
            <FeatureCard
              title="Logs de Atividade"
              description="Analise os logs para identificar padrões e problemas."
              icon={Activity}
              onClick={() => alert('Logs de Atividade em breve!')}
            />
            <FeatureCard
              title="Configurações de Alerta"
              description="Personalize as notificações e limiares de alerta."
              icon={Settings}
              onClick={() => alert('Configurações de Alerta em breve!')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PulsePage;