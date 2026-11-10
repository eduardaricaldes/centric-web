import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createShareLink, revokeShareLink, shareLinksKey, shareUrl } from "../../api/share";
import type { ShareLink, ShareTarget } from "../../api/types";
import { Button } from "../../components/Button";
import { CopyableLink } from "../../components/CopyableLink";
import { Dialog } from "../../components/Dialog";
import { IconLink } from "../../components/icons";
import { copyWhenReady } from "../../lib/clipboard";
import { getErrorMessage } from "../../lib/errors";

interface ShareButtonProps {
  target: ShareTarget;
  /** O que a pessoa vai ver ao abrir o link — entra no texto do diálogo. */
  subject: string;
}

type Copied = "yes" | "no" | null;

/**
 * "Compartilhar": gera o link público (ou reaproveita o ativo), copia para a área de
 * transferência e abre um diálogo com o endereço e a opção de revogar.
 */
export function ShareButton({ target, subject }: ShareButtonProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState<Copied>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [revoked, setRevoked] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => createShareLink(target),
    onSuccess: (created) => {
      setLink(created);
      setRevoked(false);
      setOpen(true);
      queryClient.invalidateQueries({ queryKey: shareLinksKey(target) });
    },
    onError: () => setOpen(true),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => revokeShareLink(id),
    onSuccess: () => {
      setLink(null);
      setRevoked(true);
      setConfirmingRevoke(false);
      queryClient.invalidateQueries({ queryKey: shareLinksKey(target) });
    },
  });

  const share = async () => {
    setCopied(null);
    const url = createMutation.mutateAsync().then((created) => shareUrl(created.token));
    setCopied((await copyWhenReady(url)) ? "yes" : "no");
  };

  const close = () => {
    setOpen(false);
    setConfirmingRevoke(false);
    createMutation.reset();
    revokeMutation.reset();
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<IconLink width={16} height={16} />}
        loading={createMutation.isPending}
        onClick={share}
      >
        Compartilhar
      </Button>

      {open && (
        <Dialog title="Compartilhar" onClose={close}>
          {createMutation.isError && (
            <p className="text-sm text-red">{getErrorMessage(createMutation.error)}</p>
          )}

          {link && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                {copied === "yes" ? "Link copiado. " : "Copie o link abaixo. "}
                Quem receber vê {subject} sem precisar de conta: só título, artista, tom,
                letra e cifra.
              </p>
              <CopyableLink url={shareUrl(link.token)} />

              {confirmingRevoke ? (
                <div className="rounded-field border border-red/30 bg-red-tint p-3">
                  <p className="text-sm text-ink">
                    Revogar o link? Quem abrir o endereço antigo vai ver “link indisponível”.
                  </p>
                  {revokeMutation.isError && (
                    <p className="mt-2 text-sm text-red">
                      {getErrorMessage(revokeMutation.error)}
                    </p>
                  )}
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setConfirmingRevoke(false)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(link.id)}
                    >
                      Revogar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingRevoke(true)}>
                    Revogar link
                  </Button>
                </div>
              )}
            </div>
          )}

          {revoked && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                Link revogado. O endereço antigo não abre mais.
              </p>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  loading={createMutation.isPending}
                  onClick={share}
                >
                  Gerar novo link
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
