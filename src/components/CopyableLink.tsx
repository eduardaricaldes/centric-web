import { useState } from "react";
import { IconCheck, IconCopy } from "./icons";

/** Link com botão de copiar — usado nos diálogos de convite e redefinição de senha. */
export function CopyableLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de clipboard: o link continua selecionável manualmente.
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-field border border-line bg-ivory px-3 py-2.5">
      <code className="min-w-0 flex-1 truncate text-xs text-ink">{url}</code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar link"
        className="shrink-0 text-north hover:text-north-deep"
      >
        {copied ? <IconCheck width={16} height={16} /> : <IconCopy width={16} height={16} />}
      </button>
    </div>
  );
}
