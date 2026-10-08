import { Component, Input, OnChanges } from '@angular/core';
import {
  CustomerDetails,
  DriverDetails,
  RecipeDetails,
  SiteDetails,
  TruckDetails,
} from '../../core/master-data.models';

export interface BatchDetailsReport {
  customer: CustomerDetails;
  site: SiteDetails;
  recipe: RecipeDetails;
  driver: DriverDetails;
  truck: TruckDetails;
  startTime: string;
  loadQuantity: number;
  batchSize: number;
  generatedAt: Date;
  visibleColumns: BatchMaterialColumnId[];
}

interface BatchRow {
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
  { id: 'tenMM', label: '10MM', group: 'Aggregate (Kg)', precision: 1 },
  { id: 'cSandOne', label: 'C SAND 1', group: 'Aggregate (Kg)', precision: 1 },
  { id: 'cSandTwo', label: 'C SAND 2', group: 'Aggregate (Kg)', precision: 1 },
  { id: 'twentyMM', label: '20MM', group: 'Aggregate (Kg)', precision: 1 },
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

  getColumnValue(row: BatchRow, column: BatchMaterialColumn): number {
    return row[column.id];
  }

  getSummaryValue(summary: BatchTotals, column: BatchMaterialColumn): number {
    return summary[column.id];
  }

  getMoisturePercent(column: BatchMaterialColumn): number | null {
    return column.id in this.moisturePercent
      ? this.moisturePercent[column.id as keyof MoisturePercentages]
      : null;
  }

  getMoistureKg(column: BatchMaterialColumn): number | null {
    return column.id in this.moistureKg
      ? this.moistureKg[column.id as keyof MoistureWeights]
      : null;
  }

  ngOnChanges(): void {
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

    const batchCount = this.batchRows.length;
    this.average = {
      tenMM: this.cumulative.tenMM / batchCount,
      cSandOne: this.cumulative.cSandOne / batchCount,
      cSandTwo: this.cumulative.cSandTwo / batchCount,
      twentyMM: this.cumulative.twentyMM / batchCount,
      cement: this.cumulative.cement / batchCount,
      gbbs: this.cumulative.gbbs / batchCount,
      flash: this.cumulative.flash / batchCount,
      water: this.cumulative.water / batchCount,
      addiOne: this.cumulative.addiOne / batchCount,
      total: this.cumulative.total / batchCount,
    };

    this.target = {
      tenMM: Number(recipe.tenMM) * this.report.batchSize,
      cSandOne: Number(recipe.cSandOne) * this.report.batchSize,
      cSandTwo: Number(recipe.cSandTwo) * this.report.batchSize,
      twentyMM: Number(recipe.twentyMM) * this.report.batchSize,
      cement: Number(recipe.cement) * this.report.batchSize,
      gbbs: Number(recipe.gbbs) * this.report.batchSize,
      flash: Number(recipe.flash) * this.report.batchSize,
      water: Number(recipe.water) * this.report.batchSize,
      addiOne: Number(recipe.addiOne) * this.report.batchSize,
      total: this.recipeTotal * this.report.batchSize,
    };

    this.targetTotal = {
      tenMM: Number(recipe.tenMM) * this.report.loadQuantity,
      cSandOne: Number(recipe.cSandOne) * this.report.loadQuantity,
      cSandTwo: Number(recipe.cSandTwo) * this.report.loadQuantity,
      twentyMM: Number(recipe.twentyMM) * this.report.loadQuantity,
      cement: Number(recipe.cement) * this.report.loadQuantity,
      gbbs: Number(recipe.gbbs) * this.report.loadQuantity,
      flash: Number(recipe.flash) * this.report.loadQuantity,
      water: Number(recipe.water) * this.report.loadQuantity,
      addiOne: Number(recipe.addiOne) * this.report.loadQuantity,
      total: this.recipeTotal * this.report.loadQuantity,
    };
  }

  get batchCount(): number {
    return Math.ceil(this.report.loadQuantity / this.report.batchSize);
  }

  get recipeTotal(): number {
    const recipe = this.report.recipe;
    return (
      Number(recipe.tenMM) +
      Number(recipe.cSandOne) +
      Number(recipe.cSandTwo) +
      Number(recipe.twentyMM) +
      Number(recipe.cement) +
      Number(recipe.gbbs) +
      Number(recipe.flash) +
      Number(recipe.water) +
      Number(recipe.addiOne)
    );
  }

  get cumulativeTotal(): number {
    return this.cumulative.total;
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
    const recipe = this.report.recipe;
    const cementitious = Number(recipe.cement) + Number(recipe.gbbs) + Number(recipe.flash);
    return cementitious > 0 ? Number(recipe.water) / cementitious : null;
  }

  formatNumber(value: number, digits = 1): string {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  formatDate(value: Date | string): string {
    return new Date(value).toLocaleDateString();
  }

  formatTime(value: string): string {
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
