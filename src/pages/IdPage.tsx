import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Users, Building2, Briefcase, Calendar, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';

const IdPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header com título e botão de adicionar */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-sollux-black">ID</h1>
        <Button className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Adicionar
        </Button>
      </div>

      {/* Seção de cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 mb-4">
            <CardTitle className="text-lg font-medium text-sollux-black">Total de Usuários</CardTitle>
            <Users className="h-5 w-5 text-sollux-red" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-4xl font-bold text-sollux-black">1,234</div>
            <p className="text-xs text-gray-500">+20.1% do mês passado</p>
          </CardContent>
        </Card>

        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 mb-4">
            <CardTitle className="text-lg font-medium text-sollux-black">Empresas Ativas</CardTitle>
            <Building2 className="h-5 w-5 text-sollux-red" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-4xl font-bold text-sollux-black">56</div>
            <p className="text-xs text-gray-500">+5.3% do mês passado</p>
          </CardContent>
        </Card>

        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 mb-4">
            <CardTitle className="text-lg font-medium text-sollux-black">Cargos Cadastrados</CardTitle>
            <Briefcase className="h-5 w-5 text-sollux-red" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-4xl font-bold text-sollux-black">189</div>
            <p className="text-xs text-gray-500">+12.8% do mês passado</p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de busca e filtro (mantendo o div pai, mas removendo o card de busca) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* O Card de busca foi removido daqui */}
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-4 flex items-center">
          <Button variant="ghost" className="text-sollux-black flex-1 justify-start">
            Filtrar por...
          </Button>
        </Card>
      </div>

      {/* Seção de navegação para Empresas e Usuários */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/id/companies">
          <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-6 flex items-center justify-between hover:shadow-xl transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <Building2 className="h-8 w-8 text-sollux-red" />
              <h2 className="text-2xl font-semibold text-sollux-black">Empresas</h2>
            </div>
            <Button variant="ghost" className="text-sollux-red">Ver todas</Button>
          </Card>
        </Link>
        <Link to="/id/users">
          <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-6 flex items-center justify-between hover:shadow-xl transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-sollux-red" />
              <h2 className="text-2xl font-semibold text-sollux-black">Usuários</h2>
            </div>
            <Button variant="ghost" className="text-sollux-red">Ver todos</Button>
          </Card>
        </Link>
      </div>

      {/* Seção de informações da empresa (exemplo) */}
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-2xl font-bold text-sollux-black">Informações da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-4 text-sollux-black">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-500" />
            <span>Nome da Empresa: Sollux Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span>Fundação: 2020</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            <span>Localização: São Paulo, Brasil</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-gray-500" />
            <span>Telefone: (11) 98765-4321</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-500" />
            <span>Email: contato@solluxflow.com</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-500" />
            <span>Website: www.solluxflow.com</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IdPage;