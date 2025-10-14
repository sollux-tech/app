import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Form as FormType, Question, FormResponse } from '@/types/form';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query'; // Importar useQuery

const formResponseSchema = z.record(z.string(), z.any());

const PublicFormPage: React.FC = () => {
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm({
    resolver: zodResolver(formResponseSchema),
    defaultValues: {} as Record<string, any>,
  });

  // Usar useQuery para buscar os detalhes do formulário através da Edge Function
  const { data: formDetail, isLoading, error } = useQuery<FormType, Error>({
    queryKey: ['publicForm', formId],
    queryFn: async () => {
      console.log('PublicFormPage: queryFn started for formId:', formId);
      if (!formId) {
        console.error('PublicFormPage: formId is missing, throwing error.');
        throw new Error("ID do formulário está faltando.");
      }
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('get-public-form', {
          body: { form_id: formId },
        });
        console.log('PublicFormPage: supabase.functions.invoke result:', { data, invokeError });

        if (invokeError) {
          console.error('PublicFormPage: Function invocation error:', invokeError);
          throw new Error(`Function invocation error: ${invokeError.message}`);
        }
        if (data.error) {
          console.error('PublicFormPage: Edge Function returned an error:', data.error);
          throw new Error(`Edge Function error: ${data.error}`);
        }
        console.log('PublicFormPage: Successfully fetched form data.');
        return data;
      } catch (e: any) {
        console.error('PublicFormPage: Error in queryFn:', e);
        throw e;
      }
    },
    enabled: !!formId,
    retry: false, // Não tentar novamente em caso de erro, especialmente para 404
  });

  // O useEffect para fetchForm foi removido, pois useQuery já faz isso.
  // O estado `formDetail` e `questions` agora são derivados de `formDetail` do useQuery.
  const questions = formDetail?.questions || [];

  // Add logging for component state
  useEffect(() => {
    console.log('PublicFormPage State Update:');
    console.log('  formId:', formId);
    console.log('  isLoading:', isLoading);
    console.log('  error:', error);
    console.log('  formDetail:', formDetail);
    console.log('  isSubmitting:', isSubmitting);
    console.log('  isSubmitted:', isSubmitted);
  }, [formId, isLoading, error, formDetail, isSubmitting, isSubmitted]);


  const onSubmit = async (data: Record<string, any>) => {
    if (!formDetail) return;

    setIsSubmitting(true);
    try {
      const response: FormResponse = {
        id: `response_${Date.now()}`,
        form_id: formDetail.id,
        responses: data,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('form_responses')
        .insert(response);

      if (error) throw error;

      // Incrementar contador de respostas
      await supabase
        .from('forms')
        .update({ response_count: (formDetail.response_count || 0) + 1 })
        .eq('id', formDetail.id);

      setIsSubmitted(true);
      showSuccess('Formulário enviado com sucesso!');
    } catch (error) {
      showError('Erro ao enviar formulário. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const fieldId = `question_${question.id}`;

    switch (question.type) {
      case 'text':
        return (
          <FormItem>
            <FormControl>
              <Input
                {...form.register(fieldId)}
                placeholder={question.description}
                className="rounded-lg"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );

      case 'email':
        return (
          <FormItem>
            <FormControl>
              <Input
                type="email"
                {...form.register(fieldId)}
                placeholder={question.description}
                className="rounded-lg"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );

      case 'number':
        return (
          <FormItem>
            <FormControl>
              <Input
                type="number"
                {...form.register(fieldId)}
                placeholder={question.description}
                className="rounded-lg"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );

      case 'textarea':
        return (
          <FormItem>
            <FormControl>
              <Textarea
                {...form.register(fieldId)}
                placeholder={question.description}
                className="rounded-lg"
                rows={4}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );

      case 'select':
        return (
          <FormItem>
            <Select onValueChange={(value) => form.setValue(fieldId, value)}>
              <FormControl>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder={question.description || "Selecione uma opção"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {question.options?.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        );

      case 'multiselect':
        return (
          <FormItem>
            <div className="space-y-2">
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${fieldId}_${index}`}
                    checked={form.watch(fieldId)?.includes(option) || false}
                    onCheckedChange={(checked) => {
                      const currentValues = form.watch(fieldId) || [];
                      if (checked) {
                        form.setValue(fieldId, [...currentValues, option]);
                      } else {
                        form.setValue(fieldId, currentValues.filter((v: string) => v !== option));
                      }
                    }}
                  />
                  <label htmlFor={`${fieldId}_${index}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        );

      case 'radio':
        return (
          <FormItem>
            <RadioGroup
              onValueChange={(value) => form.setValue(fieldId, value)}
              value={form.watch(fieldId)}
            >
              <div className="space-y-2">
                {question.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${fieldId}_${index}`} />
                    <label htmlFor={`${fieldId}_${index}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </RadioGroup>
            <FormMessage />
          </FormItem>
        );

      case 'checkbox':
        return (
          <FormItem>
            <div className="space-y-2">
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${fieldId}_${index}`}
                    checked={form.watch(fieldId)?.[index]?.checked || false}
                    onCheckedChange={(checked) => {
                      const currentValues = form.watch(fieldId) || [];
                      const newValues = [...currentValues];
                      newValues[index] = { ...newValues[index], checked, value: option };
                      form.setValue(fieldId, newValues);
                    }}
                  />
                  <label htmlFor={`${fieldId}_${index}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        );

      case 'date':
        return (
          <FormItem>
            <FormControl>
              <Input
                type="date"
                {...form.register(fieldId)}
                className="rounded-lg"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );

      case 'rating':
        return (
          <FormItem>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  type="button"
                  variant={form.watch(fieldId) >= star ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => form.setValue(fieldId, star)}
                  className="rounded-lg"
                >
                  {star}
                </Button>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        );

      default:
        return null;
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sollux-light-gray">
        <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-sollux-card-border">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-sollux-black mb-2">Formulário Enviado!</h2>
          <p className="text-gray-600 mb-6">
            Obrigado por responder nosso formulário. Suas respostas foram recebidas com sucesso.
          </p>
          <Button onClick={() => navigate('/')} className="bg-sollux-red hover:bg-sollux-orange text-white rounded-lg">
            Voltar para o Início
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sollux-light-gray">
        <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-sollux-card-border">
          <Loader2 className="h-16 w-16 text-sollux-red mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-sollux-black mb-2">Carregando...</h2>
          <p className="text-gray-600">
            Por favor, aguarde enquanto carregamos o formulário.
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sollux-light-gray">
        <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-sollux-card-border">
          <h2 className="text-2xl font-bold text-sollux-black mb-2">Erro ao carregar formulário</h2>
          <p className="text-gray-600 mb-6">
            {error.message}
          </p>
          <Button onClick={() => navigate('/')} className="bg-sollux-red hover:bg-sollux-orange text-white rounded-lg">
            Voltar para o Início
          </Button>
        </Card>
      </div>
    );
  }

  if (!formDetail) {
    // This case should ideally be caught by the error handler above if the function returns null/empty data
    return (
      <div className="min-h-screen flex items-center justify-center bg-sollux-light-gray">
        <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-sollux-card-border">
          <h2 className="text-2xl font-bold text-sollux-black mb-2">Formulário não encontrado</h2>
          <p className="text-gray-600 mb-6">
            O formulário que você está procurando não existe ou não está publicado.
          </p>
          <Button onClick={() => navigate('/')} className="bg-sollux-red hover:bg-sollux-orange text-white rounded-lg">
            Voltar para o Início
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sollux-light-gray py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-sollux-black mb-2">
              {formDetail.title}
            </CardTitle>
            {formDetail.description && (
              <p className="text-gray-600">{formDetail.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {questions?.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-sollux-black">
                        {question.title}
                      </label>
                      {question.required && (
                        <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                      )}
                    </div>
                    {renderQuestion(question)}
                  </div>
                ))}

                <div className="pt-6">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-sollux-red hover:bg-sollux-orange text-white rounded-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Formulário'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicFormPage;