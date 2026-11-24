import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR code do link, para mostrar no telão ou imprimir. Gerado no navegador. */
export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((markup) => {
        if (!cancelled) setSvg(markup);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!svg) return <div style={{ width: size, height: size }} className="rounded bg-ivory" />;

  return (
    <div
      role="img"
      aria-label="QR code do link"
      style={{ width: size, height: size }}
      className="rounded bg-white [&>svg]:h-full [&>svg]:w-full"
      // SVG gerado pela biblioteca a partir do próprio link, sem conteúdo de usuário além do endereço.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
