import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { RecipeDetails } from '../../core/master-data.models';
import {
  BATCH_MATERIAL_COLUMNS,
  BatchMaterialColumnId,
} from './batch-details.component';
import { BatchDetailSaveRequest, DocketReportDetails } from './batch-report';

type BatchFieldKey = keyof BatchDetailSaveRequest;
type RecipeMaterialKey =
  | 'tenMM'
  | 'cSandOne'
  | 'cSandTwo'
  | 'twentyMM'
  | 'cement'
  | 'gbbs'
  | 'flash'
  | 'water'
  | 'addiOne';

interface ReportMaterial {
  id: Exclude<BatchMaterialColumnId, 'total'>;
  batchKey: BatchFieldKey;
  recipeKey: RecipeMaterialKey;
  precision: number;
}

const REPORT_MATERIALS: ReportMaterial[] = [
  { id: 'tenMM', batchKey: 'tenMM', recipeKey: 'tenMM', precision: 1 },
  { id: 'cSandOne', batchKey: 'csandOne', recipeKey: 'cSandOne', precision: 1 },
  { id: 'cSandTwo', batchKey: 'csandTwo', recipeKey: 'cSandTwo', precision: 1 },
  { id: 'twentyMM', batchKey: 'twentyMM', recipeKey: 'twentyMM', precision: 1 },
  { id: 'cement', batchKey: 'cement', recipeKey: 'cement', precision: 1 },
  { id: 'gbbs', batchKey: 'gbbs', recipeKey: 'gbbs', precision: 1 },
  { id: 'flash', batchKey: 'flash', recipeKey: 'flash', precision: 1 },
  { id: 'water', batchKey: 'water', recipeKey: 'water', precision: 1 },
  { id: 'addiOne', batchKey: 'addiOne', recipeKey: 'addiOne', precision: 2 },
];

const BATCH_FIELDS: { key: BatchFieldKey; label: string }[] = [
  { key: 'srNo', label: 'Batch' },
  { key: 'sec', label: 'Seconds' },
  { key: 'volumeM3', label: 'Volume (m³)' },
  { key: 'tenMM', label: '10 MM' },
  { key: 'csandOne', label: 'C Sand One' },
  { key: 'csandTwo', label: 'C Sand Two' },
  { key: 'twentyMM', label: '20 MM' },
  { key: 'cement', label: 'Cement' },
  { key: 'gbbs', label: 'GBBS' },
  { key: 'flash', label: 'Flash' },
  { key: 'water', label: 'Water' },
  { key: 'addiOne', label: 'Additive One' },
  { key: 'totalKg', label: 'Total kg' },
];

const BLUE = [180, 201, 227] as const;
const BLACK = [17, 17, 17] as const;

@Injectable({ providedIn: 'root' })
export class DocketReportPdfService {
  private readonly document = inject(DOCUMENT);

  async download(
    docket: DocketReportDetails,
    recipe: RecipeDetails,
    selectedColumns: readonly BatchMaterialColumnId[] = BATCH_MATERIAL_COLUMNS.map(
      (column) => column.id,
    ),
  ): Promise<void> {
    const recipeValues = REPORT_MATERIALS.map((material) => Number(recipe[material.recipeKey]));
    if (recipeValues.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error(`Recipe ${docket.rid} has missing or invalid material values.`);
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 5.5;
    const contentWidth = pageWidth - margin * 2;
    const logo = await this.loadLogo();

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setFillColor(...BLUE);
    pdf.rect(margin, 8, contentWidth, 6.5, 'F');
    pdf.text('SHREE MAHALAXMI READYMIX', pageWidth / 2, 13, { align: 'center' });

    pdf.addImage(logo, 'PNG', margin + 1, 16, 38, 9);
    pdf.setFontSize(9);
    const siteHeading = [docket.siteName, (docket as any).siteAddress].filter(Boolean).join(',');
    pdf.text(siteHeading || 'AMANORA PARK,MAHADA', pageWidth / 2, 21.5, {
      align: 'center',
      maxWidth: contentWidth * 0.6,
    });

    pdf.setFillColor(...BLUE);
    pdf.rect(margin, 26, contentWidth, 7, 'F');
    pdf.setFontSize(8);
    pdf.text('Docket Report', pageWidth / 2, 30.5, { align: 'center' });

    const driverDisplay = docket.driverName ? `(${docket.driverName.replace(/^\(|\)$/g, '').trim()})` : '—';
    const docketInfoRows = [
      [
        `Docket No: ${docket.docketNo ?? '—'}      ${this.formatDate(docket.docketDate)}`,
        `Truck ${docket.truckNumber ?? '—'}`,
        `Driver ${driverDisplay}`,
        `Start ${this.formatTime(docket.startTime)}`,
        `End ${this.formatTime(docket.endTime)}`,
      ],
      [
        `Customer : ${docket.customerName ?? '—'}`,
        `Site: ${docket.siteName ?? '—'}`,
        '',
        '',
        '',
      ],
      [
        `C.Address : ${(docket as any).customerAddress ?? '—'}`,
        `S.Address: ${(docket as any).siteAddress ?? '—'}`,
        '',
        '',
        '',
      ],
    ];
    autoTable(pdf, {
      startY: 34,
      margin: { left: margin, right: margin },
      body: docketInfoRows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 6.5, cellPadding: 1.6 },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.275, fontStyle: 'bold' },
        1: { cellWidth: contentWidth * 0.2, fontStyle: 'bold' },
        2: { cellWidth: contentWidth * 0.185, fontStyle: 'bold' },
        3: { cellWidth: contentWidth * 0.17, fontStyle: 'bold' },
        4: { cellWidth: contentWidth * 0.17, fontStyle: 'bold' },
      },
      tableLineWidth: 0.15,
    });

    const recipeTotal = recipeValues.reduce((sum, value) => sum + value, 0);
    const actualProdQty = Number(
      docket.productionQuantity ?? docket.deliveredQuantity ?? 0,
    );
    const cummulativeSetTotal =
      recipeTotal * (actualProdQty > 0 ? actualProdQty : 1);
    const thVolume =
      docket.thVolume ??
      (actualProdQty > 0 ? cummulativeSetTotal / actualProdQty : recipeTotal);

    const deliveredStr = `${this.formatNumber(Number(docket.deliveredQuantity ?? 0), 1)} / ${docket.orderQuantity ? this.formatNumber(Number(docket.orderQuantity), 1) : '—'}`;
    const recipeSummary = [
      [
        'Recipe',
        'TH Volume',
        'Oder',
        'Delivered/Ordered',
        'Report Date',
        'Batch Count',
        'Batch Size',
      ],
      [
        docket.recipeName ?? '—',
        `${this.formatNumber(thVolume)} Kg/M³`,
        docket.customerName ?? '—',
        deliveredStr,
        this.formatDate(docket.reportDate),
        this.formatNumber(Number(docket.batchCount ?? docket.batchDetails?.length ?? 0), 0),
        this.formatNumber(Number(docket.batchSize ?? 0), 2),
      ],
    ];
    autoTable(pdf, {
      startY: this.finalY(pdf) + 1.5,
      margin: { left: margin, right: margin },
      body: recipeSummary,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 5.6,
        cellPadding: 1.7,
        halign: 'center',
        
      },
      headStyles: { fontStyle: 'bold', fillColor: [255, 255, 255],  },
      bodyStyles: { fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.13 },
        1: { cellWidth: contentWidth * 0.13 },
        2: { cellWidth: contentWidth * 0.28545 },
        3: { cellWidth: contentWidth * 0.13 },
        4: { cellWidth: contentWidth * 0.13 },
        5: { cellWidth: contentWidth * 0.097275 },
        6: { cellWidth: contentWidth * 0.097275 },
      },
     
      tableLineWidth: 0.15,
    });

    const visibleColumns = BATCH_MATERIAL_COLUMNS.filter((column) =>
      selectedColumns.includes(column.id),
    );
    if (!visibleColumns.length) {
      throw new Error('Select at least one report column to include in the PDF.');
    }
    const batchWidth = contentWidth * 0.67545;
    const batchX = margin;
    const numberWidth = batchWidth * 0.075;
    const secondsWidth = batchWidth * 0.095;
    const materialWidth = (batchWidth * 0.83) / visibleColumns.length;
    const columnWidths = [
      numberWidth,
      secondsWidth,
      ...visibleColumns.map(() => materialWidth),
    ];
    const groups = visibleColumns.reduce<{ label: string; colspan: number }[]>((result, column) => {
      const current = result[result.length - 1];
      if (current?.label === column.group) {
        current.colspan++;
      } else {
        result.push({ label: column.group, colspan: 1 });
      }
      return result;
    }, []);
    const groupHead = [
      { content: '', colSpan: 2 },
      ...groups.map((group) => ({ content: group.label, colSpan: group.colspan })),
    ];
    const batchRows = docket.batchDetails ?? [];
    autoTable(pdf, {
      startY: this.finalY(pdf) + 1.5,
      margin: { left: batchX, right: pageWidth - batchX - batchWidth },
      tableWidth: batchWidth,
      head: [
        groupHead,
        [
          { content: 'Batch', colSpan: 2 },
          ...visibleColumns.map((column) => column.id === 'total' ? '' : column.label),
        ],
        ['No', 'Sec', ...visibleColumns.map(() => 'Kg')],
      ],
      body: batchRows.map((batch) => [
        String(batch.srNo ?? '—'),
        String(batch.sec ?? '—'),
        ...visibleColumns.map((column) => {
          const field = BATCH_FIELDS.find((item) => item.key === column.id);
          const value = field ? batch[field.key] : null;
          const precision = column.id === 'addiOne' ? 2 : 1;
          return value === null || value === undefined
            ? '—'
            : this.formatNumber(Number(value), precision);
        }),
      ]),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 5.6,
        cellPadding: 1.45,
        halign: 'center',
       
       
        lineWidth: 0.15,
      },
      headStyles: {fontStyle: 'bold' },
      columnStyles: Object.fromEntries(
        columnWidths.map((width, index) => [index, { cellWidth: width }]),
      ),
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: [0],
    });

    const summaryColumns = visibleColumns.filter((column) => column.id !== 'total');
    const actual = (key: BatchFieldKey): number =>
      batchRows.reduce((sum, batch) => sum + Number(batch[key] ?? 0), 0);
    const summaryRows = [
      [
        'Mosture (%)',
        ...summaryColumns.map((column) =>
          this.isMoistureColumn(column.id) ? '0.00' : '',
        ),
      ],
      [
        'Mosture (Kg)',
        ...summaryColumns.map((column) => {
          if (column.id === 'water') {
            return '0.00';
          }
          const material = REPORT_MATERIALS.find((item) => item.id === column.id);
          return this.isMoistureColumn(column.id) && material
            ? this.formatNumber((actual(material.batchKey) * 0) / 100, material.precision)
            : '';
        }),
      ],
      [
        'ACT TOTAL',
        ...summaryColumns.map((column) => {
          const material = REPORT_MATERIALS.find((item) => item.id === column.id);
          return material ? this.formatNumber(actual(material.batchKey), material.precision) : '';
        }),
      ],
      [
        'TAR. TOTAL',
        ...summaryColumns.map((column) => {
          const material = REPORT_MATERIALS.find((item) => item.id === column.id);
          return material
            ? this.formatNumber(
                Number(recipe[material.recipeKey]) * Number(docket.deliveredQuantity ?? 0),
                material.precision,
              )
            : '';
        }),
      ],
      [
        'AVERAGE',
        ...summaryColumns.map((column) => {
          const material = REPORT_MATERIALS.find((item) => item.id === column.id);
          return material
            ? this.formatNumber(
                batchRows.length ? actual(material.batchKey) / batchRows.length : 0,
                material.precision,
              )
            : '';
        }),
      ],
      [
        'TARGET',
        ...summaryColumns.map((column) => {
          const material = REPORT_MATERIALS.find((item) => item.id === column.id);
          return material
            ? this.formatNumber(
                Number(recipe[material.recipeKey]) * Number(docket.batchSize ?? 0),
                material.precision,
              )
            : '';
        }),
      ],
    ];
    const summaryBaseWidth = 17 + summaryColumns.length * (83 / visibleColumns.length);
    const summaryWidth = batchWidth * (summaryBaseWidth / 100);
    autoTable(pdf, {
      startY: this.finalY(pdf) + 1,
      margin: { left: batchX, right: pageWidth - batchX - summaryWidth },
      tableWidth: summaryWidth,
      body: summaryRows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 5.8,
        cellPadding: 1.25,
        halign: 'center',
       
        lineWidth: 0.15,
      },
      columnStyles: Object.fromEntries([
        [0, { cellWidth: batchWidth * (17 / 100), halign: 'left', fontStyle: 'bold' }],
        ...summaryColumns.map((_, index) => [
          index + 1,
          { cellWidth: batchWidth * (83 / 100 / visibleColumns.length) },
        ]),
      ]),
      didParseCell: ({ section, cell }) => {
        if (section === 'body' && ['ACT TOTAL', 'TAR. TOTAL', 'TARGET'].includes(String(cell.raw))) {
          cell.styles.fontStyle = 'bold';
        }
      },
    });

    const endY = this.finalY(pdf) + 4;
    const productionRows = [
      [
        'Cummulative Actual Total :',
        this.formatNumber(actual('totalKg')),
        'Actual Production Qty:',
        `${this.formatNumber(actualProdQty, 2)} M³`,
      ],
      [
        'Cummulative Set Total :',
        this.formatNumber(cummulativeSetTotal),
        'Production Qty :',
        `${this.formatNumber(actualProdQty, 2)} M³`,
      ],
      [
        'Total Cycle :',
        this.formatNumber(Number(docket.batchCount ?? batchRows.length), 0),
        'W/C Ratio :',
        docket.wcRatio === null
          ? '—'
          : this.formatNumber(Number(docket.wcRatio), 2),
      ],
      ['Cycle Status :', docket.cycleStatus ?? 'Cycle Complete', '', ''],
    ];
    autoTable(pdf, {
      startY: endY,
      margin: { left: margin + contentWidth * 0.02, right: margin + contentWidth * 0.08 },
      body: productionRows,
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.6},
      columnStyles: {
        0: { cellWidth: contentWidth * 0.23, fontStyle: 'bold' },
        1: { cellWidth: contentWidth * 0.2, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: contentWidth * 0.23, fontStyle: 'bold' },
        3: { cellWidth: contentWidth * 0.2, halign: 'right', fontStyle: 'bold' },
      },
    });
    const signatureY = this.finalY(pdf) + 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('Signature1:', margin + 8, signatureY);
    pdf.line(margin + 32, signatureY + 0.5, pageWidth / 2 - 8, signatureY + 0.5);
    pdf.text('Signature 2:', pageWidth / 2 + 8, signatureY);
    pdf.line(pageWidth / 2 + 34, signatureY + 0.5, pageWidth - margin - 8, signatureY + 0.5);

    const filename = (docket.docketNo || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`docket-report-${filename}.pdf`);
  }

  private async loadLogo(): Promise<HTMLImageElement> {
    const image = this.document.createElement('img');
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not load the report logo.'));
    });
    image.src = new URL('/venus-docket-logo.png', this.document.baseURI).href;
    return loaded;
  }

  private finalY(pdf: jsPDF): number {
    return (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 34;
  }

  private isMoistureColumn(id: BatchMaterialColumnId): boolean {
    return id === 'tenMM' || id === 'cSandOne' || id === 'cSandTwo' || id === 'water';
  }

  private formatNumber(value: number, digits = 1): string {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  private formatDate(value: Date | string | null): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  }

  private formatTime(value: Date | string | null): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
