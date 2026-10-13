import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, PLATFORM_ID } from '@angular/core';
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
export class ReportListComponent {
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

  async search(): Promise<void> {
    const docketNo = this.docketNo.trim();
    if (!docketNo || this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.message = '';
    this.dockets = [];
    this.selectedDocket = null;
    this.editedDocket = null;
    this.editing = false;
    this.searched = true;

    try {
      const result = await firstValueFrom(this.reportApi.getDocketDetails(docketNo));
      this.dockets = Array.isArray(result) ? result : [];
    } catch (error) {
      this.error = errorMessage(error, 'load docket details');
    } finally {
      this.loading = false;
    }
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
 
async OpenReport(docket: DocketReportDetails): Promise<void> {
 this.router.navigate(['/DownloadReport']);

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
