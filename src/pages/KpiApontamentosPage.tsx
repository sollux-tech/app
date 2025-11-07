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
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

interface FormDataState {
  value: string;
  note: string;
  date: Date | null;
}

const KpiApontamentosPage: React.FC = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiLiberated[]>([]);
  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({});
  const [formData, setFormData] = useState<Record<string, FormDataState>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditingAppointment, setIsEditingAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        console.log('KpiApontamentosPage: Starting fetchData, user.id:', user?.id); // DEBUG: Log user ID
        if (!user?.id) {
          console.log('KpiApontamentosPage: No user ID, setting empty data'); // DEBUG
          setKpis([]);
          setAppointments({});
          setLoading(false);
          return;
        }

        // KPIs liberados para o usuário
        console.log('KpiApontamentosPage: Fetching liberated KPIs for user:', user.id); // DEBUG
        const { data: liberated, error: liberatedError } = await supabase
          .from('kpi_smarts_liberated')
          .select('id, code, kpi_smart_id')
          .contains('execution_user_ids', [user.id]);

        console.log('KpiApontamentosPage: Liberated query result:', liberated, 'Error:', liberatedError); // DEBUG

        if (liberatedError) {
          console.error('KpiApontamentosPage: Liberated query error:', liberatedError); // DEBUG
          throw liberatedError;
        }

        let detailedKpis: KpiLiberated[] = [];
        if (liberated && liberated.length > 0) {
          console.log('KpiApontamentosPage: Found liberated KPIs, fetching details for IDs:', liberated.map(l => l.kpi_smart_id)); // DEBUG
          const smartIds = liberated.map(l => l.kpi_smart_id);
          const { data: kpiDetails, error: kpiErr } = await supabase
            .from('kpi_smarts')
            .select('id, description, kpi_smart_type_id, kpi_smart_unit_id')
            .in('id', smartIds);

          console.log('KpiApontamentosPage: KPI details result:', kpiDetails, 'Error:', kpiErr); // DEBUG

          if (kpiErr) {
            console.error('KpiApontamentosPage: KPI details query error:', kpiErr); // DEBUG
            throw kpiErr;
          }

          detailedKpis = liberated.map(l => ({
            ...l,
            kpi: kpiDetails?.find(k => k.id === l.kpi_smart_id) || null
          }));
          console.log('KpiApontamentosPage: Detailed KPIs:', detailedKpis); // DEBUG
        } else {
          console.log('KpiApontamentosPage: No liberated KPIs found'); // DEBUG
        }

        let allAppts: Record<string, Appointment[]> = {};
        if (liberated && liberated.length > 0) {
          const ids = liberated.map(l => l.id);
          console.log('KpiApontamentosPage: Fetching appointments for liberated IDs:', ids); // DEBUG
          const { data: appts, error: apptsError } = await supabase
            .from('kpi_apontamentos')
            .select('*')
            .in('kpi_smart_liberated_id', ids)
            .order('appointment_date', { ascending: false });

          console.log('KpiApontamentosPage: Appointments result:', appts, 'Error:', apptsError); // DEBUG

          if (apptsError) {
            console.error('KpiApontamentosPage: Appointments query error:', apptsError); // DEBUG
            throw apptsError;
          }
          ids.forEach(id => { allAppts[id] = []; });
          (appts || []).forEach((a) => { 
            allAppts[a.kpi_smart_liberated_id] = allAppts[a.kpi_smart_liberated_id] || []; 
            allAppts[a.kpi_smart_liberated_id].push(a); 
          });
          console.log('KpiApontamentosPage: All appointments:', allAppts); // DEBUG
        } else {
          console.log('KpiApontamentosPage: No liberated KPIs, no appointments to fetch'); // DEBUG
        }

        setKpis(detailedKpis);
        setAppointments(allAppts);
        console.log('KpiApontamentosPage: Data fetch completed. KPIs:', detailedKpis.length, 'Appointments:', Object.keys(allAppts).length); // DEBUG
      } catch (e: any) {
        console.error('KpiApontamentosPage: Fetch error:', e); // DEBUG
        setKpis([]);
        setAppointments({});
        setErrorMsg(e?.message || 'Erro inesperado ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const handleRegister = async (kpiId: string) => {
    const { value, note, date } = formData[kpiId] || {};
    if (!value) {
      showError('Preencha o valor.');
      return;
    }
    setSubmittingId(k<think>[REDACTED]</think><dyad-write path="src/pages/KpiApontamentosPage.tsx" description="Fix TS error: import ptBR as named export from date-fns/locale/pt-BR.">
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
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR'; // FIX: import ptBR as named export
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

interface FormDataState {
  value: string;
  note: string;
  date: Date | null;
}

const KpiApontamentosPage: React.FC = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiLiberated[]>([]);
  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({});
  const [formData, setFormData] = useState<Record<string, FormDataState>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditingAppointment, setIsEditingAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        console.log('KpiApontamentosPage: Starting fetchData, user.id:', user?.id);
        if (!user?.id) {
          console.log('KpiApontamentosPage: No user ID, setting empty data');
          setKpis([]);
          setAppointments({});
          setLoading(false);
          return;
        }

        console.log('KpiApontamentosPage: Fetching liberated KPIs for user:', user.id);
        const { data: liberated, error: liberatedError } = await supabase
          .from('kpi_smarts_liberated')
          .select('id, code, kpi_smart_id')
          .contains('execution_user_ids', [user.id]);

        console.log('KpiApontamentosPage: Liberated query result:', liberated, 'Error:', liberatedError);

        if (liberatedError) {
          console.error('KpiApontamentosPage: Liberated query error:', liberatedError);
          throw liberatedError;
        }

        let detailedKpis: KpiLiberated[] = [];
        if (liberated && liberated.length > 0) {
          console.log('KpiApontamentosPage: Found liberated KPIs, fetching details for IDs:', liberated.map(l => l.kpi_smart_id));
          const smartIds = liberated.map(l => l.kpi_smart_id);
          const { data: kpiDetails, error: kpiErr } = await supabase
            .from('kpi_smarts')
            .select('id, description, kpi_smart_type_id, kpi_smart_unit_id')
            .in('id', smartIds);

          console.log('KpiApontamentosPage: KPI details result:', kpiDetails, 'Error:', kpiErr);

          if (kpiErr) {
            console.error('KpiApontamentosPage: KPI details query error:', kpiErr);
            throw kpiErr;
          }

          detailedKpis = liberated.map(l => ({
            ...l,
            kpi: kpiDetails?.find(k => k.id === l.kpi_smart_id) || null
          }));
          console.log('KpiApontamentosPage: Detailed KPIs:', detailedKpis);
        } else {
          console.log('KpiApontamentosPage: No liberated KPIs found');
        }

        let allAppts: Record<string, Appointment[]> = {};
        if (liberated && liberated.length > 0) {
          const ids = liberated.map(l => l.id);
          console.log('KpiApontamentosPage: Fetching appointments for liberated IDs:', ids);
          const { data: appts, error: apptsError } = await supabase
            .from('kpi_apontamentos')
            .select('*')
            .in('kpi_smart_liberated_id', ids)
            .order('appointment_date', { ascending: false });

          console.log('KpiApontamentosPage: Appointments result:', appts, 'Error:', apptsError);

          if (apptsError) {
            console.error('KpiApontamentosPage: Appointments query error:', apptsError);
            throw apptsError;
          }
          ids.forEach(id => { allAppts[id] = []; });
          (appts || []).forEach((a) => { 
            allAppts[a.kpi_smart_liberated_id] = allAppts[a.kpi_smart_liberated_id] || []; 
            allAppts[a.kpi_smart_liberated_id].push(a); 
          });
          console.log('KpiApontamentosPage: All appointments:', allAppts);
        } else {
          console.log('KpiApontamentosPage: No liberated KPIs, no appointments to fetch');
        }

        setKpis(detailedKpis);
        setAppointments(allAppts);
        console.log('KpiApontamentosPage: Data fetch completed. KPIs:', detailedKpis.length, 'Appointments:', Object.keys(allAppts).length);
      } catch (e: any) {
        console.error('KpiApontamentosPage: Fetch error:', e);
        setKpis([]);
        setAppointments({});
        setErrorMsg(e?.message || 'Erro inesperado ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const handleRegister = async (kpiId: string) => {
    const { value, note, date } = formData[kpiId] || {};
    if (!value) {
      showError('Preencha o valor.');
      return;
    }
    setSubmittingId(kpiId);
    try {
      const { error } = await supabase
        .from('kpi_apontamentos')
        .insert({
          kpi_smart_liberated_id: kpiId,
          value: parseFloat(value),
          note: note || null,
          appointment_date: date ? formatDate(date, 'yyyy-MM-dd', { locale: ptBR }) : formatDate(new Date(), 'yyyy-MM-dd', { locale: ptBR }),
        });
      if (error) throw error;
      showSuccess('Apontamento registrado!');
      setFormData(prev => ({ ...prev, [kpiId]: { value: '', note: '', date: null } }));
      setLoading(true);
      setTimeout(() => setLoading(false), 500);
    } catch (err: any) {
      showError(err?.message || 'Erro ao registrar.');
    } finally {
      setSubmittingId(null);
    }
  };

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

  const handleEditAppointment = (appointment: Appointment) => {
    setFormData((prev) => ({
      ...prev,
      [appointment.kpi_smart_liberated_id]: {
        value: appointment.value?.toString() || '',
        note: appointment.note || '',
        date: new Date(appointment.appointment_date),
      },
    }));
    setIsEditingAppointment(appointment);
  };

  const updateFormData = (kpiId: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [kpiId]: { ...prev[kpiId], [field]: value },
    }));
  };

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
          {(kpis.length === 0) && !errorMsg && (
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
                    handleRegister(kpi.id);
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
                        onChange={e => updateFormData(kpi.id, 'value', e.target.value)}
                        required
                        className="w-32"
                      />
                    </div>
                    <div>
                      <Label>Data</Label>
                      <DatePicker
                        date={formData[kpi.id]?.date || new Date()}
                        setDate={date => updateFormData(kpi.id, 'date', date)}
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <Label>Nota</Label>
                      <Textarea
                        value={formData[kpi.id]?.note || ''}
                        onChange={e => updateFormData(kpi.id, 'note', e.target.value)}
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
                    <Button variant="link" onClick={() => navigate(`/ops/shift/kpi-apontamentos/${kpi.id}`)} className="text-sollux-red hover:text-red-700">
                      Ver todos
                    </Button>
                  </div>
                  {(appointments[kpi.id]?.length === 0) ? (
                    <div className="text-muted-foreground text-sm">Nenhum apontamento registrado ainda.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="p-1 text-left">Valor</TableHead>
                          <TableHead className="p-1 text-left">Data</TableHead>
                          <TableHead className="p-1 text-left">Nota</TableHead>
                          <TableHead className="p-1 text-left">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(appointments[kpi.id] || []).slice(0, 5).map(appt => (
                          <TableRow key={appt.id}>
                            <TableCell className="p-1 font-semibold">{appt.value}</TableCell>
                            <TableCell className="p-1">{formatDate(new Date(appt.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                            <TableCell className="p-1">{appt.note}</TableCell>
                            <TableCell className="p-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEditAppointment(appt)} className="text-blue-600 hover:bg-blue-50 rounded-lg">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(appt.id)} className="text-sollux-red hover:bg-red-50 rounded-lg">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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