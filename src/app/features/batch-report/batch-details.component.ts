import { Component, Input, OnChanges } from '@angular/core';
import {
  CustomerDetails,
  DriverDetails,
  RecipeDetails,
  SiteDetails,
  TruckDetails,
} from '../../core/master-data.models';
import {
  BatchDetailSaveRequest,
  DocketDetailsSaveRequest,
} from './batch-report';

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
  reportDate?: Date | string | null;
  visibleColumns: BatchMaterialColumnId[];
  docketDate?: Date | string | null;
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

interface BatchMaterials {
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

interface BatchTotals extends BatchMaterials {
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
  selector: 'app-batch-details',
  templateUrl: './batch-details.component.html',
  styleUrl: './batch-details.component.scss',
})
export class BatchDetailsComponent implements OnChanges {
  @Input({ required: true }) report!: BatchDetailsReport;

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

  get visibleColumns(): BatchMaterialColumn[] {
    return BATCH_MATERIAL_COLUMNS.filter((column) =>
      this.report.visibleColumns.includes(column.id),
    );
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

  get siteHeading(): string {
    const site = this.report?.site;
    const parts = [site?.siteName, site?.siteAddress].filter(Boolean);
    return 'AMANORA PARK,MAHADA';
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

  getColumnValue(row: BatchRow, column: BatchMaterialColumn): number {
    return row[column.id];
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

  ngOnChanges(): void {
    const rawBatches =
      this.report.batchDetails ?? (this.report as any).Batchdetails;

    if (rawBatches && rawBatches.length > 0) {
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
            : sumMaterials;

        return {
          number: Number(batch.srNo ?? index + 1),
          volume: Number(
            batch.volumeM3 ?? batch.volume ?? this.report.batchSize ?? 0,
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
    } else {
      const count = this.report.loadQuantity / this.report.batchSize;
      const rowCount = Math.ceil(count);
      const volumePerBatch = this.report.loadQuantity / rowCount;
      const recipe = this.report.recipe;
      const actualMaterials = {
        tenMM: this.actualMaterialValues(recipe.tenMM, volumePerBatch, rowCount),
        cSandOne: this.actualMaterialValues(recipe.cSandOne, volumePerBatch, rowCount),
        cSandTwo: this.actualMaterialValues(recipe.cSandTwo, volumePerBatch, rowCount),
        twentyMM: this.actualMaterialValues(recipe.twentyMM, volumePerBatch, rowCount),
        cement: this.actualMaterialValues(recipe.cement, volumePerBatch, rowCount),
        gbbs: this.actualMaterialValues(recipe.gbbs, volumePerBatch, rowCount),
        flash: this.actualMaterialValues(recipe.flash, volumePerBatch, rowCount),
        water: this.actualMaterialValues(recipe.water, volumePerBatch, rowCount),
        addiOne: this.actualMaterialValues(recipe.addiOne, volumePerBatch, rowCount),
      };

      this.batchRows = Array.from({ length: rowCount }, (_, index) => {
        const volume = volumePerBatch;
        const row = {
          number: index + 1,
          volume,
          seconds: 55 + ((index * 17 + recipe.rid * 7) % 76),
          tenMM: actualMaterials.tenMM[index],
          cSandOne: actualMaterials.cSandOne[index],
          cSandTwo: actualMaterials.cSandTwo[index],
          twentyMM: actualMaterials.twentyMM[index],
          cement: actualMaterials.cement[index],
          gbbs: actualMaterials.gbbs[index],
          flash: actualMaterials.flash[index],
          water: actualMaterials.water[index],
          addiOne: actualMaterials.addiOne[index],
          total: 0,
        };
        row.total =
          row.tenMM +
          row.cSandOne +
          row.cSandTwo +
          row.twentyMM +
          row.cement +
          row.gbbs +
          row.flash +
          row.water +
          row.addiOne;
        return row;
      });
    }

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

  private actualMaterialValues(recipeValue: number, volume: number, batchCount: number): number[] {
    const batchVariations = Array.from({ length: batchCount }, () => Math.random() * 2 - 1);
    const averageVariation =
      batchVariations.reduce((total, variation) => total + variation, 0) / batchCount;
    const maximumVariation = Math.max(
      ...batchVariations.map((variation) => Math.abs(variation - averageVariation)),
    );
    const overallVariation = Math.random() * 0.004 - 0.002;

    return batchVariations.map(
      (variation) =>
        Number(recipeValue) *
        volume *
        (1 + overallVariation +
          ((variation - averageVariation) / (maximumVariation || 1)) * 0.021),
    );
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

  getBatchDetailSaveRequests(): BatchDetailSaveRequest[] {
    return this.batchRows.map((row) => ({
      srNo: row.number,
      sec: row.seconds,
      volumeM3: Number(row.volume.toFixed(2)),
      tenMM: Number(row.tenMM.toFixed(1)),
      csandOne: Number(row.cSandOne.toFixed(1)),
      csandTwo: Number(row.cSandTwo.toFixed(1)),
      twentyMM: Number(row.twentyMM.toFixed(1)),
      cement: Number(row.cement.toFixed(1)),
      gbbs: Number(row.gbbs.toFixed(1)),
      flash: Number(row.flash.toFixed(1)),
      water: Number(row.water.toFixed(1)),
      addiOne: Number(row.addiOne.toFixed(2)),
      totalKg: Number(row.total.toFixed(1)),
    }));
  }

  toSaveRequest(): DocketDetailsSaveRequest {
    const reportDate =
      this.report.reportDate
        ? this.report.reportDate instanceof Date
          ? this.report.reportDate.toISOString()
          : new Date(this.report.reportDate).toISOString()
        : this.report.generatedAt instanceof Date
          ? this.report.generatedAt.toISOString()
          : new Date(this.report.generatedAt).toISOString();

    return {
      dockID: 0,
      docketNo: this.report.docketNumber || '800',
      docketDate: reportDate,
      cid: this.report.customer?.cid ?? null,
      sid: this.report.site?.sid ?? null,
      rid: this.report.recipe?.rid ?? null,
      trid: this.report.truck?.trid ?? null,
      drid: this.report.driver?.drid ?? null,
      startTime: this.report.startTime || null,
      endTime: this.endTimeValue || reportDate,
      batchCount: this.batchCount,
      batchSize: this.report.batchSize,
      orderQuantity: this.report.orderQuantity ?? this.report.loadQuantity,
      deliveredQuantity: this.report.deliveredQuantity ?? this.report.loadQuantity,
      thVolume: Number(this.thVolume.toFixed(2)),
      reportDate: reportDate,
      caTotal: Number(this.cumulativeTotal.toFixed(1)),
      productionQuantity: this.report.loadQuantity,
      totalCycle: this.batchCount,
      cycleStatus: 'Cycle Complete',
      wcRatio:
        this.waterCementRatio !== null
          ? Number(this.waterCementRatio.toFixed(2))
          : null,
      batchDetails: this.getBatchDetailSaveRequests(),
    };
  }
}
