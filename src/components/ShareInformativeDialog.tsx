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

interface ShareInformativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  informativeId: string;
  informativeTitle: string;
}

const ShareInformativeDialog: React.FC<ShareInformativeDialogProps> = ({
  open,
  onOpenChange,
  informativeId,
  informativeTitle,
}) => {
  const shareUrl = `${window.location.origin}/informative/${informativeId}`;

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
    const subject = encodeURIComponent(`Informativo PULSE: ${informativeTitle}`);
    const body = encodeURIComponent(`Confira este informativo PULSE: ${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    onOpenChange(false);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Confira este informativo PULSE: ${informativeTitle}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
        <DialogHeader>
          <DialogTitle className="text-sollux-black">Compartilhar Informativo</DialogTitle>
          <DialogDescription className="text-gray-600">
            Escolha como você gostaria de compartilhar "{informativeTitle}".
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
                  title: `Informativo PULSE: ${informativeTitle}`,
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

export default ShareInformativeDialog;