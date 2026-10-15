import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { RecipeDetails } from '../../core/master-data.models';
import { RecipeService } from '../recipes/recipe.service';
import {
  BatchDetailSaveRequest,
  DocketDetailsSaveRequest,
  DocketReportDetails,
} from '../batch-report/batch-report';
import { BatchReportService } from '../batch-report/batch-report.service';
import { Router } from '@angular/router';
import {
  BatchDetailsReport,
  BatchMaterialColumnId,
} from '../download-report/download-report.component';

type DocketFieldKey = Exclude<keyof DocketDetailsSaveRequest, 'batchDetails'>;
type BatchFieldKey = keyof BatchDetailSaveRequest;

interface EditableField<T extends string> {
  key: T;
  label: string;
  type: 'text' | 'number' | 'datetime-local';
}

function errorMessage(error: unknown, action: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) {
      return `Your session may have expired. Sign in again to ${action}.`;
    }
    return error.status
      ? `Could not ${action} (${error.status}).`
      : `Could not reach the API to ${action}. Check the service connection.`;
  }
  return `Could not ${action}.`;
}

@Component({
  selector: 'app-report-list',
  imports: [FormsModule],
  templateUrl: './report-list.component.html',
  styleUrl: './report-list.component.scss',
})
export class ReportListComponent implements OnInit {
  private readonly reportApi = inject(BatchReportService);
  private readonly recipesApi = inject(RecipeService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly docketFields: EditableField<DocketFieldKey>[] = [
    { key: 'dockID', label: 'Docket ID', type: 'number' },
    { key: 'docketNo', label: 'Docket number', type: 'text' },
    { key: 'docketDate', label: 'Docket date', type: 'datetime-local' },
    { key: 'cid', label: 'Customer ID', type: 'number' },
    { key: 'sid', label: 'Site ID', type: 'number' },
    { key: 'rid', label: 'Recipe ID', type: 'number' },
    { key: 'trid', label: 'Truck ID', type: 'number' },
    { key: 'drid', label: 'Driver ID', type: 'number' },
    { key: 'startTime', label: 'Start time', type: 'datetime-local' },
    { key: 'endTime', label: 'End time', type: 'datetime-local' },
    { key: 'batchCount', label: 'Batch count', type: 'number' },
    { key: 'batchSize', label: 'Batch size', type: 'number' },
    { key: 'orderQuantity', label: 'Order quantity', type: 'number' },
    { key: 'deliveredQuantity', label: 'Delivered quantity', type: 'number' },
    { key: 'thVolume', label: 'TH volume', type: 'number' },
    { key: 'reportDate', label: 'Report date', type: 'datetime-local' },
    { key: 'caTotal', label: 'Cumulative actual total', type: 'number' },
    { key: 'productionQuantity', label: 'Production quantity', type: 'number' },
    { key: 'totalCycle', label: 'Total cycle', type: 'number' },
    { key: 'cycleStatus', label: 'Cycle status', type: 'text' },
    { key: 'wcRatio', label: 'Water/cement ratio', type: 'number' },
  ];

  readonly batchFields: { key: BatchFieldKey; label: string }[] = [
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

  docketNo = '';
  dockets: DocketReportDetails[] = [];
  selectedDocket: DocketReportDetails | null = null;
  editedDocket: DocketDetailsSaveRequest | null = null;
  loading = false;
  saving = false;
  downloading = false;
  editing = false;
  searched = false;
  error = '';
  message = '';
  page = 1;
  pageSize = 10;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    void this.loadDockets();
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.dockets.length / this.pageSize));
  }

  get pagedDockets(): DocketReportDetails[] {
    const validPage = Math.min(Math.max(1, this.page), this.pageCount);
    const start = (validPage - 1) * this.pageSize;
    return this.dockets.slice(start, start + this.pageSize);
  }

  get firstVisibleRecord(): number {
    return this.dockets.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get lastVisibleRecord(): number {
    return Math.min(this.page * this.pageSize, this.dockets.length);
  }

  changePageSize(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    this.pageSize = Number(target.value);
    this.page = 1;
  }

  async loadDockets(docketNo?: string): Promise<void> {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.message = '';
    this.selectedDocket = null;
    this.editedDocket = null;
    this.editing = false;
    this.searched = Boolean(docketNo && docketNo.trim());

    try {
      const result = await firstValueFrom(this.reportApi.getDocketDetails(docketNo));
      this.dockets = Array.isArray(result) ? result : [];
      this.page = 1;
    } catch (error) {
      this.error = errorMessage(error, 'load docket details');
    } finally {
      this.loading = false;
    }
  }

  async search(): Promise<void> {
    const docketNo = this.docketNo.trim();
    await this.loadDockets(docketNo || undefined);
  }

  async clearSearch(): Promise<void> {
    this.docketNo = '';
    await this.loadDockets();
  }

  edit(docket: DocketReportDetails): void {
    this.selectedDocket = docket;
    this.editedDocket = {
      ...this.toSaveRequest(docket),
      docketDate: this.toLocalDateTime(docket.docketDate),
      reportDate: this.toLocalDateTime(docket.reportDate),
      startTime: this.toLocalDateTime(docket.startTime),
      endTime: this.toLocalDateTime(docket.endTime),
      batchDetails: (docket.batchDetails ?? []).map((batch) => ({ ...batch })),
    };
    this.editing = true;
    this.message = '';
    this.error = '';
  }

  updateDocketField(field: EditableField<DocketFieldKey>, value: string | number | null): void {
    if (!this.editedDocket) {
      return;
    }
    const parsedValue =
      field.type === 'number' ? (value === '' || value === null ? null : Number(value)) : value;
    this.editedDocket = { ...this.editedDocket, [field.key]: parsedValue };
  }

  async save(): Promise<void> {
    const originalDocket = this.selectedDocket;
    if (
      !this.editedDocket ||
      !originalDocket ||
      this.saving ||
      !isPlatformBrowser(this.platformId)
    ) {
      return;
    }

    this.saving = true;
    this.error = '';
    this.message = '';
    try {
      const payload = this.toSaveRequest(this.editedDocket);
      const result = await firstValueFrom(this.reportApi.saveDocketDetails(payload));
      const savedDocket: DocketReportDetails = {
        ...originalDocket,
        ...payload,
        docketNo: result.docketNo || payload.docketNo,
        batchDetails: payload.batchDetails,
      };
      this.selectedDocket = savedDocket;
      this.dockets = this.dockets.map((docket) =>
        docket === originalDocket ||
        (savedDocket.dockID !== null && docket.dockID === savedDocket.dockID)
          ? savedDocket
          : docket,
      );
      this.editing = false;
      this.message = `Docket ${savedDocket.docketNo ?? ''} was saved.`;
    } catch (error) {
      this.error = errorMessage(error, 'save docket changes');
    } finally {
      this.saving = false;
    }
  }

  cancelEdit(): void {
    this.editedDocket = null;
    this.editing = false;
    this.error = '';
  }

  updateBatchField(
    batch: BatchDetailSaveRequest,
    field: BatchFieldKey,
    value: string | number | null,
  ): void {
    batch[field] = value === '' || value === null ? null : Number(value);
  }
  constructor(private router: Router) {}
 
  async openReport(report: any): Promise<void> {
    const rawBatches: BatchDetailSaveRequest[] =
      report.batchDetails ?? report.Batchdetails ?? report.batchdetails ?? [];

    const materialColumnMap: {
      key: keyof BatchDetailSaveRequest;
      id: BatchMaterialColumnId;
    }[] = [
      { key: 'tenMM', id: 'tenMM' },
      { key: 'csandOne', id: 'cSandOne' },
      { key: 'csandTwo', id: 'cSandTwo' },
      { key: 'twentyMM', id: 'twentyMM' },
      { key: 'cement', id: 'cement' },
      { key: 'gbbs', id: 'gbbs' },
      { key: 'flash', id: 'flash' },
      { key: 'water', id: 'water' },
      { key: 'addiOne', id: 'addiOne' },
    ];

    const activeColumns = materialColumnMap
      .filter((m) =>
        rawBatches.some((b: any) => {
          const val = b[m.key] ?? b[m.id];
          return val !== null && val !== undefined && Number(val) > 0;
        }),
      )
      .map((m) => m.id);

    const visibleColumns: BatchMaterialColumnId[] =
      activeColumns.length > 0
        ? [...activeColumns, 'total']
        : [
            'tenMM',
            'cSandOne',
            'cSandTwo',
            'twentyMM',
            'cement',
            'gbbs',
            'flash',
            'water',
            'addiOne',
            'total',
          ];

    let recipeDetails: RecipeDetails | undefined;
    if (report.rid) {
      try {
        const recipes = await firstValueFrom(this.recipesApi.getDetails());
        recipeDetails = recipes.find((item) => item.rid === report.rid);
      } catch {
        // Recipe lookup failed; use fallback values
      }
    }

    const recipe: RecipeDetails = recipeDetails ?? {
      rid: report.rid ?? 0,
      cid: report.cid ?? 0,
      recipeName: report.recipeName ?? '',
      recipeCode: report.recipeCode ?? report.recipeName ?? '',
      tenMM: report.tenMM ?? 0,
      cSandOne: report.cSandOne ?? report.csandOne ?? 0,
      cSandTwo: report.cSandTwo ?? report.csandTwo ?? 0,
      twentyMM: report.twentyMM ?? 0,
      cement: report.cement ?? 0,
      gbbs: report.gbbs ?? 0,
      flash: report.flash ?? 0,
      water: report.water ?? 0,
      addiOne: report.addiOne ?? 0,
    };

    const mappedReport: BatchDetailsReport = {
      docketNumber: report.docketNo ?? '',
      customer: {
        cid: report.cid ?? 0,
        customerName: report.customerName ?? '',
        customerAddress: report.customerAddress ?? '',
      },
      site: {
        sid: report.sid ?? 0,
        cid: report.cid ?? 0,
        siteName: report.siteName ?? '',
        siteAddress: report.siteAddress ?? '',
      },
      recipe,
      driver: {
        drid: report.drid ?? 0,
        driverName: report.driverName ?? '',
        driverMobileNo: report.driverMobileNo ?? '',
      },
      truck: {
        trid: report.trid ?? 0,
        truckNumber: report.truckNumber ?? '',
      },
      startTime: report.startTime ? String(report.startTime) : '',
      loadQuantity: Number(
        report.deliveredQuantity ??
          report.productionQuantity ??
          report.orderQuantity ??
          0,
      ),
      batchSize: Number(report.batchSize ?? 0),
      generatedAt: report.reportDate
        ? new Date(report.reportDate)
        : report.docketDate
          ? new Date(report.docketDate)
          : new Date(),
      visibleColumns,
      batchDetails: rawBatches,
      wcRatio: report.wcRatio,
      deliveredQuantity: report.deliveredQuantity,
      orderQuantity: report.orderQuantity,
      thVolume: report.thVolume,
      batchCount: report.batchCount,
      productionQuantity: report.productionQuantity,
      caTotal: report.caTotal,
      totalCycle: report.totalCycle,
      cycleStatus: report.cycleStatus,
      endTime: report.endTime,
    };

    this.router.navigate(['/download-report'], {
      state: { report: mappedReport },
    });
  }
  async downloadPdf(docket: DocketReportDetails): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.downloading) {
      return;
    }

    this.downloading = true;
    this.error = '';
    let recipe: RecipeDetails | undefined;
    try {
      const recipes = await firstValueFrom(this.recipesApi.getDetails());
      recipe = recipes.find((item) => item.rid === docket.rid);
      if (!recipe) {
        throw new Error(`Recipe ${docket.rid ?? '—'} was not found.`);
      }
    } catch (error) {
      this.error =
        error instanceof HttpErrorResponse
          ? errorMessage(error, `load recipe ${docket.rid ?? ''}`)
          : error instanceof Error
            ? error.message
            : 'Could not load the recipe for this docket.';
      this.downloading = false;
      return;
    }

    try {
      
      this.error = '';
    } catch (error) {
      this.error = `Could not generate the PDF: ${
        error instanceof Error ? error.message : 'An unexpected error occurred.'
      }`;
    } finally {
      this.downloading = false;
    }
  }

  formatDate(value: Date | string | null): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  private toLocalDateTime(value: Date | string | null): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16);
  }

  private toSaveRequest(docket: DocketDetailsSaveRequest): DocketDetailsSaveRequest {
    const asIsoDate = (value: Date | string | null): string | null => {
      if (!value) {
        return null;
      }
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    };

    return {
      dockID: docket.dockID,
      docketNo: docket.docketNo,
      docketDate: asIsoDate(docket.docketDate),
      cid: docket.cid,
      sid: docket.sid,
      rid: docket.rid,
      trid: docket.trid,
      drid: docket.drid,
      startTime: docket.startTime,
      endTime: docket.endTime,
      batchCount: docket.batchCount,
      batchSize: docket.batchSize,
      orderQuantity: docket.orderQuantity,
      deliveredQuantity: docket.deliveredQuantity,
      thVolume: docket.thVolume,
      reportDate: asIsoDate(docket.reportDate),
      caTotal: docket.caTotal,
      productionQuantity: docket.productionQuantity,
      totalCycle: docket.totalCycle,
      cycleStatus: docket.cycleStatus,
      wcRatio: docket.wcRatio,
      batchDetails: (docket.batchDetails ?? []).map((batch) => ({ ...batch })),
    };
  }
}
