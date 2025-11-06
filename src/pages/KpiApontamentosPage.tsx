import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import DatePicker from '@/components/DatePicker'; // Fixed: Default import for DatePicker
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const KpiApontamentosPage: React.FC = () => {
  const { user } = useSession();
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({}); // Estado para os formulários de apontamento

  useEffect(() => {
    fetchKpis();
  }, []);

  const fetchKpis = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('kpi_smarts_liberated') // Assumindo tabela de KPIs liberados
      .select(`
        *,
        kpi_smarts(*),
        users(id, full_name)
      `)
      .eq('user_id', user.id) // KPIs designados ao usuário atual
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar KPIs:', error);
      setLoading(false);
      return;
    }

    setKpis(data || []);
    setLoading(false);
  };

  const handleSubmitApontamento = async (kpiId) => {
    if (!user) return;

    const { value, note, date } = formData[kpiId] || {};
    if (!value) {
      alert('Por favor, insira um valor para o apontamento.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('kpi_apontamentos') // Nova tabela para apontamentos (crie no Supabase)
      .insert({
        kpi_smart_id: kpiId,
        user_id: user.id,
        value,
        note,
        date: date || new Date().toISOString(),
      });

    if (error) {
      console.error('Erro ao salvar apontamento:', error);
      alert('Erro ao salvar apontamento.');
    } else {
      alert('Apontamento salvo com sucesso!');
      setFormData(prev => ({ ...prev, [kpiId]: { value: '', note: '', date: null } })); // Limpa o form
      fetchKpis(); // Recarrega a lista
    }

    setSubmitting(false);
  };

  if (loading) {
    return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-4 text-foreground">Apontamentos de KPIs</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Registre os dados para os KPIs designados a você.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kpis.length === 0 ? (
            <p className="text-muted-foreground">Nenhum KPI designado encontrado.</p>
          ) : (
            <div className="space-y-4">
              {kpis.map((kpi) => (
                <Card key={kpi.id} className="p-4 border border-border rounded-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">
                      {kpi.kpi_smarts.description} ({kpi.kpi_smarts.kpi_smart_types?.description})
                    </CardTitle>
                    <Badge variant="secondary">{kpi.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Valor Atual</Label>
                        <Input
                          type="number"
                          placeholder="Ex: 10.5"
                          value={formData[kpi.id]?.value || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            [kpi.id]: { ...prev[kpi.id], value: e.target.value }
                          }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Nota/Observação</Label>
                        <Textarea
                          placeholder="Descreva o apontamento..."
                          value={formData[kpi.id]?.note || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            [kpi.id]: { ...prev[kpi.id], note: e.target.value }
                          }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Data do Apontamento</Label>
                        <DatePicker
                          date={formData[kpi.id]?.date || new Date()} // Fixed: Changed 'selected' to 'date'
                          setDate={(date) => setFormData(prev => ({ // Fixed: Changed 'onSelect' to 'setDate'
                            ...prev,
                            [kpi.id]: { ...prev[kpi.id], date }
                          }))}
                          // Removed: className="mt-1" - DatePicker doesn't support this prop
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => handleSubmitApontamento(kpi.id)}
                      disabled={submitting}
                      className="mt-4 bg-sollux-red hover:bg-sollux-orange text-white"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar Apontamento
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KpiApontamentosPage;