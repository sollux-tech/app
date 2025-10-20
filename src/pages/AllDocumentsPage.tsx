import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Document } from '@/types/document';
import { useSession } from '@/components/SessionContextProvider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BasicProfileInfo } from '@/types/profile';
import { Badge } from '@/components/ui/badge';

const AllDocumentsPage: React.FC = () => {
  const { user } = useSession();
  const [isViewContentDialogOpen, setIsViewContentDialogOpen] = useState(false);
  const [documentToViewContent, setDocumentToViewContent] = useState<Document | null>(null);

  const { data: documents, isLoading, error } = useQuery<Document[], Error>({
    queryKey: ['allAvailableDocuments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch documents that are public OR targeted to the current user
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
        .eq('status', 'active') // Only show active documents
        .order('publication_date', { ascending: false });

      if (documentsError) throw documentsError;
      if (!documentsData) return [];

      // Collect all unique creator user IDs from the fetched documents
      const creatorIds = new Set<string>();
      documentsData.forEach(doc => {
        creatorIds.add(doc.creator_user_id);
      });

      const uniqueCreatorIds = Array.from(creatorIds);

      // Fetch profiles for these creator user IDs
      let profilesMap = new Map<string, BasicProfileInfo>();
      if (uniqueCreatorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', uniqueUserIds);

        if (profilesError) {
          console.error("Error fetching creator profiles for documents:", profilesError);
        } else if (profilesData) {
          profilesData.forEach(p => profilesMap.set(p.id, p));
        }
      }

      // Map creator profiles back to documents
      const enrichedDocuments = documentsData.map(doc => ({
        ...doc,
        creator_profile: profilesMap.get(doc.creator_user_id) || null,
      }));

      return enrichedDocuments;
    },
    enabled: !!user?.id,
  });

  const handleViewContentClick = (document: Document) => {
    setDocumentToViewContent(document);
    setIsViewContentDialogOpen(true);
  };

  const handlePrintDocument = () => {
    if (!documentToViewContent) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${documentToViewContent.title} - Versão ${documentToViewContent.version}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20mm; }
              h1 { color: #E53935; text-align: center; margin-bottom: 20px; }
              h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; }
              .meta-info { background-color: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 20px; display: flex; justify-content: space-around; }
              .meta-info div { text-align: center; }
              .meta-info p { margin: 0; font-size: 0.9em; color: #555; }
              .meta-info strong { display: block; font-size: 1.1em; color: #333; }
              .content-section { margin-top: 20px; }
              .ql-editor { min-height: auto; } /* Override quill editor min-height for print */
              .ql-container.ql-snow { border: none; }
              .ql-editor p, .ql-editor h1, .ql-editor h2, .ql-editor h3, .ql-editor ul, .ql-editor ol {
                margin-bottom: 1em;
              }
              .ql-editor ul, .ql-editor ol {
                padding-left: 1.5em;
              }
              @media print {
                body { margin: 0; }
                .meta-info { border: 1px solid #ddd; }
              }
            </style>
          </head>
          <body>
            <h1>${documentToViewContent.title}</h1>
            <div class="meta-info">
              <div><p>Versão</p><strong>${documentToViewContent.version}</strong></div>
              <div><p>Publicado em</p><strong>${format(new Date(documentToViewContent.publication_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</strong></div>
              <div><p>Criador</p><strong>${documentToViewContent.creator_profile ? `${documentToViewContent.creator_profile.first_name || ''} ${documentToViewContent.creator_profile.last_name || ''}`.trim() : 'Desconhecido'}</strong></div>
            </div>
            <div class="content-section">
              ${documentToViewContent.content}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      showError('Não foi possível abrir a janela de impressão. Verifique as configurações do seu navegador.');
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando documentos...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar documentos: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">Documentos Disponíveis</CardTitle>
          <CardDescription className="text-muted-foreground">
            Visualize documentos públicos e aqueles compartilhados diretamente com você.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Documento</TableHead> {/* Renomeado de 'Título' para 'Documento' */}
                <TableHead className="text-foreground">Versão</TableHead>
                <TableHead className="text-foreground">Publicado em</TableHead>
                {/* <TableHead className="text-foreground">Criador</TableHead> -- Removido */}
                {/* <TableHead className="text-foreground">Visibilidade</TableHead> -- Removido */}
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground"> {/* Colspan ajustado */}
                    Nenhum documento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                documents?.map((doc) => {
                  // const creatorName = doc.creator_profile ? `${doc.creator_profile.first_name || ''} ${doc.creator_profile.last_name || ''}`.trim() : 'Desconhecido'; // Removido
                  // const visibility = doc.target_user_id === null ? 'Todos os Usuários' : 'Apenas Você'; // Removido
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium text-foreground">{doc.title}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.version}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(doc.publication_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      {/* <TableCell className="text-muted-foreground">{creatorName}</TableCell> -- Removido */}
                      {/* <TableCell> -- Removido
                        <Badge variant="outline" className="text-xs">
                          {visibility}
                        </Badge>
                      </TableCell> -- Removido */}
                      <TableCell className="text-right flex justify-end items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewContentClick(doc)}
                          className="text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Visualizar Conteúdo"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDocumentToViewContent(doc); // Set document for printing
                            setTimeout(handlePrintDocument, 100); // Delay print to allow dialog to open
                          }}
                          className="text-green-600 hover:bg-green-50 rounded-lg"
                          title="Imprimir Documento"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para Visualizar Conteúdo do Documento */}
      <Dialog open={isViewContentDialogOpen} onOpenChange={setIsViewContentDialogOpen}>
        <DialogContent className="sm:max-w-3xl bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Visualizar Documento: {documentToViewContent?.title}</DialogTitle>
          </DialogHeader>
          {documentToViewContent && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-3 rounded-lg">
                <div>
                  <p className="font-medium text-muted-foreground">Versão:</p>
                  <p className="text-foreground">{documentToViewContent.version}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Publicado em:</p>
                  <p className="text-foreground">
                    {format(new Date(documentToViewContent.publication_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Criador:</p>
                  <p className="text-foreground">
                    {documentToViewContent.creator_profile ? `${documentToViewContent.creator_profile.first_name || ''} ${documentToViewContent.creator_profile.last_name || ''}`.trim() : 'Desconhecido'}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Visibilidade:</p>
                  <Badge variant="outline" className="text-xs">
                    {documentToViewContent.target_user_id === null ? 'Todos os Usuários' : 'Apenas Você'}
                  </Badge>
                </div>
              </div>
              <div className="prose max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: documentToViewContent.content }} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewContentDialogOpen(false)} className="rounded-lg text-foreground hover:bg-accent">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllDocumentsPage;