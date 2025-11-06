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

// Add this type definition at the top of the file (after imports)
interface KpiSmartDetail {
  id: string;
  description: string;
  kpi_smart_type_id: string;
  kpi_smart_frequencies: { description: string }[]; // Array from Supabase join
}

interface Appointment {
  id: string;
  kpi_smart_liberated_id: string;
  value: number | null;
  note: string | null;
  appointment_date: string;
  created_at: string;
}

interface LiberatedKpi {
  id: string;
  code: number;
  kpi_smart: {
    id: string;
    description: string;
    kpi_smart_type_id: string;
  } | null;
  kpi_smart_frequency: {
    description: string;
  } | null;
  kpi_smart_type: {
    code: string; // Fixed: Changed from 'number' to 'string' to match kpi_smart_type_id (ID)
  };
  appointments: Appointment[];
}

const KpiApontamentosPage: React.FC = () => {
  const { user } = useSession();
  const [liberatedKpis, setLiberatedKpis] = useState<LiberatedKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState<Record<string, { value: string; note: string; date: Date | null }>>({});
  const [showMoreHistory, setShowMoreHistory] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLiberatedKpis();
  }, [user]);

  const fetchLiberatedKpis = async () => {
    if (!user?.id) {
      console.log('No user ID available, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log('Fetching liberated KPIs for user:', user.id);

    try {
      // Fixed: Use .contains() for array field execution_user_ids
      const { data: liberatedData, error: liberatedError } = await supabase
        .from('kpi_smarts_liberated')
        .select(`
          id,
          code,
          kpi_smart_id,
          kpi_smart_frequency_id,
          user_id,
          execution_user_ids,
          view_user_ids
        `)
        .contains('execution_user_ids', [user.id]) // Fixed: Correct array contains query for PostgreSQL array
        .order('created_at', { ascending: false });

      console.log('Raw liberated data from Supabase:', liberatedData);
      console.log('Liberated query error:', liberatedError);

      if (liberatedError) {
        console.error('Supabase liberated query error:', liberatedError);
        setError(`Erro ao buscar KPIs liberados: ${liberatedError.message}`);
        setLoading(false);
        return;
      }

      if (!liberatedData || liberatedData.length === 0) {
        console.log('No liberated KPIs found for user:', user.id);
        setLiberatedKpis([]);
        setLoading(false);
        return;
      }

      console.log('Found liberated KPIs:', liberatedData.length);

      // Fixed: Added 'description' to the select query
      const { data: kpiDetails, error: kpiError } = await supabase
        .from('kpi_smarts')
        .select(`
          id,
          description,
          kpi_smart_type_id,
          kpi_smart_frequencies(description)
        `)
        .in('id', liberatedData.map(l => l.kpi_smart_id)) as { data: KpiSmartDetail[]; error: any }; // Explicitly type as array

      console.log('Raw kpi details from Supabase:', kpiDetails);
      console.log('KPI details error:', kpiError);

      if (kpiError) {
        console.error('KPI details query error:', kpiError);
        setError(`Erro ao buscar detalhes dos KPIs: ${kpiError.message}`);
        setLoading(false);
        return;
      }

      // Ensure kpiDetails is always an array (handle empty case)
      const kpiDetailsArray: KpiSmartDetail[] = Array.isArray(kpiDetails) ? kpiDetails : [];

      // Fetch appointments for all liberated KPIs
      const liberatedIds = liberatedData.map(l => l.id);
      console.log('Fetching appointments for liberated IDs:', liberatedIds);

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('kpi_apontamentos')
        .select('*')
        .in('kpi_smart_liberated_id', liberatedIds)
        .order('appointment_date', { ascending: false });

      console.log('Raw appointments data from Supabase:', appointmentsData);
      console.log('Appointments error:', appointmentsError);

      if (appointmentsError) {
        console.error('Appointments query error:', appointmentsError);
        setError(`Erro ao buscar apontamentos: ${appointmentsError.message}`);
        setLoading(false);
        return;
      }

      // Process data with proper type handling - map to ensure structure
      const processedData: LiberatedKpi[] = liberatedData.map((kpi: any) => {
        // Fixed: Find the corresponding kpi detail from the array
        const kpiDetail = kpiDetailsArray.find((kd: KpiSmartDetail) => kd.id === kpi.kpi_smart_id);
        const frequency = kpiDetail?.kpi_smart_frequencies?.[0]?.description || null;

        console.log(`Processing KPI ${kpi.id}:`, { kpiDetail, frequency });

        return {
          id: kpi.id,
          code: kpi.code,
          kpi_smart: kpiDetail ? {
            id: kpiDetail.id,
            description: kpiDetail.description || 'N/A',
            kpi_smart_type_id: kpiDetail.kpi_smart_type_id || '1',
          } : null,
          kpi_smart_frequency: { description: frequency || 'Diário' },
          kpi_smart_type: { code: kpiDetail?.kpi_smart_type_id || '1' }, // Fixed: Use string ID consistently
          appointments: (appointmentsData || []).filter((appt: any) => appt.kpi_smart_liberated_id === kpi.id).map((appt: any) => ({
            ...appt,
            kpi_smart_liberated_id: kpi.id,
          })),
        };
      });

      console.log('Final processed KPIs:', processedData.length);
      setLiberatedKpis(processedData);

      if (processedData.length === 0) {
        console.warn('No KPIs found - check Supabase data and user permissions');
      }
    } catch (error) {
      console.error('Unexpected error in fetchLiberatedKpis:', error);
      setError(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const canMakeAppointment = async (kpiId: string, frequency: string): Promise<boolean> => {
    if (!user?.id) return false;

    const now = new Date();
    let daysBack = 1; // Default to daily

    switch (frequency) {
      case 'Diário': daysBack = 1; break;
      case 'Semanal': daysBack = 7; break;
      case 'Mensal': daysBack = 30; break;
      case 'Trimestral': daysBack = 90; break;
      case 'Anual': daysBack = 365; break;
      default: return true; // Allow if unknown
    }

    const { count, error } = await supabase
      .from('kpi_apontamentos')
      .select('id', { count: 'exact', head: true })
      .eq('kpi_smart_liberated_id', kpiId)
      .gte('appointment_date', format(subDays(now, daysBack), 'yyyy-MM-dd', { locale: ptBR }));

    if (error) {
      console.error('Erro ao verificar frequência:', error);
      return true; // Allow on error to avoid blocking
    }

    return count === 0; // Allow only if no recent appointment
  };

  const handleSubmitAppointment = async (kpiId: string, appointmentId?: string) => {
    const form = formData[kpiId];
    if (!form || !form.value) {
      showError('Por favor, insira um valor para o apontamento.');
      return;
    }

    const kpi = liberatedKpis.find(k => k.id === kpiId);
    if (!kpi?.kpi_smart_frequency?.description) {
      showError('Frequência não definida para este KPI.');
      return;
    }

    const canProceed = await canMakeAppointment(kpiId, kpi.kpi_smart_frequency.description);
    if (!canProceed) {
      showError(`Você só pode fazer apontamentos ${kpi.kpi_smart_frequency.description.toLowerCase()}. O último foi recente.`);
      return;
    }

    setSubmitting(kpiId);

    try {
      const payload = {
        kpi_smart_liberated_id: kpiId,
        user_id: user!.id,
        value: parseFloat(form.value) || null,
        note: form.note || null,
        appointment_date: form.date ? format(form.date, 'yyyy-MM-dd', { locale: ptBR }) : format(new Date(), 'yyyy-MM-dd', { locale: ptBR }),
      };

      let result;
      if (appointmentId) {
        result = await supabase
          .from('kpi_apontamentos')
          .update(payload)
          .eq('id', appointmentId)
          .eq('user_id', user!.id);
      } else {
        result = await supabase
          .from('kpi_apontamentos')
          .insert(payload);
      }

      if (result.error) throw result.error;

      showSuccess(appointmentId ? 'Apontamento atualizado!' : 'Apontamento salvo!');
      setFormData(prev => ({ ...prev, [kpiId]: { value: '', note: '', date: null } }));
      setEditingAppointment(null);
      fetchLiberatedKpis();
    } catch (error) {
      console.error('Erro ao salvar apontamento:', error);
      showError('Erro ao salvar apontamento.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData(prev => ({
      ...prev,
      [appointment.kpi_smart_liberated_id]: {
        value: appointment.value?.toString() || '',
        note: appointment.note || '',
        date: new Date(appointment.appointment_date),
      },
    }));
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este apontamento?')) return;

    try {
      const { error } = await supabase
        .from('kpi_apontamentos')
        .delete()
        .eq('id', appointmentId)
        .eq('user!.id', user!.id);

      if (error) throw error;

      showSuccess('Apontamento excluído!');
      fetchLiberatedKpis();
    } catch (error) {
      console.error('Erro ao excluir apontamento:', error);
      showError('Erro ao excluir apontamento.');
    }
  };

  const updateFormData = (kpiId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [kpiId]: { ...prev[kpiId], [field]: value },
    }));
  };

  const toggleHistory = (kpiId: string) => {
    setShowMoreHistory(prev => ({ ...prev, [kpiId]: !prev[kpiId] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-sollux-red mr-2" />
        <span>Carregando KPIs liberados...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 max-w-md text-center">
          <p className="text-destructive font-medium mb-2">Erro ao carregar KPIs</p>
          <p className="text-destructive-foreground text-sm">{error}</p>
          <Button 
            onClick={fetchLiberatedKpis} 
            variant="outline" 
            className="mt-4 bg-destructive/20 hover:bg-destructive/30 text-destructive-foreground"
          >
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-4 text-foreground">Apontamentos de KPIs</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Registre os dados para os KPIs designados a você. Considere a frequência de monitoramento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {liberatedKpis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum KPI designado encontrado. Verifique se você tem permissões de execução em KPIs liberados.</p>
              <Button onClick={fetchLiberatedKpis} variant="outline" className="mt-4">
                Atualizar Lista
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {liberatedKpis.map((kpi) => {
                const typeName = kpi.kpi_smart?.kpi_smart_type_id === '1' ? 'Quantitativo' : 
                                kpi.kpi_smart?.kpi_smart_type_id === '2' ? 'Marco' : 
                                kpi.kpi_smart?.kpi_smart_type_id === '3' ? 'Frequência' : 'Intervalo';
                const frequency = kpi.kpi_smart_frequency?.description || 'Diário';
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
                          {kpi.kpi_smart?.description || 'KPI Desconhecido'} ({typeName})
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{frequency}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {frequency !== 'N/A' ? `Próximo: a cada ${frequency.toLowerCase()}` : ''}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Formulário Dinâmico por Tipo */}
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-foreground mb-3">Novo Apontamento ({typeName})</h4>
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

                      {/* Fixed: Wrap Recharts in div to prevent DOM nesting warning */}
                      {chartData.length > 1 && (
                        <div className="h-64">
                          <h5 className="font-medium text-foreground mb-2">Evolução Recente</h5>
                          <div className="bg-white p-4 rounded-lg"> {/* Added wrapper div */}
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
                        </div>
                      )}

                      {/* Histórico - Fixed: Render note as plain text to avoid HTML nesting */}
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
                              <div className="flex-1 mb-3 md:mb-0"> {/* Add margin-bottom for mobile */}
                                <div className="font-medium text-foreground">Valor: {appt.value || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground"> {/* Changed p to div */}
                                  {format(new Date(appt.appointment_date), 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                                  {appt.note ? (
                                    // If note might contain HTML, use a span instead of div inside p
                                    <span className="font-medium" dangerouslySetInnerHTML={{ __html: appt.note }} />
                                  ) : (
                                    'Sem observação'
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