/**
 * Copia um texto que ainda vai chegar da API. O Safari (e o iPhone) só deixa
 * escrever na área de transferência dentro do clique, então a escrita começa já,
 * com a promessa do texto; onde `ClipboardItem` não existe, cai no `writeText`.
 */
export async function copyWhenReady(text: Promise<string>): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const blob = text.then((value) => new Blob([value], { type: "text/plain" }));
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return true;
    }
  } catch {
    // Navegador sem suporte a promessa no ClipboardItem: tenta o caminho simples.
  }
  try {
    await navigator.clipboard.writeText(await text);
    return true;
  } catch {
    // Sem permissão de clipboard: o link continua selecionável no diálogo.
    return false;
  }
}
