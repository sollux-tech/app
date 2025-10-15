import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { FormResponse, Question } from '@/types/form';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Search, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const FormResponsesPage: React.FC = () => {
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [formDetail, setFormDetail] = useState<any>(null); // Usar 'any' temporariamente para o formDetail
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);

  const fetchFormAndResponses = async () => {
    try {
      // Buscar detalhes do formulário
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError) throw formError;
      setFormDetail(formData);
      setQuestions(formData.questions || []);

      // Buscar respostas
      const { data: responsesData, error: responsesError } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);
    } catch (error: any) {
      showError(`Erro ao carregar dados do formulário: ${error.message}`);
      navigate('/forms');
    }
  };

  useEffect(() => {
    if (formId) {
      fetchFormAndResponses();
    }
  }, [formId]);

  const handleExportCSV = async () => {
    try {
      if (responses.length === 0) {
        showError('Nenhuma resposta para exportar.');
        return;
      }

      const headers = ['ID', 'Data de Envio', ...questions.map(q => q.title)];
      const csvContent = [
        headers.join(','),
        ...responses.map(response => [
          response.id,
          format(new Date(response.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          ...questions.map(question => {
            const value = response.responses[question.id];
            if (value === undefined || value === null) return '';
            
            // Tratar diferentes tipos de respostas
            if (Array.isArray(value)) {
              return value.join('; ');
            }
            
            // Escapar aspas duplas e envolver em aspas se contiver vírgula ou aspas
            let stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"')) {
              stringValue = `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `respostas_${formDetail?.title || formId}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      showSuccess('CSV exportado com sucesso!');
    } catch (error: any) {
      showError(`Erro ao exportar CSV: ${error.message}`);
    }
  };

  const filteredResponses = responses.filter(response => {
    if (!searchTerm) return true;
    
    return questions.some(question => {
      const value = response.responses[question.id];
      if (!value) return false;
      
      const searchValue = String(value).toLowerCase();
      return searchValue.includes(searchTerm.toLowerCase());
    });
  });

  const formatResponseValue = (questionId: string, value: any) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return String(value);

    if (value === undefined || value === null) return 'N/A';

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    switch (question.type) {
      case 'rating':
        return `${value} estrela${value > 1 ? 's' : ''}`;
      case 'date':
        return value ? format(new Date(value), 'dd/MM/yyyy', { locale: ptBR }) : '';
      case 'checkbox':
      case 'multiselect':
        // Para checkboxes e multiselects, se o valor for um array de objetos { checked: boolean, value: string }
        // ou apenas um array de strings, formatar adequadamente.
        if (Array.isArray(value) && value.every(item => typeof item === 'object' && 'value' in item)) {
          return value.filter(item => item.checked).map(item => item.value).join(', ');
        }
        return Array.isArray(value) ? value.join(', ') : String(value);
      default:
        return String(value);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Respostas do Formulário</CardTitle>
            <p className="text-muted-foreground">
              {formDetail?.title || 'Formulário'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/connect/forms')}
              className="rounded-lg"
            >
              Voltar
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={responses.length === 0}
              className="bg-sollux-red hover:bg-sollux-orange text-white rounded-lg"
            >
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar respostas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>
          </div>

          {filteredResponses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {responses.length === 0 ? 'Nenhuma resposta encontrada' : 'Nenhuma resposta encontrada para a busca'}
              </h3>
              <p className="text-muted-foreground">
                {responses.length === 0 
                  ? 'Seu formulário ainda não recebeu respostas.' 
                  : 'Tente ajustar seus termos de busca.'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">ID</TableHead>
                  <TableHead className="text-foreground">Data de Envio</TableHead>
                  <TableHead className="text-foreground">Prévia das Respostas</TableHead>
                  <TableHead className="text-right text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell className="font-mono text-sm text-foreground">
                      {response.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(response.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm text-muted-foreground">
                        {questions.slice(0, 2).map((question, index) => (
                          <div key={question.id}>
                            <span className="font-medium text-foreground">{question.title}:</span>{' '}
                            {formatResponseValue(question.id, response.responses[question.id])}
                            {index < Math.min(2, questions.length) - 1 && <br />}
                          </div>
                        ))}
                        {questions.length > 2 && (
                          <div className="text-muted-foreground">
                            + {questions.length - 2} mais...
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedResponse(response);
                          setIsResponseDialogOpen(true);
                        }}
                        className="text-foreground hover:bg-accent rounded-lg"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes da Resposta */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detalhes da Resposta</DialogTitle>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">ID da Resposta:</span>
                    <p className="font-mono text-foreground">{selectedResponse.id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Data de Envio:</span>
                    <p className="text-foreground">
                      {format(new Date(selectedResponse.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Respostas</h3>
                {questions.map((question) => (
                  <div key={question.id} className="border-b border-border pb-4 last:border-b-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-foreground">{question.title}</h4>
                      {question.required && (
                        <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {formatResponseValue(question.id, selectedResponse.responses[question.id])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResponseDialogOpen(false)}
              className="rounded-lg"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormResponsesPage;