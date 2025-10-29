import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showError, showSuccess } from '@/utils/toast';

interface PageConfig {
  id: string;
  user_id: string;
  page_name: string;
  visible_sections: string[];
  created_at: string;
  updated_at: string;
}

interface SectionDefinition {
  id: string;
  label: string;
}

export const usePageConfig = (pageName: string, defaultSections: SectionDefinition[]) => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id;

  // Query para buscar a configuração da página
  const { data: pageConfig, isLoading: isLoadingConfig } = useQuery<PageConfig | null, Error>({
    queryKey: ['pageConfig', pageName, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('page_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('page_name', pageName)
        .single();

      if (error && error.code === 'PGRST116') { // No config found
        return null;
      }
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Estado local para as seções visíveis, inicializado com o que vem do banco ou defaults
  const [visibleSections, setVisibleSections] = useState<string[]>(() => {
    if (pageConfig?.visible_sections) {
      return pageConfig.visible_sections;
    }
    return defaultSections.map(s => s.id);
  });

  // Efeito para atualizar o estado local quando a configuração do banco muda
  useEffect(() => {
    if (pageConfig?.visible_sections) {
      setVisibleSections(pageConfig.visible_sections);
    } else if (!isLoadingConfig && !pageConfig) {
      // Se não há config no banco e não está carregando, use os defaults
      setVisibleSections(defaultSections.map(s => s.id));
    }
  }, [pageConfig, isLoadingConfig, defaultSections]);

  // Mutação para salvar a configuração no banco de dados
  const saveConfigMutation = useMutation({
    mutationFn: async (newVisibleSections: string[]) => {
      if (!userId) throw new Error("Usuário não autenticado.");

      const payload = {
        user_id: userId,
        page_name: pageName,
        visible_sections: newVisibleSections,
      };

      if (pageConfig) {
        // Update existing config
        const { data, error } = await supabase
          .from('page_configs')
          .update(payload)
          .eq('id', pageConfig.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from('page_configs')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pageConfig', pageName, userId] });
      showSuccess('Configurações da página salvas com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao salvar configurações: ${error.message}`);
    },
  });

  // Função para alternar a visibilidade de uma seção
  const toggleSectionVisibility = useCallback((sectionId: string) => {
    setVisibleSections(prev => {
      const newSections = prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      saveConfigMutation.mutate(newSections);
      return newSections;
    });
  }, [saveConfigMutation]);

  // Função para definir todas as seções visíveis de uma vez (usado pelo dialog de configurações)
  const setAllVisibleSections = useCallback((sectionIds: string[]) => {
    setVisibleSections(sectionIds);
    saveConfigMutation.mutate(sectionIds);
  }, [saveConfigMutation]);

  return {
    visibleSections,
    isLoadingConfig,
    isSavingConfig: saveConfigMutation.isPending,
    toggleSectionVisibility,
    setAllVisibleSections,
  };
};