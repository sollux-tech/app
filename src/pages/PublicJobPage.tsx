import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Briefcase, Building, Calendar, FileText, Globe, MapPin, DollarSign, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface PublicJobDetails {
  title: string;
  city: string | null;
  state: string | null;
  short_summary: string | null;
  detailed_description: string | null;
  mandatory_requirements: string[] | null;
  differential_requirements: string[] | null;
  benefits: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  hashtags: string[] | null;
  created_at: string;
  company_name: string;
  job_sector_name: string;
  contract_type_name: string;
  work_model_name: string;
}

const PublicJobPage: React.FC = () => {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: job, isLoading, error } = useQuery<PublicJobDetails, Error>({
    queryKey: ['publicJob', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("ID da vaga está faltando.");
      const { data, error } = await supabase.rpc('get_public_job_details', {
        job_id_param: jobId,
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Vaga não encontrada ou não está mais ativa.");
      return data[0];
    },
    enabled: !!jobId,
    retry: false,
  });

  const renderDetailItem = (Icon: React.ElementType, label: string, value: string | null | undefined) => {
    if (!value) return null;
    return (
      <div className="flex items-center gap-2 text-gray-700">
        <Icon className="h-5 w-5 text-sollux-red" />
        <span><strong>{label}:</strong> {value}</span>
      </div>
    );
  };

  const renderListSection = (title: string, items: string[] | null) => {
    if (!items || items.length === 0) return null;
    return (
      <div>
        <h3 className="text-xl font-semibold text-sollux-black mb-2">{title}</h3>
        <ul className="list-disc list-inside space-y-1">
          {items.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sollux-light-gray">
        <p className="text-gray-600">Carregando vaga...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sollux-light-gray">
        <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-red">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">Não foi possível carregar a vaga: {error.message}</p>
            <Button onClick={() => navigate('/')} className="mt-4 inline-flex items-center rounded-lg bg-sollux-red hover:bg-sollux-orange">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sollux-light-gray py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border p-8">
        <CardHeader className="text-center pb-6 border-b border-gray-200">
          <CardTitle className="text-4xl font-bold text-sollux-black mb-2">{job.title}</CardTitle>
          <CardDescription className="text-gray-600 text-lg">
            {job.company_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
            {renderDetailItem(Building, "Empresa", job.company_name)}
            {renderDetailItem(MapPin, "Localização", job.city && job.state ? `${job.city}, ${job.state}` : job.city || job.state)}
            {renderDetailItem(Briefcase, "Área", job.job_sector_name)}
            {renderDetailItem(FileText, "Contrato", job.contract_type_name)}
            {renderDetailItem(Globe, "Modelo", job.work_model_name)}
            {renderDetailItem(Calendar, "Publicado em", format(new Date(job.created_at), 'dd/MM/yyyy', { locale: ptBR }))}
          </div>

          {job.short_summary && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-900">{job.short_summary}</p>
            </div>
          )}

          <div>
            <h3 className="text-xl font-semibold text-sollux-black mb-2">Descrição da Vaga</h3>
            <div className="prose max-w-none text-sollux-black" dangerouslySetInnerHTML={{ __html: job.detailed_description || '' }} />
          </div>

          {renderListSection("Requisitos Obrigatórios", job.mandatory_requirements)}
          {renderListSection("Diferenciais", job.differential_requirements)}
          {renderListSection("Benefícios", job.benefits)}

          {(job.salary_min || job.salary_max) && (
            <div className="flex items-center gap-2 text-gray-700">
              <DollarSign className="h-5 w-5 text-sollux-red" />
              <span><strong>Faixa Salarial:</strong> {job.salary_min && `R$ ${job.salary_min}`} {job.salary_min && job.salary_max && ' - '} {job.salary_max && `R$ ${job.salary_max}`}</span>
            </div>
          )}

          {job.hashtags && job.hashtags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-5 w-5 text-sollux-red" />
              {job.hashtags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
          )}
        </CardContent>
        <div className="mt-8 text-center">
          <Button onClick={() => navigate('/')} className="inline-flex items-center rounded-lg bg-sollux-red hover:bg-sollux-orange">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o início
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PublicJobPage;