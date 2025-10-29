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
import { Copy } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface ShareJobQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
}

const ShareJobQrDialog: React.FC<ShareJobQrDialogProps> = ({
  open,
  onOpenChange,
  jobId,
  jobTitle,
}) => {
  const shareUrl = `${window.location.origin}/jobs/${jobId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">QR Code da Vaga</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Escaneie o QR Code ou copie o link para compartilhar a vaga "{jobTitle}".
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-4">
          {qrCodeUrl && (
            <div className="flex justify-center mb-4">
              <img src={qrCodeUrl} alt="QR Code da Vaga" className="w-48 h-48 border rounded-lg" />
            </div>
          )}
          <div className="bg-muted p-3 rounded-lg mb-4">
            <p className="text-sm font-mono text-foreground break-all">
              {shareUrl}
            </p>
          </div>
          <Button
            onClick={handleCopyLink}
            className="w-full rounded-lg bg-sollux-red hover:bg-sollux-orange"
          >
            <Copy className="mr-2 h-4 w-4" /> Copiar Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareJobQrDialog;