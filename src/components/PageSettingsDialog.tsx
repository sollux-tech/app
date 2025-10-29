import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

interface SectionDefinition {
  id: string;
  label: string;
}

interface PageSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableSections: SectionDefinition[];
  currentVisibleSections: string[];
  onSave: (newVisibleSections: string[]) => void;
  isSaving: boolean;
}

const PageSettingsDialog: React.FC<PageSettingsDialogProps> = ({
  open,
  onOpenChange,
  availableSections,
  currentVisibleSections,
  onSave,
  isSaving,
}) => {
  const [selectedSections, setSelectedSections] = useState<string[]>(currentVisibleSections);

  useEffect(() => {
    if (open) {
      setSelectedSections(currentVisibleSections);
    }
  }, [open, currentVisibleSections]);

  const handleCheckboxChange = (sectionId: string, checked: boolean) => {
    setSelectedSections(prev =>
      checked ? [...prev, sectionId] : prev.filter(id => id !== sectionId)
    );
  };

  const handleSave = () => {
    onSave(selectedSections);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Configurações da Página</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Selecione as seções que você deseja exibir nesta página.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ScrollArea className="h-60 w-full rounded-md border p-4 bg-muted/50">
            <div className="space-y-3">
              {availableSections.length === 0 ? (
                <p className="text-muted-foreground text-center">Nenhuma seção disponível.</p>
              ) : (
                availableSections.map(section => (
                  <div key={section.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`section-${section.id}`}
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={(checked: boolean) => handleCheckboxChange(section.id, checked)}
                      disabled={isSaving}
                    />
                    <Label htmlFor={`section-${section.id}`} className="text-foreground cursor-pointer">
                      {section.label}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving} className="rounded-lg">
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configurações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PageSettingsDialog;