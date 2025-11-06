import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import DatePicker from '@/components/DatePicker';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Trash2, TrendingUp } from 'lucide-react';
import { format as formatDate, ptBR } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';

type SimpleKpi = {
  id: string;
  description: string;
  kpi_smart_type_id: string;
  kpi_smart_unit_id?: string;
};

type KpiLiberated = {
  id: string;
  kpi_smart_id: string;
  code: number;
  kpi: SimpleKpi | null;
};

type Appointment = {
  id: string;
  kpi_smart_liberated_id: string;
  value: number | null;
  note: string | null;
  appointment_date: string;
};

const KpiApontamentosPage: React.FC = () => {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiLiberated[]>([]);
  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({});
  const [formData, setFormData] = useState<Record<string, { value: string; note: string; date: Date | null }>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carrega KPIs liberados e seus apontamentos do usuário
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        if (!user?.id) {
          setKpis([]);
          setAppointments({});
          setLoading(false);
          return;
        }

        // KPIs liberados para o usuário
        const { data: liberated, error: liberatedError } = await supabase
          .from('kpi_smarts_liberated')
          .select('id, code, kpi_smart_id')
          .contains('execution_user_ids', [user.id]);

        if (liberatedError) throw liberatedError;

        let detailedKpis: KpiLiberated[] = [];
        if (liberated && liberated.length > 0) {
          // Busca todos os KPIs smart de uma vez
          const smartIds = liberated.map(l => l.kpi_smart_id);
          const { data: kpiDetails, error: kpiErr } = await supabase
            .from('kpi_smarts')
            .select('id, description, kpi_smart_type_id, kpi_smart_unit_id')
            .in('id', smartIds);

          if (kpiErr) throw kpiErr;

          detailedKpis = liberated.map(l => ({
            ...l,
            kpi: kpiDetails?.find(k => k.id === l.kpi_smart_id) || null
          }));
        }

        // Carrega apontamentos para cada kpi liberado do usuário
        let allAppts: Record<string, Appointment[]> = {};
        if (liberated && liberated.length > 0) {
          const ids = liberated.map(l => l.id);
          const { data: appts, error: apptsError } = await supabase
            .from('kpi_apontamentos')
            .select('*')
            .in('kpi_smart_liberated_id', ids)
            .order('appointment_date', { ascending: false });

          if (apptsError) throw apptsError;
          // Agrupa por KPI id
          ids.forEach(id => { allAppts[id] = []; });
          (appts || []).forEach((a) => { allAppts[a.kpi_smart_liberated_id] = allAppts[a.kpi_smart_liberated_id] || []; allAppts[a.kpi_smart_liberated_id].push(a); });
        }

        setKpis(detailedKpis);
        setAppointments(allAppts);
      } catch (e: any) {
        setKpis([]);
        setAppointments({});
        setErrorMsg(e?.message || 'Erro inesperado ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line
  }, [user?.id]);

  // CRUD - registrar novo apontamento
  const handleRegister = async (kpi: KpiLiberated) => {
    const { value, note, date } = formData[kpi.id] || {};
    if (!value) {
      showError('Preencha o valor.');
      return;
    }
    setSubmittingId(kpi.id);
    try {
      const { error } = await supabase
        .from('kpi_apontamentos')
        .insert({
          kpi_smart_liberated_id: kpi.id,
          value: parseFloat(value),
          note: note || null,
          appointment_date: date ? formatDate(date, 'yyyy-MM-dd') : formatDate(new Date(), 'yyyy-MM-dd'),
        });
      if (error) throw error;
      showSuccess('Apontamento registrado!');
      setFormData(prev => ({ ...prev, [kpi.id]: { value: '', note: '', date: null } }));
      // Força reload para appointments
      setLoading(true);
      setTimeout(() => setLoading(false), 500); // O useEffect já fará reload
    } catch (err: any) {
      showError(err?.message || 'Erro ao registrar.');
    } finally {
      setSubmittingId(null);
    }
  };

  // CRUD - deletar apontamento
  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir apontamento?')) return;
    try {
      const { error } = await supabase.from('kpi_apontamentos').delete().eq('id', id);
      if (error) throw error;
      showSuccess('Apontamento excluído!');
      setLoading(true);
      setTimeout(() => setLoading(false), 500);
    } catch (e: any) {
      showError(e?.message || 'Erro ao excluir.');
    }
  };

  // Helper para texto do tipo de KPI
  const getTypeName = (typeId?: string) => {
    switch (typeId) {
      case '1': return 'Quantitativo';
      case '2': return 'Marco';
      case '3': return 'Frequência';
      case '4': return 'Intervalo';
      default:  return 'Outro';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sollux-red mr-2" />
        <span className="text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-foreground">Apontamentos de KPIs</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Registre e visualize seus apontamentos de KPIs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="mb-4 text-red-700 bg-red-50 border border-red-300 rounded p-3">
              {errorMsg}
            </div>
          )}
          {(kpis.length === 0) && (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum KPI disponível para apontamento.<br />
              Fale com seu gestor para liberar KPIs para você na plataforma.
            </div>
          )}
          {kpis.map(kpi => (
            <Card key={kpi.id} className="mb-8 border shadow rounded-xl bg-muted">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">{kpi.kpi?.description || 'KPI não encontrado'}</CardTitle>
                  <Badge>{getTypeName(kpi.kpi?.kpi_smart_type_id)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleRegister(kpi);
                  }}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <Label>Valor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData[kpi.id]?.value || ''}
                        onChange={e => setFormData(f => ({ ...f, [kpi.id]: { ...f[kpi.id], value: e.target.value } }))}
                        required
                        className="w-32"
                      />
                    </div>
                    <div>
                      <Label>Data</Label>
                      <DatePicker
                        date={formData[kpi.id]?.date || new Date()}
                        setDate={date => setFormData(f => ({ ...f, [kpi.id]: { ...f[kpi.id], date } }))}
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <Label>Nota</Label>
                      <Textarea
                        value={formData[kpi.id]?.note || ''}
                        onChange={e => setFormData(f => ({ ...f, [kpi.id]: { ...f[kpi.id], note: e.target.value } }))}
                        placeholder="Comentário opcional"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div>
                    <Button
                      type="submit"
                      disabled={submittingId === kpi.id}
                      className="bg-sollux-red hover:bg-sollux-orange rounded-lg"
                    >
                      {submittingId === kpi.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                      Registrar apontamento
                    </Button>
                  </div>
                </form>

                {/* Histórico de apontamentos */}
                <div className="mt-6">
                  <div className="mb-2 flex justify-between items-center">
                    <div className="font-semibold text-foreground">Histórico recente</div>
                    {/* botão para recarregar, se quiser */}
                  </div>
                  {(appointments[kpi.id]?.length === 0) ? (
                    <div className="text-muted-foreground text-sm">Nenhum apontamento registrado ainda.</div>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="p-1 text-left">Valor</th>
                          <th className="p-1 text-left">Data</th>
                          <th className="p-1 text-left">Nota</th>
                          <th className="p-1 text-left">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(appointments[kpi.id] || []).slice(0, 5).map(appt => (
                          <tr key={appt.id}>
                            <td className="p-1 font-semibold">{appt.value}</td>
                            <td className="p-1">{formatDate(new Date(appt.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}</td>
                            <td className="p-1">{appt.note}</td>
                            <td className="p-1">
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(appt.id)}>
                                <Trash2 className="h-4 w-4 text-sollux-red" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default KpiApontamentosPage;