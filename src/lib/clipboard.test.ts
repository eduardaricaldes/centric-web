import { afterEach, describe, expect, it, vi } from "vitest";
import { copyWhenReady } from "./clipboard";

class FakeClipboardItem {
  readonly items: Record<string, Promise<Blob>>;
  constructor(items: Record<string, Promise<Blob>>) {
    this.items = items;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copyWhenReady", () => {
  it("começa a escrita no clique e entrega o texto quando ele chega (Safari)", async () => {
    const written: string[] = [];
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    vi.stubGlobal("navigator", {
      clipboard: {
        write: async ([item]: FakeClipboardItem[]) => {
          written.push(await (await item.items["text/plain"]).text());
        },
      },
    });

    await expect(copyWhenReady(Promise.resolve("https://site/s/tok"))).resolves.toBe(true);
    expect(written).toEqual(["https://site/s/tok"]);
  });

  it("sem ClipboardItem, usa writeText", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await expect(copyWhenReady(Promise.resolve("abc"))).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("abc");
  });

  it("devolve false quando o navegador nega a área de transferência", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: async () => Promise.reject(new Error("negado")) },
    });

    await expect(copyWhenReady(Promise.resolve("abc"))).resolves.toBe(false);
  });

  it("devolve false, sem estourar, quando o link não chega (erro da API)", async () => {
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    vi.stubGlobal("navigator", {
      clipboard: {
        write: async ([item]: FakeClipboardItem[]) => {
          await item.items["text/plain"];
        },
        writeText: vi.fn(),
      },
    });

    await expect(copyWhenReady(Promise.reject(new Error("403")))).resolves.toBe(false);
  });
});
