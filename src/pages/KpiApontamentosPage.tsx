import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import DatePicker from '@/components/DatePicker';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Trash2, Calendar, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { showSuccess, showError } from '@/utils/toast';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos simplificados para evitar problemas de join
interface SimpleKpi {
  id: string;
  code: number;
  description: string;
  type: string; // 'Quantitativo', 'Marco', 'Frequência', 'Intervalo'
  frequency: string; // 'Diário', 'Semanal', etc.
}

interface SimpleAppointment {
  id: string;
  value: number | null;
  note: string | null;
  appointment_date: string;
  created_at: string;
}

interface LiberatedKpi {
  id: string;
  code: number;
  kpi: SimpleKpi;
  appointments: SimpleAppointment[];
}

const KpiApontamentosPage: React.FC = () => {
  const { user } = useSession();
  const [liberatedKpis, setLiberatedKpis] = useState<LiberatedKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, { value: string; note: string; date: Date | null }>>({});
  const [showMoreHistory, setShowMoreHistory] = useState<Record<string, boolean>>({});

  // Função para buscar KPIs liberados (simplificada)
  const fetchLiberatedKpis = async () => {
    if (!user?.id) {
      console.log('KpiApontamentosPage: No user ID, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log('KpiApontamentosPage: Starting fetch for user:', user.id);

    try {
      // Passo 1: Buscar KPIs liberados onde o usuário está na lista de execução
      const { data: liberatedData, error: liberatedError } = await supabase
        .from('kpi_smarts_liberated')
        .select(`
          id,
          code,
          kpi_smart_id,
          kpi_smart_frequency_id
        `)
        .contains('execution_user_ids', [user.id])
        .order('created_at', { ascending: false });

      console.log('KpiApontamentosPage: Liberated data:', liberatedData);
      if (liberatedError) {
        console.error('KpiApontamentosPage: Error fetching liberated KPIs:', liberatedError);
        setError(`Erro ao buscar KPIs liberados: ${liberatedError.message}`);
        setLoading(false);
        return;
      }

      if (!liberatedData || liberatedData.length === 0) {
        console.log('KpiApontamentosPage: No liberated KPIs found');
        setLiberatedKpis([]);
        setLoading(false);
        return;
      }

      // Passo 2: Buscar detalhes dos KPIs (simples, sem joins complexos)
      const kpiIds = liberatedData.map(l => l.kpi_smart_id);
      const { data: kpiDetails, error: kpiError } = await supabase
        .from('kpi_smarts')
        .select(`
          id,
          code,
          description,
          kpi_smart_type_id
        `)
        .in('id', kpiIds);

      console.log('KpiApontamentosPage: KPI details:', kpiDetails);
      if (kpiError) {
        console.error('KpiApontamentosPage: Error fetching KPI details:', kpiError);
        setError(`Erro ao buscar detalhes dos KPIs: ${kpiError.message}`);
        setLoading(false);
        return;
      }

      // Passo 3: Buscar frequências
      const frequencyIds = liberatedData.map(l => l.kpi_smart_frequency_id).filter(Boolean);
      const { data: frequencies, error: freqError } = await supabase
        .from('kpi_smart_frequencies')
        .select('id, description')
        .in('id', frequencyIds);

      console.log('KpiApontamentosPage: Frequencies:', frequencies);
      if (freqError) {
        console.error('KpiApontamentosPage: Error fetching frequencies:', freqError);
        setError(`Erro ao buscar frequências: ${freqError.message}`);
        setLoading(false);
        return;
      }

      // Passo 4: Buscar apontamentos para todos os KPIs liberados
      const liberatedIds = liberatedData.map(l => l.id);
      const { data: appointmentsData, error: apptError } = await supabase
        .from('kpi_apontamentos')
        .select('*')
        .in('kpi_smart_liberated_id', liberatedIds)
        .order('appointment_date', { ascending: false });

      console.log('KpiApontamentosPage: Appointments:', appointmentsData);
      if (apptError) {
        console.error('KpiApontamentosPage: Error fetching appointments:', apptError);
        setError(`Erro ao buscar apontamentos: ${apptError.message}`);
        setLoading(false);
        return;
      }

      // Processar dados (simples)
      const processedKpis: LiberatedKpi[] = liberatedData.map(liberated => {
        const kpiDetail = kpiDetails?.find(k => k.id === liberated.kpi_smart_id);
        const frequencyDetail = frequencies?.find(f => f.id === liberated.kpi_smart_frequency_id);
        const kpiType = kpiDetail?.kpi_smart_type_id || '1'; // Default to 'Quantitativo'

        const typeName = kpiType === '1' ? 'Quantitativo' : 
                        kpiType === '2' ? 'Marco' : 
                        kpiType === '3' ? 'Frequência' : 'Intervalo';

        const appointments = appointmentsData?.filter(a => a.kpi_smart_liberated_id === liberated.id) || [];

        return {
          id: liberated.id,
          code: liberated.code,
          kpi: {
            id: kpiDetail?.id || '',
            code: kpiDetail?.code || 0,
            description: kpiDetail?.description || 'KPI Desconhecido',
            type: typeName,
          },
          frequency: frequencyDetail?.description || 'Diário',
          appointments,
        };
      });

      console.log('KpiApontamentosPage: Processed KPIs:', processedKpis);
      setLiberatedKpis(processedKpis);
    } catch (err) {
      console.error('KpiApontamentosPage: Unexpected error:', err);
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Função para submeter apontamento (simplificada)
  const handleSubmitAppointment = async (kpiId: string, appointmentId?: string) => {
    const form = formData[kpiId];
    if (!form || !form.value) {
      showError('Por favor, insira um valor para o apontamento.');
      return;
    }

    setSubmitting(kpiId);

    try {
      const payload = {
        kpi_smart_liberated_id: kpiId,
        value: parseFloat(form.value) || null,
        note: form.note || null,
        appointment_date: form.date ? format(form.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      };

      let result;
      if (appointmentId) {
        result = await supabase
          .from('kpi_apontamentos')
          .update(payload)
          .eq('id', appointmentId);
      } else {
        result = await supabase
          .from('kpi_apontamentos')
          .insert(payload);
      }

      if (result.error) throw result.error;

      showSuccess(appointmentId ? 'Apontamento atualizado!' : 'Apontamento salvo!');
      setFormData(prev => ({ ...prev, [kpiId]: { value: '', note: '', date: null } }));
      fetchLiberatedKpis(); // Recarregar dados
    } catch (error) {
      console.error('KpiApontamentosPage: Error submitting appointment:', error);
      showError('Erro ao salvar apontamento.');
    } finally {
      setSubmitting(null);
    }
  };

  // Função para deletar apontamento
  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este apontamento?')) return;

    try {
      const { error } = await supabase
        .from('kpi_apontamentos')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      showSuccess('Apontamento excluído!');
      fetchLiberatedKpis(); // Recarregar dados
    } catch (error) {
      console.error('KpiApontamentosPage: Error deleting appointment:', error);
      showError('Erro ao excluir apontamento.');
    }
  };

  // Função para editar apontamento
  const handleEditAppointment = (appointment: SimpleAppointment) => {
    setFormData(prev => ({
      ...prev,
      [appointment.kpi_smart_liberated_id]: {
        value: appointment.value?.toString() || '',
        note: appointment.note || '',
        date: new Date(appointment.appointment_date),
      },
    }));
  };

  // Função para atualizar form data
  const updateFormData = (kpiId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [kpiId]: { ...prev[kpiId], [field]: value },
    }));
  };

  // Função para toggle histórico
  const toggleHistory = (kpiId: string) => {
    setShowMoreHistory(prev => ({ ...prev, [kpiId]: !prev[kpiId] }));
  };

  console.log('KpiApontamentosPage: Render - Loading:', loading, 'Error:', error, 'Kpis count:', liberatedKpis.length);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-sollux-red mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando KPIs liberados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchLiberatedKpis} variant="outline">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-foreground">Apontamentos de KPIs</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Registre os dados para os KPIs designados a você.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {liberatedKpis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum KPI designado encontrado. Verifique se há KPIs liberados para você.</p>
              <Button onClick={fetchLiberatedKpis} variant="outline" className="mt-4">
                Atualizar Lista
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {liberatedKpis.map((kpi) => {
                const recentAppointments = kpi.appointments.slice(0, showMoreHistory[kpi.id] ? undefined : 5);
                const chartData = recentAppointments.map(appt => ({
                  date: format(new Date(appt.appointment_date), 'dd/MM', { locale: ptBR }),
                  value: appt.value || 0,
                }));

                return (
                  <Card key={kpi.id} className="p-6 border border-border rounded-2xl">
                    <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold text-foreground">
                          {kpi.kpi.description} ({kpi.kpi.type})
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{kpi.frequency}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {kpi.frequency !== 'Diário' ? `Próximo: a cada ${kpi.frequency.toLowerCase()}` : ''}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Formulário para novo apontamento */}
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-foreground mb-3">Novo Apontamento</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label>Valor</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 10.5"
                              value={formData[kpi.id]?.value || ''}
                              onChange={(e) => updateFormData(kpi.id, 'value', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Data</Label>
                            <DatePicker
                              date={formData[kpi.id]?.date || new Date()}
                              setDate={(date) => updateFormData(kpi.id, 'date', date)}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Observação</Label>
                            <Textarea
                              placeholder="Descreva o apontamento..."
                              value={formData[kpi.id]?.note || ''}
                              onChange={(e) => updateFormData(kpi.id, 'note', e.target.value)}
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSubmitAppointment(kpi.id)}
                          disabled={submitting === kpi.id || !formData[kpi.id]?.value}
                          className="mt-3 bg-sollux-red hover:bg-sollux-orange"
                        >
                          {submitting === kpi.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                          Registrar
                        </Button>
                      </div>

                      {/* Gráfico de evolução (simples) */}
                      {chartData.length > 1 && (
                        <div className="h-64">
                          <h5 className="font-medium text-foreground mb-2">Evolução Recente</h5>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="value" stroke="#E53935" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Histórico */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-foreground">Histórico de Apontamentos</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleHistory(kpi.id)}
                          >
                            {showMoreHistory[kpi.id] ? 'Ver Menos' : 'Ver Mais'}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {recentAppointments.map((appt) => (
                            <div key={appt.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex-1 mb-3 md:mb-0">
                                <div className="font-medium text-foreground">Valor: {appt.value || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(appt.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
                                  {appt.note && (
                                    <span className="block md:inline-block"> - {appt.note}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditAppointment(appt)}
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteAppointment(appt.id)}
                                  className="bg-sollux-red hover:bg-red-700 text-white"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KpiApontamentosPage;