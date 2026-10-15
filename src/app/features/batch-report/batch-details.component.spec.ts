import { vi } from 'vitest';
import {
  BATCH_MATERIAL_COLUMNS,
  BatchDetailsComponent,
  BatchDetailsReport,
} from './batch-details.component';

const report: BatchDetailsReport = {
  docketNumber: '456987',
  customer: { cid: 1, customerName: 'Customer', oder: 'OD-001', customerAddress: 'Address' },
  site: { sid: 1, cid: 1, siteName: 'Site', siteAddress: 'Address' },
  recipe: {
    rid: 1,
    cid: 1,
    sid: 1,
    recipeName: 'M50',
    recipeCode: 'M50',
    tenMM: 10,
    cSandOne: 20,
    cSandTwo: 30,
    twentyMM: 40,
    cement: 50,
    gbbs: 10,
    flash: 5,
    water: 20,
    addiOne: 1,
  },
  driver: { drid: 1, driverName: 'Driver' },
  truck: { trid: 1, truckNumber: 'Truck' },
  startTime: '2026-10-06T08:00',
  loadQuantity: 6,
  batchSize: 0.75,
  generatedAt: new Date('2026-10-06T08:00:00'),
  visibleColumns: BATCH_MATERIAL_COLUMNS.map((column) => column.id),
};

describe('BatchDetailsComponent', () => {
  it('calculates the batch count, cycle seconds, actual averages, and recipe targets', () => {
    const component = new BatchDetailsComponent();
    component.report = report;

    component.ngOnChanges();

    expect(component.batchCount).toBe(8);
    expect(component.batchRows).toHaveLength(8);
    expect(component.batchRows[0].volume).toBe(0.75);
    expect(component.batchRows.map((row) => row.seconds)).toEqual([
      62, 79, 96, 113, 130, 71, 88, 105,
    ]);
    expect(component.batchRows.every((row) => row.seconds >= 55 && row.seconds <= 130)).toBe(true);
    expect(Math.abs(component.batchRows[0].tenMM - component.target.tenMM)).toBeLessThan(
      component.target.tenMM * 0.025,
    );
    expect(component.batchRows[0].tenMM).not.toBe(component.target.tenMM);
    expect(component.target.tenMM).toBe(7.5);
    expect(component.targetTotal.tenMM).toBe(60);
    expect(component.targetTotal.total).toBe(1116);
    expect(component.batchRows[0].total).not.toBe(component.target.total);
    expect(component.average.tenMM).toBeCloseTo(component.cumulative.tenMM / 8);
    expect(component.cumulativeTotal).toBeCloseTo(
      component.batchRows.reduce((sum, row) => sum + row.total, 0),
    );
    expect(Math.abs(component.cumulativeTotal - component.targetTotal.total)).toBeLessThan(
      component.targetTotal.total * 0.01,
    );
  });

  it('balances a partial final batch across all batches while preserving the requested load quantity', () => {
    const component = new BatchDetailsComponent();
    component.report = { ...report, loadQuantity: 1.5, batchSize: 1 };

    component.ngOnChanges();

    expect(component.batchCount).toBe(2);
    expect(component.batchCount).toBe(component.batchRows.length);
    expect(component.batchRows.map((row) => row.volume)).toEqual([0.75, 0.75]);
    expect(component.batchRows.reduce((sum, row) => sum + row.volume, 0)).toBe(1.5);
    for (const material of [
      'tenMM',
      'cSandOne',
      'cSandTwo',
      'twentyMM',
      'cement',
      'gbbs',
      'flash',
      'water',
      'addiOne',
    ] as const) {
      const firstBatchValue = component.batchRows[0][material];
      const lastBatchValue = component.batchRows[1][material];
      expect(Math.abs(firstBatchValue - lastBatchValue)).toBeLessThan(
        ((firstBatchValue + lastBatchValue) / 2) * 0.05,
      );
    }
    expect(component.target.total).toBe(186);
    expect(component.targetTotal.tenMM).toBe(15);
    expect(component.targetTotal.total).toBe(279);
    expect(Math.abs(component.cumulativeTotal - 279)).toBeLessThan(279 * 0.01);
  });

  it('varies batch values while keeping cumulative actuals within one percent of targets', () => {
    const component = new BatchDetailsComponent();
    component.report = report;
    let reverseVariation = false;
    let randomCall = 0;
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      const position = randomCall++ % 9;
      if (position === 8) {
        return 0.5;
      }
      return (position % 2 === 0) !== reverseVariation ? 0 : 1;
    });
    const materials = [
      'tenMM',
      'cSandOne',
      'cSandTwo',
      'twentyMM',
      'cement',
      'gbbs',
      'flash',
      'water',
      'addiOne',
    ] as const;

    try {
      component.ngOnChanges();
      const firstGeneration = component.batchRows.map((row) => row.tenMM);

      for (const material of materials) {
        const target = Number(report.recipe[material]) * component.batchRows[0].volume;
        const batchValues = component.batchRows.map((row) => row[material]);
        expect(Math.max(...batchValues) - Math.min(...batchValues)).toBeGreaterThan(target * 0.03);
      }

      reverseVariation = true;
      component.ngOnChanges();
      expect(component.batchRows.map((row) => row.tenMM)).not.toEqual(firstGeneration);
      expect(component.batchRows.map((row) => row.tenMM)).not.toEqual(firstGeneration);
      for (const row of component.batchRows) {
        for (const material of materials) {
          const target = Number(report.recipe[material]) * row.volume;
          expect(Math.abs(row[material] - target)).toBeLessThan(target * 0.025);
        }
        const totalTarget = component.recipeTotal * row.volume;
        expect(Math.abs(row.total - totalTarget)).toBeLessThan(totalTarget * 0.025);
      }
      for (const material of materials) {
        expect(
          Math.abs(component.cumulative[material] - component.targetTotal[material]),
        ).toBeLessThan(component.targetTotal[material] * 0.01);
      }
      expect(
        Math.abs(component.cumulativeTotal - component.targetTotal.total),
      ).toBeLessThan(component.targetTotal.total * 0.01);
    } finally {
      random.mockRestore();
    }
  });

  it('calculates moisture weights from moisture percentages and actual totals', () => {
    const component = new BatchDetailsComponent();
    component.report = report;
    component.ngOnChanges();
    component.moisturePercent = {
      tenMM: 5,
      cSandOne: 2,
      cSandTwo: 1,
      water: 3,
    };

    expect(component.moistureKg.tenMM).toBeCloseTo((component.cumulative.tenMM * 5) / 100);
    expect(component.moistureKg.cSandOne).toBeCloseTo((component.cumulative.cSandOne * 2) / 100);
    expect(component.moistureKg.cSandTwo).toBeCloseTo((component.cumulative.cSandTwo * 1) / 100);
    expect(component.moistureKg.water).toBeCloseTo((component.cumulative.water * 3) / 100);
  });

  it('renders selected columns, including totals in the lower summary table', () => {
    const component = new BatchDetailsComponent();
    component.report = {
      ...report,
      visibleColumns: ['tenMM', 'water', 'total'],
    };

    expect(component.visibleColumns.map((column) => column.id)).toEqual([
      'tenMM',
      'water',
      'total',
    ]);
    expect(component.dataColumnWidth).toBeCloseTo(83 / 3);
    expect(component.summaryColumns.map((column) => column.id)).toEqual(['tenMM', 'water']);
    expect(component.summaryTableWidth).toBeCloseTo(17 + (83 / 3) * 2);
    expect(component.visibleColumnGroups).toEqual([
      { label: 'Batch', colspan: 2 },
      { label: 'Aggragate (Kg)', colspan: 1 },
      { label: 'Water', colspan: 1 },
      { label: 'Total', colspan: 1 },
    ]);
    expect(component.getSummaryValue(component.cumulative, component.visibleColumns[2])).toBe(
      component.cumulative.total,
    );
  });

  it('calculates TH Volume using Cummulative Set Total / Actual Production Qty and includes it in save request', () => {
    const component = new BatchDetailsComponent();
    component.report = report;
    component.ngOnChanges();

    expect(component.cummulativeSetTotal).toBe(1116);
    expect(component.actualProductionQty).toBe(6);
    expect(component.thVolume).toBe(186);

    const saveRequest = component.toSaveRequest();
    expect(saveRequest.thVolume).toBe(186);
  });
});
