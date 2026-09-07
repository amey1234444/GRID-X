import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import sharp from 'sharp';

/** What gets stamped across the drawing, per Module 3. */
export interface WatermarkContext {
  /** The partner the copy is being served to — the blueprint's "partner name". */
  partnerName: string;
  /** The job it was released against, where there is one. */
  jobNumber?: string | null;
  drawingNumber: string;
  revisionCode: string;
  /** Set for a superseded revision, which must be unmistakable rather than merely labelled. */
  obsolete?: boolean;
}

/**
 * Module 3 — "watermark with partner name and job number".
 *
 * A caption above the viewer is not a watermark: it is lost the moment the file is saved, printed
 * or photographed on a shop floor. The text is composited into the file itself so a copy that
 * leaves GRID-X still says who it was issued to and against which job.
 */
@Injectable()
export class WatermarkService {
  private readonly logger = new Logger(WatermarkService.name);

  /** The line stamped across the page, and shown in the viewer for continuity. */
  static caption(context: WatermarkContext): string {
    if (context.obsolete) return 'OBSOLETE — DO NOT USE';
    const parts = [
      context.partnerName,
      context.jobNumber ? `Job ${context.jobNumber}` : null,
      `${context.drawingNumber} Rev ${context.revisionCode}`,
    ].filter(Boolean);
    return parts.join('  ·  ');
  }

  /**
   * Returns a watermarked copy, or null when the format cannot be stamped — in which case the
   * caller must refuse to serve a view-only copy rather than fall back to the clean original.
   */
  async apply(
    body: Buffer,
    mimeType: string,
    context: WatermarkContext,
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      if (mimeType === 'application/pdf') {
        return { buffer: await this.stampPdf(body, context), mimeType: 'application/pdf' };
      }
      if (mimeType.startsWith('image/')) {
        return { buffer: await this.stampImage(body, context), mimeType: 'image/jpeg' };
      }
    } catch (error) {
      this.logger.error(`Failed to watermark a ${mimeType} drawing: ${String(error)}`);
      return null;
    }
    this.logger.warn(`No watermarking support for ${mimeType}`);
    return null;
  }

  /** Diagonal repeated text across every page, plus a footer line on each. */
  private async stampPdf(body: Buffer, context: WatermarkContext): Promise<Buffer> {
    const pdf = await PDFDocument.load(body, { ignoreEncryption: true });
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const caption = WatermarkService.caption(context);
    const colour = context.obsolete ? rgb(0.85, 0.15, 0.1) : rgb(0.45, 0.5, 0.56);

    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize();
      // Size the diagonal text to the page so it reads the same on A4 and A0.
      const diagonal = Math.sqrt(width * width + height * height);
      const fontSize = Math.max(14, diagonal / (caption.length * 0.62));

      // Three passes up the page so a crop or a partial print still carries the mark.
      for (const fraction of [0.25, 0.5, 0.75]) {
        const textWidth = font.widthOfTextAtSize(caption, fontSize);
        page.drawText(caption, {
          x: (width - textWidth * 0.82) / 2,
          y: height * fraction,
          size: fontSize,
          font,
          color: colour,
          opacity: context.obsolete ? 0.35 : 0.22,
          rotate: degrees(30),
        });
      }

      // A crisp footer for anyone reading the sheet rather than glancing at it.
      const footerSize = Math.max(7, Math.min(11, width / 60));
      page.drawText(`Issued through GRID-X · ${caption}`, {
        x: 18,
        y: 14,
        size: footerSize,
        font,
        color: colour,
        opacity: 0.75,
      });
    }

    return Buffer.from(await pdf.save());
  }

  /** Raster drawings and photographs get the same text as an SVG overlay. */
  private async stampImage(body: Buffer, context: WatermarkContext): Promise<Buffer> {
    const image = sharp(body).rotate();
    const meta = await image.metadata();
    const width = meta.width ?? 1280;
    const height = meta.height ?? 900;
    const caption = WatermarkService.caption(context);
    const fontSize = Math.max(14, Math.round(width / (caption.length * 0.75)));
    const colour = context.obsolete ? '#d92c1f' : '#5a6675';

    // Escaped so a partner name containing & or < cannot break the SVG.
    const safe = caption.replace(
      /[&<>"']/g,
      (char) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] ?? char,
    );

    const overlay = Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
         <g transform="rotate(-30 ${width / 2} ${height / 2})" fill="${colour}"
            font-family="Helvetica, Arial, sans-serif" font-weight="700"
            font-size="${fontSize}" opacity="${context.obsolete ? 0.35 : 0.22}"
            text-anchor="middle">
           <text x="${width / 2}" y="${height * 0.3}">${safe}</text>
           <text x="${width / 2}" y="${height * 0.55}">${safe}</text>
           <text x="${width / 2}" y="${height * 0.8}">${safe}</text>
         </g>
         <text x="14" y="${height - 12}" fill="${colour}" opacity="0.8"
               font-family="Helvetica, Arial, sans-serif" font-size="${Math.max(10, Math.round(width / 90))}">
           Issued through GRID-X · ${safe}
         </text>
       </svg>`,
    );

    return image
      .composite([{ input: overlay, top: 0, left: 0 }])
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  }
}
