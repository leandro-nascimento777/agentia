import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { TravelItinerary, DayPlan } from '../../domain/entities/TravelItinerary';
import { IPdfGeneratorPort } from '../../domain/ports/output/IPdfGeneratorPort';
import { toPdfSafeText } from './utils/pdfText';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLOR = {
  primary: rgb(0.11, 0.4, 0.8),
  accent: rgb(0.13, 0.69, 0.49),
  dark: rgb(0.1, 0.1, 0.15),
  muted: rgb(0.45, 0.45, 0.5),
  white: rgb(1, 1, 1),
  light: rgb(0.96, 0.97, 0.99),
};

export class PdfGeneratorAdapter implements IPdfGeneratorPort {
  async generate(itinerary: TravelItinerary): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const regular = await doc.embedFont(StandardFonts.Helvetica);

    this.addCoverPage(doc, itinerary, bold, regular);

    for (const plan of itinerary.dayPlans) {
      this.addDayPage(doc, plan, itinerary.destination.value, bold, regular);
    }

    this.addSummaryPage(doc, itinerary, bold, regular);

    const bytes = await doc.save();
    return Buffer.from(bytes);
  }

  private addCoverPage(
    doc: PDFDocument,
    itinerary: TravelItinerary,
    bold: PDFFont,
    regular: PDFFont,
  ): void {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: COLOR.primary });
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: 120, color: rgb(0.06, 0.25, 0.55) });

    this.drawText(page, 'ROTEIRO DE VIAGEM', MARGIN, PAGE_HEIGHT - 130, 14, regular, rgb(0.75, 0.88, 1));
    this.drawText(page, itinerary.destination.value.toUpperCase(), MARGIN, PAGE_HEIGHT - 200, 44, bold, COLOR.white);
    this.drawText(page, itinerary.daysCount.toString().toUpperCase(), MARGIN, PAGE_HEIGHT - 260, 22, regular, rgb(0.75, 0.88, 1));

    page.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 285 }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 285 }, thickness: 1, color: rgb(0.4, 0.6, 0.9) });

    this.drawText(page, 'Seu roteiro personalizado foi gerado com inteligencia artificial.', MARGIN, PAGE_HEIGHT - 320, 11, regular, rgb(0.85, 0.92, 1));
    this.drawText(page, 'Confira nos proximos paginas o plano completo dia a dia.', MARGIN, PAGE_HEIGHT - 340, 11, regular, rgb(0.85, 0.92, 1));

    const totalPages = 1 + itinerary.dayPlans.length + 1;
    this.drawText(page, `${totalPages} paginas`, PAGE_WIDTH - MARGIN - 60, 40, 10, regular, rgb(0.6, 0.75, 0.95));
  }

  private addDayPage(
    doc: PDFDocument,
    plan: DayPlan,
    destination: string,
    bold: PDFFont,
    regular: PDFFont,
  ): void {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 70, width: PAGE_WIDTH, height: 70, color: COLOR.primary });
    this.drawText(page, `DIA ${plan.day}`, MARGIN, PAGE_HEIGHT - 47, 26, bold, COLOR.white);
    this.drawText(page, destination.toUpperCase(), PAGE_WIDTH - MARGIN - 150, PAGE_HEIGHT - 47, 13, regular, rgb(0.75, 0.88, 1));

    let y = PAGE_HEIGHT - 110;

    y = this.addSection(page, 'ATIVIDADES DO DIA', plan.activities, y, bold, regular, COLOR.primary);
    y -= 16;
    this.addSection(page, 'REFEICOES', plan.meals, y, bold, regular, COLOR.accent);
  }

  private addSummaryPage(
    doc: PDFDocument,
    itinerary: TravelItinerary,
    bold: PDFFont,
    regular: PDFFont,
  ): void {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 70, width: PAGE_WIDTH, height: 70, color: COLOR.primary });
    this.drawText(page, 'RESUMO DA VIAGEM', MARGIN, PAGE_HEIGHT - 47, 22, bold, COLOR.white);

    let y = PAGE_HEIGHT - 110;
    y = this.addSection(page, 'HOSPEDAGEM', [itinerary.hotel], y, bold, regular, COLOR.primary);
    y -= 16;
    y = this.addSection(page, 'TRANSPORTES', itinerary.transport, y, bold, regular, COLOR.accent);
    y -= 16;
    this.addSection(page, 'RESTAURANTES RECOMENDADOS', itinerary.restaurants, y, bold, regular, COLOR.primary);
  }

  private addSection(
    page: PDFPage,
    title: string,
    items: string[],
    startY: number,
    bold: PDFFont,
    regular: PDFFont,
    color: ReturnType<typeof rgb>,
  ): number {
    let y = startY;

    page.drawRectangle({ x: MARGIN - 4, y: y - 4, width: 6, height: 22, color });
    this.drawText(page, title, MARGIN + 8, y + 4, 13, bold, color);
    y -= 28;

    for (const item of items) {
      const lines = this.wrapText(item, CONTENT_WIDTH - 20, regular, 11);
      for (const line of lines) {
        this.drawText(page, `• ${line}`, MARGIN + 12, y, 11, regular, COLOR.dark);
        y -= 18;
      }
      y -= 2;
    }

    return y;
  }

  private wrapText(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }

    if (current) lines.push(current);
    return lines;
  }

  private drawText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    size: number,
    font: PDFFont,
    color: ReturnType<typeof rgb>,
  ): void {
    page.drawText(toPdfSafeText(text), { x, y, size, font, color });
  }
}
