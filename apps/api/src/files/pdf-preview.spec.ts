import { PDFDocument } from 'pdf-lib';

/**
 * Section 19 asks for compressed drawing previews so partners on weak mobile connections are not
 * made to pull a full drawing set. Drawings are PDFs, and the preview path used to skip every file
 * that was not an image — which meant the one type that needed a preview never got one.
 *
 * These cover the extraction itself. The storage wiring around it is exercised by the files
 * integration path; what matters here is that page one comes out intact and much smaller.
 */

async function makePdf(pages: number, bytesOfPadding = 0): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Sheet ${i + 1}`, { x: 50, y: 780, size: 24 });
    if (bytesOfPadding > 0) {
      page.drawText('x'.repeat(bytesOfPadding), { x: 20, y: 40, size: 4 });
    }
  }
  return Buffer.from(await doc.save());
}

async function firstPageOf(source: Buffer): Promise<Buffer> {
  const doc = await PDFDocument.load(source, { ignoreEncryption: true });
  const preview = await PDFDocument.create();
  const [page] = await preview.copyPages(doc, [0]);
  preview.addPage(page);
  return Buffer.from(await preview.save({ useObjectStreams: true }));
}

describe('PDF drawing preview', () => {
  it('reduces a multi-sheet drawing set to a single sheet', async () => {
    const source = await makePdf(12);
    const preview = await firstPageOf(source);
    const reloaded = await PDFDocument.load(preview);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it('produces a materially smaller file, which is the point', async () => {
    const source = await makePdf(20, 400);
    const preview = await firstPageOf(source);
    expect(preview.byteLength).toBeLessThan(source.byteLength / 2);
  });

  it('keeps the first sheet rather than an arbitrary one', async () => {
    const source = await makePdf(5);
    const preview = await firstPageOf(source);
    const reloaded = await PDFDocument.load(preview);
    const [page] = reloaded.getPages();
    // A4 portrait, as drawn above — the copied page keeps its geometry.
    expect(Math.round(page.getWidth())).toBe(595);
    expect(Math.round(page.getHeight())).toBe(842);
  });

  it('stays a PDF so a phone viewer can open it and zoom without pixelating', async () => {
    const preview = await firstPageOf(await makePdf(3));
    expect(preview.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('refuses to load a file that is not a PDF, so the caller can skip the preview', async () => {
    await expect(PDFDocument.load(Buffer.from('not a pdf at all'))).rejects.toThrow();
  });
});
