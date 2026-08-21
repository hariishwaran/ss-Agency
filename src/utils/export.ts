import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

export const exportToExcel = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

interface SlideData {
  imageUrl?: string;
  location: string;
  city?: string;
  dimensions: string;
  clientInfo: string;
  startDate: string;
  endDate: string;
  status: string;
  poStatus?: string;
  hoardingId: number;
}

export const exportToPPT = (slides: SlideData[], filename: string) => {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'STANDARD', width: 10, height: 7.5 });
  pptx.layout = 'STANDARD';
  const W = 10;
  const H = 7.5;

  slides.forEach((slideData) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    // ── Hero image with white border (~85% of slide area) ──
    const margin = 0.25;
    const imgX = margin;
    const imgY = margin;
    const imgW = W - 2 * margin;
    const imgH = H - 1.2 - margin;

    if (slideData.imageUrl) {
      try {
        slide.addImage({ path: slideData.imageUrl, x: imgX, y: imgY, w: imgW, h: imgH, sizing: { type: 'cover', w: imgW, h: imgH } });
      } catch {
        slide.addShape(pptx.ShapeType.rect, { x: imgX, y: imgY, w: imgW, h: imgH, fill: { color: 'E2E8F0' } });
      }
    } else {
      slide.addShape(pptx.ShapeType.rect, { x: imgX, y: imgY, w: imgW, h: imgH, fill: { color: 'E2E8F0' } });
    }

    // ── Red bounding box (#FF0000) 1px stroke isolating the billboard ──
    const boxX = imgX + 0.5;
    const boxY = imgY + 0.3;
    const boxW = 2.0;
    const boxH = 1.4;
    slide.addShape(pptx.ShapeType.rect, {
      x: boxX, y: boxY, w: boxW, h: boxH,
      line: { color: 'FF0000', width: 1.5 },
      fill: { type: 'none' },
    });

    // ── Bottom text zone (white background below image) ──
    const textZoneY = imgY + imgH;

    // Left: Location — Serif (Times New Roman), Bold, 24pt, Deep Charcoal #1A1A1A
    slide.addText([
      { text: slideData.location, options: { fontSize: 24, bold: true, color: '1A1A1A', fontFace: 'Times New Roman' } },
      { text: '  ', options: { fontSize: 10 } },
      { text: slideData.dimensions, options: { fontSize: 24, bold: true, color: '1A1A1A', fontFace: 'Times New Roman' } },
    ], {
      x: 0.5, y: textZoneY + 0.2, w: 6.5, h: 0.65,
      valign: 'middle',
    });

    // ── Right: Agency Logo (bottom-right corner) ──
    const logoX = 7.0;
    const logoY = textZoneY + 0.12;

    slide.addImage({
      path: '/logo.png',
      x: logoX, y: logoY, w: 2.5, h: 1.5,
      sizing: { type: 'contain', w: 2.5, h: 1.5 },
    });
  });

  pptx.writeFile({ fileName: `${filename}.pptx` });
};
