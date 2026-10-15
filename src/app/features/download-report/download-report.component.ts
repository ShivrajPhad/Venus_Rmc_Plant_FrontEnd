import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import {
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  CustomerDetails,
  DriverDetails,
  RecipeDetails,
  SiteDetails,
  TruckDetails,
} from '../../core/master-data.models';
import { BatchDetailSaveRequest } from '../batch-report/batch-report';

export interface BatchDetailsReport {
  docketNumber: string;
  customer: CustomerDetails;
  site: SiteDetails;
  recipe: RecipeDetails;
  driver: DriverDetails;
  truck: TruckDetails;
  startTime: string;
  loadQuantity: number;
  batchSize: number;
  generatedAt: Date | string;
  visibleColumns: BatchMaterialColumnId[];
  batchDetails?: BatchDetailSaveRequest[];
  wcRatio?: number | null;
  deliveredQuantity?: number | null;
  orderQuantity?: number | null;
  thVolume?: number | null;
  batchCount?: number | null;
  productionQuantity?: number | null;
  caTotal?: number | null;
  totalCycle?: number | null;
  cycleStatus?: string | null;
  endTime?: string | null;
  docketDate?: Date | string | null;
  reportDate?: Date | string | null;
}

export interface BatchRow {
  number: number;
  volume: number;
  seconds: number;
  tenMM: number;
  cSandOne: number;
  cSandTwo: number;
  twentyMM: number;
  cement: number;
  gbbs: number;
  flash: number;
  water: number;
  addiOne: number;
  total: number;
}

export interface BatchMaterials {
  tenMM: number;
  cSandOne: number;
  cSandTwo: number;
  twentyMM: number;
  cement: number;
  gbbs: number;
  flash: number;
  water: number;
  addiOne: number;
}

export interface BatchTotals extends BatchMaterials {
  total: number;
}

export type BatchMaterialColumnId = keyof BatchMaterials | 'total';

export interface BatchMaterialColumn {
  id: BatchMaterialColumnId;
  label: string;
  group: string;
  precision: number;
}

export const BATCH_MATERIAL_COLUMNS: BatchMaterialColumn[] = [
  { id: 'tenMM', label: '10MM', group: 'Aggragate (Kg)', precision: 1 },
  { id: 'cSandOne', label: 'C SAND 1', group: 'Aggragate (Kg)', precision: 1 },
  { id: 'cSandTwo', label: 'C SAND 2', group: 'Aggragate (Kg)', precision: 1 },
  { id: 'twentyMM', label: '20MM', group: 'Aggragate (Kg)', precision: 1 },
  { id: 'cement', label: 'CEMENT', group: 'Cement (Kg)', precision: 1 },
  { id: 'gbbs', label: 'GGBS', group: 'Cement (Kg)', precision: 1 },
  { id: 'flash', label: 'FLASH', group: 'Cement (Kg)', precision: 1 },
  { id: 'water', label: 'WATER', group: 'Water', precision: 1 },
  { id: 'addiOne', label: 'ADD1', group: 'Addit', precision: 2 },
  { id: 'total', label: 'Kg', group: 'Total', precision: 1 },
];

interface MoisturePercentages {
  tenMM: number;
  cSandOne: number;
  cSandTwo: number;
  water: number;
}

interface MoistureWeights {
  tenMM: number;
  cSandOne: number;
  cSandTwo: number;
  water: number;
}

@Component({
  selector: 'app-download-report',
  templateUrl: './download-report.component.html',
  styleUrl: './download-report.component.scss',
})
export class DownloadReportComponent implements OnInit, OnChanges {
  @Input() report?: BatchDetailsReport;

  private readonly router = inject(Router, { optional: true });
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  batchRows: BatchRow[] = [];
  cumulative: BatchTotals = {
    tenMM: 0,
    cSandOne: 0,
    cSandTwo: 0,
    twentyMM: 0,
    cement: 0,
    gbbs: 0,
    flash: 0,
    water: 0,
    addiOne: 0,
    total: 0,
  };
  average: BatchTotals = {
    tenMM: 0,
    cSandOne: 0,
    cSandTwo: 0,
    twentyMM: 0,
    cement: 0,
    gbbs: 0,
    flash: 0,
    water: 0,
    addiOne: 0,
    total: 0,
  };
  target: BatchTotals = {
    tenMM: 0,
    cSandOne: 0,
    cSandTwo: 0,
    twentyMM: 0,
    cement: 0,
    gbbs: 0,
    flash: 0,
    water: 0,
    addiOne: 0,
    total: 0,
  };
  targetTotal: BatchTotals = {
    tenMM: 0,
    cSandOne: 0,
    cSandTwo: 0,
    twentyMM: 0,
    cement: 0,
    gbbs: 0,
    flash: 0,
    water: 0,
    addiOne: 0,
    total: 0,
  };
  moisturePercent: MoisturePercentages = {
    tenMM: 0,
    cSandOne: 0,
    cSandTwo: 0,
    water: 0,
  };

  constructor() {
    const nav = this.router?.getCurrentNavigation();
    const stateReport =
      nav?.extras?.state?.['report'] ??
      (typeof history !== 'undefined' ? history.state?.report : undefined);
    if (stateReport) {
      this.report = stateReport;
    }
  }

  ngOnInit(): void {
    if (!this.report && typeof history !== 'undefined' && history.state?.report) {
      this.report = history.state.report;
    }
    if (this.report) {
      this.buildReportData();
    }
  }

  ngOnChanges(): void {
    if (this.report) {
      this.buildReportData();
    }
  }

  private buildReportData(): void {
    if (!this.report) {
      return;
    }

    const rawBatches =
      this.report.batchDetails ?? (this.report as any).Batchdetails ?? [];

    this.batchRows = (rawBatches as any[]).map((batch: any, index: number) => {
      const tenMM = Number(batch.tenMM ?? 0);
      const cSandOne = Number(batch.cSandOne ?? batch.csandOne ?? 0);
      const cSandTwo = Number(batch.cSandTwo ?? batch.csandTwo ?? 0);
      const twentyMM = Number(batch.twentyMM ?? 0);
      const cement = Number(batch.cement ?? 0);
      const gbbs = Number(batch.gbbs ?? 0);
      const flash = Number(batch.flash ?? 0);
      const water = Number(batch.water ?? 0);
      const addiOne = Number(batch.addiOne ?? 0);
      const sumMaterials =
        tenMM +
        cSandOne +
        cSandTwo +
        twentyMM +
        cement +
        gbbs +
        flash +
        water +
        addiOne;

      const total =
        batch.totalKg !== null &&
        batch.totalKg !== undefined &&
        Number(batch.totalKg) > 0
          ? Number(batch.totalKg)
          : batch.total !== null &&
              batch.total !== undefined &&
              Number(batch.total) > 0
            ? Number(batch.total)
            : sumMaterials;

      return {
        number: Number(batch.srNo ?? index + 1),
        volume: Number(
          batch.volumeM3 ?? batch.volume ?? this.report!.batchSize ?? 0,
        ),
        seconds: Number(batch.sec ?? batch.seconds ?? 0),
        tenMM,
        cSandOne,
        cSandTwo,
        twentyMM,
        cement,
        gbbs,
        flash,
        water,
        addiOne,
        total,
      };
    });

    this.cumulative = this.batchRows.reduce(
      (totals, row) => ({
        tenMM: totals.tenMM + row.tenMM,
        cSandOne: totals.cSandOne + row.cSandOne,
        cSandTwo: totals.cSandTwo + row.cSandTwo,
        twentyMM: totals.twentyMM + row.twentyMM,
        cement: totals.cement + row.cement,
        gbbs: totals.gbbs + row.gbbs,
        flash: totals.flash + row.flash,
        water: totals.water + row.water,
        addiOne: totals.addiOne + row.addiOne,
        total: totals.total + row.total,
      }),
      {
        tenMM: 0,
        cSandOne: 0,
        cSandTwo: 0,
        twentyMM: 0,
        cement: 0,
        gbbs: 0,
        flash: 0,
        water: 0,
        addiOne: 0,
        total: 0,
      },
    );

    const count = this.batchRows.length || 1;
    this.average = {
      tenMM: this.cumulative.tenMM / count,
      cSandOne: this.cumulative.cSandOne / count,
      cSandTwo: this.cumulative.cSandTwo / count,
      twentyMM: this.cumulative.twentyMM / count,
      cement: this.cumulative.cement / count,
      gbbs: this.cumulative.gbbs / count,
      flash: this.cumulative.flash / count,
      water: this.cumulative.water / count,
      addiOne: this.cumulative.addiOne / count,
      total: this.cumulative.total / count,
    };

    const recipe = this.report.recipe;
    const batchSize = this.report.batchSize || 0;
    const loadQty = this.report.loadQuantity || 0;

    if (recipe) {
      this.target = {
        tenMM: Number(recipe.tenMM || 0) * batchSize,
        cSandOne: Number(recipe.cSandOne || 0) * batchSize,
        cSandTwo: Number(recipe.cSandTwo || 0) * batchSize,
        twentyMM: Number(recipe.twentyMM || 0) * batchSize,
        cement: Number(recipe.cement || 0) * batchSize,
        gbbs: Number(recipe.gbbs || 0) * batchSize,
        flash: Number(recipe.flash || 0) * batchSize,
        water: Number(recipe.water || 0) * batchSize,
        addiOne: Number(recipe.addiOne || 0) * batchSize,
        total: this.recipeTotal * batchSize,
      };

      this.targetTotal = {
        tenMM: Number(recipe.tenMM || 0) * loadQty,
        cSandOne: Number(recipe.cSandOne || 0) * loadQty,
        cSandTwo: Number(recipe.cSandTwo || 0) * loadQty,
        twentyMM: Number(recipe.twentyMM || 0) * loadQty,
        cement: Number(recipe.cement || 0) * loadQty,
        gbbs: Number(recipe.gbbs || 0) * loadQty,
        flash: Number(recipe.flash || 0) * loadQty,
        water: Number(recipe.water || 0) * loadQty,
        addiOne: Number(recipe.addiOne || 0) * loadQty,
        total: this.recipeTotal * loadQty,
      };
    }
  }

  get visibleColumns(): BatchMaterialColumn[] {
    if (this.report?.visibleColumns?.length) {
      return BATCH_MATERIAL_COLUMNS.filter((column) =>
        this.report!.visibleColumns.includes(column.id),
      );
    }
    if (this.batchRows.length > 0) {
      const activeIds = BATCH_MATERIAL_COLUMNS.filter((col) => {
        if (col.id === 'total') return true;
        return this.batchRows.some(
          (row) => Number(row[col.id as keyof BatchRow]) > 0,
        );
      }).map((col) => col.id);
      if (activeIds.length > 1) {
        return BATCH_MATERIAL_COLUMNS.filter((col) =>
          activeIds.includes(col.id),
        );
      }
    }
    return BATCH_MATERIAL_COLUMNS;
  }

  get summaryColumns(): BatchMaterialColumn[] {
    return this.visibleColumns.filter((column) => column.id !== 'total');
  }

  get dataColumnWidth(): number {
    return this.visibleColumns.length ? 83 / this.visibleColumns.length : 0;
  }

  get summaryTableWidth(): number {
    return 17 + this.summaryColumns.length * this.dataColumnWidth;
  }

  get summaryIdentifierNumberWidth(): number {
    return (7.5 / this.summaryTableWidth) * 100;
  }

  get summaryIdentifierSecondsWidth(): number {
    return (9.5 / this.summaryTableWidth) * 100;
  }

  get summaryDataColumnWidth(): number {
    return (this.dataColumnWidth / this.summaryTableWidth) * 100;
  }

  get visibleColumnGroups(): { label: string; colspan: number }[] {
    return this.visibleColumns.reduce<{ label: string; colspan: number }[]>(
      (groups, column) => {
        const current = groups[groups.length - 1];
        if (current?.label === column.group) {
          current.colspan++;
        } else {
          groups.push({ label: column.group, colspan: 1 });
        }
        return groups;
      },
      [{ label: 'Batch', colspan: 2 }],
    );
  }

  getColumnValue(row: BatchRow, column: BatchMaterialColumn): number {
    return row[column.id];
  }

  get siteHeading(): string {
    const site = this.report?.site;
    const parts = [site?.siteName, site?.siteAddress].filter(Boolean);
    return parts.join(',') || 'AMANORA PARK,MAHADA';
  }

  get endTimeValue(): string {
    if (this.report?.endTime) {
      return this.report.endTime;
    }
    if (this.report?.startTime) {
      const start = new Date(this.report.startTime);
      if (!isNaN(start.getTime())) {
        const totalSec = this.batchRows.reduce((acc, row) => acc + (row.seconds || 0), 0);
        return new Date(start.getTime() + totalSec * 1000).toISOString();
      }
    }
    return this.report?.generatedAt ? String(this.report.generatedAt) : '';
  }

  formatDriver(name: string | null | undefined): string {
    if (!name) return '—';
    const trimmed = name.trim();
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      return trimmed;
    }
    return `(${trimmed})`;
  }

  formatDeliveredOrdered(): string {
    const delivered =
      this.report?.deliveredQuantity ?? this.report?.loadQuantity ?? 0;
    const deliveredStr = this.formatNumber(delivered, 1);
    if (
      this.report?.orderQuantity !== null &&
      this.report?.orderQuantity !== undefined
    ) {
      return `${deliveredStr} / ${this.formatNumber(this.report.orderQuantity, 1)}`;
    }
    return `${deliveredStr} / —`;
  }

  getSummaryValue(summary: BatchTotals, column: BatchMaterialColumn): number {
    return summary[column.id];
  }

  getMoisturePercent(column: BatchMaterialColumn): number | null {
    if (
      column.id === 'tenMM' ||
      column.id === 'cSandOne' ||
      column.id === 'cSandTwo' ||
      column.id === 'twentyMM'
    ) {
      return 0;
    }
    return null;
  }

  getMoistureKg(column: BatchMaterialColumn): number | null {
    if (
      column.id === 'tenMM' ||
      column.id === 'cSandOne' ||
      column.id === 'cSandTwo' ||
      column.id === 'twentyMM' ||
      column.id === 'water'
    ) {
      return 0;
    }
    return null;
  }

  get batchCount(): number {
    return (
      this.batchRows.length ||
      this.report?.batchCount ||
      Math.ceil(
        (this.report?.loadQuantity || 0) / (this.report?.batchSize || 1),
      ) ||
      0
    );
  }

  get cummulativeSetTotal(): number {
    if (this.targetTotal?.total) {
      return this.targetTotal.total;
    }
    const sum =
      (this.targetTotal?.tenMM || 0) +
      (this.targetTotal?.cSandOne || 0) +
      (this.targetTotal?.cSandTwo || 0) +
      (this.targetTotal?.twentyMM || 0) +
      (this.targetTotal?.cement || 0) +
      (this.targetTotal?.gbbs || 0) +
      (this.targetTotal?.flash || 0) +
      (this.targetTotal?.water || 0) +
      (this.targetTotal?.addiOne || 0);
    if (sum > 0) return sum;

    const recipe = this.report?.recipe;
    const qty = this.actualProductionQty;
    if (recipe && qty > 0) {
      return this.recipeTotal * qty;
    }
    return 0;
  }

  get actualProductionQty(): number {
    return Number(
      this.report?.productionQuantity ??
      this.report?.loadQuantity ??
      0,
    );
  }

  get thVolume(): number {
    const actualQty = this.actualProductionQty;
    const setTotal = this.cummulativeSetTotal;
    if (actualQty > 0 && setTotal > 0) {
      return setTotal / actualQty;
    }
    if (this.report?.thVolume) {
      return Number(this.report.thVolume);
    }
    return this.recipeTotal;
  }

  get recipeTotal(): number {
    const recipe = this.report?.recipe;
    if (!recipe) {
      return this.report?.thVolume ? Number(this.report.thVolume) : 0;
    }
    return (
      Number(recipe.tenMM || 0) +
      Number(recipe.cSandOne || 0) +
      Number(recipe.cSandTwo || 0) +
      Number(recipe.twentyMM || 0) +
      Number(recipe.cement || 0) +
      Number(recipe.gbbs || 0) +
      Number(recipe.flash || 0) +
      Number(recipe.water || 0) +
      Number(recipe.addiOne || 0)
    );
  }

  get cumulativeTotal(): number {
    return this.cumulative.total || Number(this.report?.caTotal ?? 0);
  }

  get moistureKg(): MoistureWeights {
    return {
      tenMM: (this.cumulative.tenMM * this.moisturePercent.tenMM) / 100,
      cSandOne: (this.cumulative.cSandOne * this.moisturePercent.cSandOne) / 100,
      cSandTwo: (this.cumulative.cSandTwo * this.moisturePercent.cSandTwo) / 100,
      water: (this.cumulative.water * this.moisturePercent.water) / 100,
    };
  }

  get waterCementRatio(): number | null {
    if (this.report?.wcRatio !== undefined && this.report?.wcRatio !== null) {
      return Number(this.report.wcRatio);
    }
    const recipe = this.report?.recipe;
    if (!recipe) return null;
    const cementitious =
      Number(recipe.cement || 0) +
      Number(recipe.gbbs || 0) +
      Number(recipe.flash || 0);
    return cementitious > 0 ? Number(recipe.water || 0) / cementitious : null;
  }

  printReport(): void {
    if (!isPlatformBrowser(this.platformId) || !this.document?.defaultView) {
      return;
    }
    const body = this.document.body;
    body.classList.add('printing-batch-details');
    const cleanup = () => {
      body.classList.remove('printing-batch-details');
      this.document.defaultView?.removeEventListener('afterprint', cleanup);
    };
    this.document.defaultView.addEventListener('afterprint', cleanup);
    this.document.defaultView.print();
    setTimeout(cleanup, 2000);
  }

  goBack(): void {
    this.router?.navigate(['/report-list']);
  }

  formatNumber(value: number | null | undefined, digits = 1): string {
    const num = Number(value ?? 0);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  formatDate(value: Date | string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatTime(value: Date | string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
        return value.length === 5 ? `${value}:00` : value;
      }
      return String(value);
    }
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
}
