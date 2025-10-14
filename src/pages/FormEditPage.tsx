import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Form as FormType, Question } from '@/types/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { Plus, Trash2, GripVertical } from 'lucide-react';

// Define um tipo base para a pergunta, omitindo o 'id' que é gerado no momento da adição
interface QuestionBase {
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'date' | 'rating';
  title: string;
  description?: string;
  required: boolean;
  options?: string[]; // Para select, multiselect, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Definir QuestionFormDataInferred como QuestionBase para garantir consistência
type QuestionFormDataInferred = QuestionBase;

const questionSchema = z.object({ // Removida a anotação de tipo explícita aqui
  type: z.enum(['text', 'email', 'number', 'textarea', 'select', 'multiselect', 'radio', 'checkbox', 'date', 'rating']),
  title: z.string().min(1, { message: 'O título da pergunta é obrigatório.' }),
  description: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    min: z.coerce.number().optional(), // Usar coerce para garantir que seja número
    max: z.coerce.number().optional(), // Usar coerce para garantir que seja número
    pattern: z.string().optional(),
  }).optional(),
});

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título do formulário é obrigatório.' }),
  description: z.string().optional(),
});

const FormEditPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const { data: formDetail, isLoading, error } = useQuery<FormType, Error>({
    queryKey: ['form', formId],
    queryFn: async () => {
      if (!formId) throw new Error("ID do formulário está faltando.");
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!formId,
  });

  useEffect(() => {
    if (formDetail) {
      form.reset({
        title: formDetail.title,
        description: formDetail.description || '',
      });
      setQuestions(formDetail.questions || []);
    }
  }, [formDetail, form]);

  const updateFormMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; questions: Question[] }) => {
      if (!formId) throw new Error("ID do formulário está faltando.");
      const { error } = await supabase
        .from('forms')
        .update({
          title: data.title,
          description: data.description,
          questions: data.questions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', formId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form', formId] });
      queryClient.invalidateQueries({ queryKey: ['forms', selectedCompany?.id] });
      showSuccess('Formulário atualizado com sucesso!');
    },
    onError: (error) => {
      showError(`Erro ao atualizar formulário: ${error.message}`);
    },
  });

  const publishFormMutation = useMutation({
    mutationFn: async () => {
      if (!formId) throw new Error("ID do formulário está faltando.");
      const { error } = await supabase
        .from('forms')
        .update({ status: 'published' })
        .eq('id', formId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form', formId] });
      queryClient.invalidateQueries({ queryKey: ['forms', selectedCompany?.id] });
      showSuccess('Formulário publicado com sucesso!');
      navigate('/forms');
    },
    onError: (error) => {
      showError(`Erro ao publicar formulário: ${error.message}`);
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateFormMutation.mutate({
      title: data.title, // Garantir que title é sempre string
      description: data.description, // Pode ser undefined
      questions,
    });
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setIsQuestionDialogOpen(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setIsQuestionDialogOpen(true);
  };

  const handleDeleteQuestion = (index: number) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    setQuestions(newQuestions);
  };

  const handleSaveQuestion = (questionData: QuestionFormDataInferred) => {
    if (editingQuestion) {
      // Editar pergunta existente
      const newQuestions = questions.map((q) =>
        q.id === editingQuestion.id ? { ...q, ...questionData } : q
      );
      setQuestions(newQuestions);
    } else {
      // Adicionar nova pergunta
      const newQuestion: Question = {
        id: `question_${Date.now()}`,
        ...questionData,
      };
      setQuestions([...questions, newQuestion]);
    }
    setIsQuestionDialogOpen(false);
    setEditingQuestion(null);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newQuestions = [...questions];
    const [reorderedItem] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(index, 0, reorderedItem);
    
    setQuestions(newQuestions);
    setDraggedIndex(index); // Atualiza o índice do item arrastado para a nova posição
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getQuestionIcon = (type: Question['type']) => {
    const iconMap: Record<string, React.ReactNode> = {
      text: 'T',
      email: '@',
      number: '123',
      textarea: '≡',
      select: '▼',
      multiselect: '☑',
      radio: '○',
      checkbox: '☐',
      date: '📅',
      rating: '⭐',
    };
    return iconMap[type] || 'Q';
  };

  const getQuestionTypeName = (type: Question['type']) => {
    const typeMap: Record<string, string> = {
      text: 'Texto Curto',
      email: 'E-mail',
      number: 'Número',
      textarea: 'Texto Longo',
      select: 'Seleção Única',
      multiselect: 'Seleção Múltipla',
      radio: 'Botões de Rádio',
      checkbox: 'Caixas de Seleção',
      date: 'Data',
      rating: 'Avaliação',
    };
    return typeMap[type] || type;
  };

  const handlePublish = () => {
    if (questions.length === 0) {
      showError('Adicione pelo menos uma pergunta antes de publicar.');
      return;
    }
    publishFormMutation.mutate();
  };

  if (isLoading) {
    return <div className="text-center text-gray-600">Carregando formulário...</div>;
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        Erro ao carregar formulário: {error.message}
      </div>
    );
  }

  if (!formDetail) {
    return <div className="text-center text-gray-600">Formulário não encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-sollux-black">Editar Formulário</CardTitle>
              <p className="text-gray-600">Personalize seu formulário com perguntas e configurações.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/forms')}
                className="rounded-lg"
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePublish}
                disabled={publishFormMutation.isPending}
                className="bg-sollux-red hover:bg-sollux-orange text-white rounded-lg"
              >
                {publishFormMutation.isPending ? 'Publicando...' : 'Publicar Formulário'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações do Formulário */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sollux-black">Título do Formulário</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Pesquisa de Clima Organizacional"
                          {...field}
                          className="rounded-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sollux-black">Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Breve descrição sobre o objetivo do formulário"
                          {...field}
                          className="rounded-lg"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>

          {/* Perguntas do Formulário */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-sollux-black">Perguntas</h3>
              <Button onClick={handleAddQuestion} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
                <Plus className="mr-2 h-4 w-4" /> Adicionar Pergunta
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">Nenhuma pergunta adicionada ainda.</p>
                <Button onClick={handleAddQuestion} className="mt-4 bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Primeira Pergunta
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`p-4 bg-white rounded-lg border border-gray-200 cursor-move transition-colors ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex items-center gap-2 mt-1">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          <Badge variant="outline" className="text-xs">
                            {getQuestionIcon(question.type)}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sollux-black">{question.title}</h4>
                            {question.required && (
                              <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                            )}
                          </div>
                          {question.description && (
                            <p className="text-sm text-gray-600">{question.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Tipo: {getQuestionTypeName(question.type)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditQuestion(question)}
                          className="text-sollux-black hover:bg-gray-100 rounded-lg"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(index)}
                          className="text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Pergunta */}
      <QuestionDialog
        open={isQuestionDialogOpen}
        onOpenChange={setIsQuestionDialogOpen}
        onSave={handleSaveQuestion}
        question={editingQuestion}
      />
    </div>
  );
};

// Componente de Dialog de Pergunta
const QuestionDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: QuestionFormDataInferred) => void;
  question?: Question | null;
}> = ({ open, onOpenChange, onSave, question }) => {
  const form = useForm<z.infer<typeof questionSchema>>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      type: 'text',
      title: '',
      description: '',
      required: false,
      options: [],
      validation: { // Inicializar validation para evitar erros de tipagem
        min: undefined,
        max: undefined,
        pattern: undefined,
      },
    },
  });

  useEffect(() => {
    if (question) {
      form.reset({
        type: question.type,
        title: question.title,
        description: question.description || '',
        required: question.required,
        options: question.options || [],
        validation: {
          min: question.validation?.min,
          max: question.validation?.max,
          pattern: question.validation?.pattern,
        },
      });
    } else {
      form.reset({
        type: 'text',
        title: '',
        description: '',
        required: false,
        options: [],
        validation: {
          min: undefined,
          max: undefined,
          pattern: undefined,
        },
      });
    }
  }, [question, form, open]);

  const onSubmit = (data: QuestionFormDataInferred) => {
    onSave(data);
    form.reset();
  };

  const questionType = form.watch('type');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sollux-black">
            {question ? 'Editar Pergunta' : 'Adicionar Pergunta'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Tipo de Pergunta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Texto Curto</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="textarea">Texto Longo</SelectItem>
                        <SelectItem value="select">Seleção Única</SelectItem>
                        <SelectItem value="multiselect">Seleção Múltipla</SelectItem>
                        <SelectItem value="radio">Botões de Rádio</SelectItem>
                        <SelectItem value="checkbox">Caixas de Seleção</SelectItem>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="rating">Avaliação</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Título da Pergunta</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Qual é o seu nome completo?"
                        {...field}
                        className="rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ajuda adicional para o respondente"
                        {...field}
                        className="rounded-lg"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sollux-black">Campo Obrigatório</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Opções para tipos que precisam */}
            {(questionType === 'select' || questionType === 'multiselect' || questionType === 'radio' || questionType === 'checkbox') && (
              <div>
                <FormLabel className="text-sollux-black">Opções</FormLabel>
                <div className="space-y-2 mt-2">
                  {form.watch('options')?.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(form.watch('options') || [])];
                          newOptions[index] = e.target.value;
                          form.setValue('options', newOptions);
                        }}
                        placeholder={`Opção ${index + 1}`}
                        className="flex-1 rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newOptions = [...(form.watch('options') || [])];
                          newOptions.splice(index, 1);
                          form.setValue('options', newOptions);
                        }}
                        className="text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newOptions = [...(form.watch('options') || []), ''];
                      form.setValue('options', newOptions);
                    }}
                    className="w-full rounded-lg"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Opção
                  </Button>
                </div>
              </div>
            )}

            {/* Validação para campos numéricos */}
            {questionType === 'number' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="validation.min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sollux-black">Valor Mínimo</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ex: 0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          className="rounded-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="validation.max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sollux-black">Valor Máximo</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ex: 100"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          className="rounded-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-lg"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-lg bg-sollux-red hover:bg-sollux-orange"
              >
                {question ? 'Atualizar Pergunta' : 'Adicionar Pergunta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FormEditPage;