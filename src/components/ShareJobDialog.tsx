import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Mail, Share2, MessageCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface ShareJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
}

const ShareJobDialog: React.FC<ShareJobDialogProps> = ({
  open,
  onOpenChange,
  jobId,
  jobTitle,
}) => {
  const shareUrl = `${window.location.origin}/jobs/${jobId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSuccess('Link copiado para a área de transferência!');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      showError('Erro ao copiar link.');
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Oportunidade de Vaga: ${jobTitle}`);
    const body = encodeURIComponent(`Confira esta vaga: ${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    onOpenChange(false);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Confira esta vaga: ${jobTitle}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
        <DialogHeader>
          <DialogTitle className="text-sollux-black">Compartilhar Vaga</DialogTitle>
          <DialogDescription className="text-gray-600">
            Escolha como você gostaria de compartilhar a vaga "{jobTitle}".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Input readOnly value={shareUrl} className="flex-1 rounded-lg" />
            <Button onClick={handleCopyLink} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
              <Copy className="h-4 w-4 mr-2" /> Copiar
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={handleShareEmail}
            className="w-full flex items-center justify-center gap-2 rounded-lg text-sollux-black border-sollux-gray hover:bg-gray-100"
          >
            <Mail className="h-4 w-4" /> Compartilhar por E-mail
          </Button>
          <Button
            variant="outline"
            onClick={handleShareWhatsApp}
            className="w-full flex items-center justify-center gap-2 rounded-lg text-sollux-black border-sollux-gray hover:bg-gray-100"
          >
            <MessageCircle className="h-4 w-4" /> Compartilhar no WhatsApp
          </Button>
          {navigator.share && (
            <Button
              variant="outline"
              onClick={() => {
                navigator.share({
                  title: `Oportunidade de Vaga: ${jobTitle}`,
                  url: shareUrl,
                });
                onOpenChange(false);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg text-sollux-black border-sollux-gray hover:bg-gray-100"
            >
              <Share2 className="h-4 w-4" /> Compartilhar (Nativo)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareJobDialog;