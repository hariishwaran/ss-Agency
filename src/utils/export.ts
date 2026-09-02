import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

export const exportToExcel = (data: any[], filename: string) => {
  // Sort data by City (A-Z), then Location (A-Z) if fields exist
  const sortedData = [...data].sort((a, b) => {
    const cityA = String(a['City'] || a['city'] || 'Chennai').trim();
    const cityB = String(b['City'] || b['city'] || 'Chennai').trim();
    const cityComp = cityA.localeCompare(cityB, undefined, { sensitivity: 'base' });
    if (cityComp !== 0) return cityComp;

    const locA = String(a['Location'] || a['location'] || '').trim();
    const locB = String(b['Location'] || b['location'] || '').trim();
    return locA.localeCompare(locB, undefined, { sensitivity: 'base' });
  });

  const ws = XLSX.utils.json_to_sheet(sortedData);
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
  // Sort slides by City (A-Z), then Location (A-Z)
  const sortedSlides = [...slides].sort((a, b) => {
    const cityA = (a.city || 'Chennai').trim();
    const cityB = (b.city || 'Chennai').trim();
    const cityComp = cityA.localeCompare(cityB, undefined, { sensitivity: 'base' });
    if (cityComp !== 0) return cityComp;

    return (a.location || '').localeCompare(b.location || '', undefined, { sensitivity: 'base' });
  });

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'STANDARD', width: 10, height: 7.5 });
  pptx.layout = 'STANDARD';

  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';

  sortedSlides.forEach((slideData) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    // ── 1. Top Picture Frame (Dashed Border Box) ──
    const picFrameX = 0.3;
    const picFrameY = 0.3;
    const picFrameW = 9.4;
    const picFrameH = 6.1;

    slide.addShape(pptx.ShapeType.rect, {
      x: picFrameX,
      y: picFrameY,
      w: picFrameW,
      h: picFrameH,
      fill: { color: 'FFFFFF' },
      line: { color: '7F7F7F', width: 0.75, dashType: 'dash' },
    });

    // Top-left label text inside Picture frame
    slide.addText(slideData.location || 'Picture', {
      x: picFrameX + 0.1,
      y: picFrameY + 0.1,
      w: 8.0,
      h: 0.4,
      fontFace: 'Times New Roman',
      fontSize: 18,
      color: '000000',
      valign: 'top',
    });

    // Hoarding Image (centered inside Picture Frame)
    const imgX = picFrameX + 0.1;
    const imgY = picFrameY + 0.55;
    const imgW = picFrameW - 0.2; // 9.2
    const imgH = picFrameH - 0.65; // 5.45

    if (slideData.imageUrl) {
      try {
        let fullImgUrl = slideData.imageUrl;
        if (fullImgUrl.startsWith('/') && typeof window !== 'undefined') {
          fullImgUrl = `${window.location.origin}${fullImgUrl}`;
        }
        slide.addImage({
          path: fullImgUrl,
          x: imgX,
          y: imgY,
          w: imgW,
          h: imgH,
          sizing: { type: 'contain', w: imgW, h: imgH },
        });
      } catch {
        slide.addShape(pptx.ShapeType.rect, {
          x: imgX,
          y: imgY,
          w: imgW,
          h: imgH,
          fill: { color: 'F1F5F9' },
        });
      }
    } else {
      slide.addShape(pptx.ShapeType.rect, {
        x: imgX,
        y: imgY,
        w: imgW,
        h: imgH,
        fill: { color: 'F1F5F9' },
      });
    }

    // ── 2. Bottom Title & Logo Frame (Dashed Border Box) ──
    const bottomFrameX = 0.3;
    const bottomFrameY = 6.5;
    const bottomFrameW = 9.4;
    const bottomFrameH = 0.7;

    slide.addShape(pptx.ShapeType.rect, {
      x: bottomFrameX,
      y: bottomFrameY,
      w: bottomFrameW,
      h: bottomFrameH,
      fill: { color: 'FFFFFF' },
      line: { color: '7F7F7F', width: 0.75, dashType: 'dash' },
    });

    // Bottom Left Text (Times New Roman, Bold)
    const titleText = slideData.dimensions 
      ? `${slideData.location} (${slideData.dimensions})` 
      : slideData.location;

    slide.addText(titleText, {
      x: bottomFrameX + 0.15,
      y: bottomFrameY,
      w: 6.8,
      h: bottomFrameH,
      fontFace: 'Times New Roman',
      fontSize: 18,
      bold: true,
      color: '000000',
      valign: 'middle',
    });

    // Bottom Right Logo (S.S. ADVERTISERS logo)
    const logoW = 2.2;
    const logoH = 0.65;
    const logoX = bottomFrameX + bottomFrameW - logoW - 0.05; // 7.45
    const logoY = bottomFrameY + (bottomFrameH - logoH) / 2;

    try {
      slide.addImage({
        path: logoUrl,
        x: logoX,
        y: logoY,
        w: logoW,
        h: logoH,
        sizing: { type: 'contain', w: logoW, h: logoH },
      });
    } catch {
      slide.addText('S.S. ADVERTISERS', {
        x: logoX,
        y: logoY,
        w: logoW,
        h: logoH,
        fontFace: 'Times New Roman',
        fontSize: 12,
        bold: true,
        color: '008000',
        align: 'right',
        valign: 'middle',
      });
    }
  });

  pptx.writeFile({ fileName: `${filename}.pptx` });
};

