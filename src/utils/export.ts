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

  slides.forEach((slideData) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    // ── Hero image (~80% of slide area) ──
    const margin = 0.3;
    const imgX = margin;
    const imgY = margin;
    const imgW = W - 2 * margin; // 9.4
    const imgH = 5.8;

    if (slideData.imageUrl) {
      try {
        slide.addImage({ 
          path: slideData.imageUrl, 
          x: imgX, 
          y: imgY, 
          w: imgW, 
          h: imgH, 
          sizing: { type: 'cover', w: imgW, h: imgH } 
        });
      } catch {
        slide.addShape(pptx.ShapeType.rect, { x: imgX, y: imgY, w: imgW, h: imgH, fill: { color: 'E2E8F0' } });
      }
    } else {
      slide.addShape(pptx.ShapeType.rect, { x: imgX, y: imgY, w: imgW, h: imgH, fill: { color: 'E2E8F0' } });
    }

    // ── Bottom info zone ──
    const textZoneY = imgY + imgH + 0.15; // 6.25

    // Left: Location & Dimensions — Serif (Times New Roman), Bold, 22pt
    slide.addText([
      { text: slideData.location, options: { fontSize: 22, bold: true, color: '1A1A1A', fontFace: 'Times New Roman' } },
      { text: '  ', options: { fontSize: 10 } },
      { text: slideData.dimensions, options: { fontSize: 22, bold: true, color: '1A1A1A', fontFace: 'Times New Roman' } },
    ], {
      x: margin, 
      y: textZoneY, 
      w: 6.8, 
      h: 0.8,
      valign: 'middle',
    });

    // ── Right: Agency Logo (aligned cleanly within slide boundaries) ──
    const logoW = 2.2;
    const logoH = 0.8;
    const logoX = W - margin - logoW; // 7.5
    const logoY = textZoneY;

    slide.addImage({
      path: '/logo.png',
      x: logoX, 
      y: logoY, 
      w: logoW, 
      h: logoH,
      sizing: { type: 'contain', w: logoW, h: logoH },
    });
  });

  pptx.writeFile({ fileName: `${filename}.pptx` });
};
