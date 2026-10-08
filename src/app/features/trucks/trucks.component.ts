import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TruckDetails } from '../../core/master-data.models';
import { SaveTruckRequest } from './truck';
import { TruckService } from './truck.service';

interface TruckForm {
  truckNumber: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function property(value: Record<string, unknown>, name: string): unknown {
  const key = Object.keys(value).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? value[key] : undefined;
}

function extractTrucks(value: unknown): TruckDetails[] | null {
  if (Array.isArray(value)) {
    const trucks: TruckDetails[] = [];
    for (const item of value) {
      if (!isRecord(item)) {
        return null;
      }
      const trid = Number(property(item, 'trid') ?? property(item, 'truckId'));
      const truckNumber = property(item, 'truckNumber');
      if (!Number.isFinite(trid) || typeof truckNumber !== 'string') {
        return null;
      }
      trucks.push({ ...item, trid, truckNumber });
    }
    return trucks;
  }
  if (!isRecord(value)) {
    return null;
  }
  for (const key of ['data', 'result', 'items', 'records', 'value']) {
    const nested = property(value, key);
    if (Array.isArray(nested)) {
      return extractTrucks(nested);
    }
    if (isRecord(nested)) {
      const trucks = extractTrucks(nested);
      if (trucks !== null) {
        return trucks;
      }
    }
  }
  return null;
}

@Component({
  selector: 'app-trucks',
  imports: [FormsModule],
  templateUrl: './trucks.component.html',
  styleUrl: './trucks.component.scss',
})
export class TrucksComponent implements OnInit, OnDestroy {
  private readonly trucksApi = inject(TruckService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetector = inject(ChangeDetectorRef);

  trucks: TruckDetails[] = [];
  loading = true;
  error = '';
  saveError = '';
  successMessage = '';
  modalOpen = false;
  saving = false;
  editingTruck: TruckDetails | null = null;
  truckForm: TruckForm = this.emptyForm();
  page = 1;
  pageSize = 10;
  private successMessageTimer: ReturnType<typeof setTimeout> | undefined;

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.trucks.length / this.pageSize));
  }

  get pagedTrucks(): TruckDetails[] {
    const start = (this.page - 1) * this.pageSize;
    return this.trucks.slice(start, start + this.pageSize);
  }

  get firstVisibleRecord(): number {
    return this.trucks.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get lastVisibleRecord(): number {
    return Math.min(this.page * this.pageSize, this.trucks.length);
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }
    this.loadTrucks();
  }

  ngOnDestroy(): void {
    this.clearSuccessMessageTimer();
  }

  openCreateDialog(): void {
    this.clearSuccessMessageTimer();
    this.editingTruck = null;
    this.truckForm = this.emptyForm();
    this.saveError = '';
    this.successMessage = '';
    this.modalOpen = true;
  }

  openEditDialog(truck: TruckDetails): void {
    this.clearSuccessMessageTimer();
    this.editingTruck = truck;
    this.truckForm = { truckNumber: truck.truckNumber };
    this.saveError = '';
    this.successMessage = '';
    this.modalOpen = true;
  }

  closeDialog(): void {
    if (!this.saving) {
      this.modalOpen = false;
    }
  }

  changePageSize(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    this.pageSize = Number(target.value);
    this.page = 1;
  }

  saveTruck(form: NgForm): void {
    if (!form.valid || this.saving) {
      return;
    }
    const truckNumber = this.truckForm.truckNumber.trim();
    if (!truckNumber) {
      this.saveError = 'Truck number is required.';
      return;
    }

    const isUpdate = this.editingTruck !== null;
    const request: SaveTruckRequest = {
      TRID: this.editingTruck?.trid ?? null,
      TruckNumber: truckNumber,
    };

    this.saving = true;
    this.saveError = '';
    this.successMessage = '';
    this.trucksApi.saveTruckDetails(request).subscribe({
      next: (response) => {
        const result = isRecord(response) ? Number(property(response, 'result')) : Number.NaN;
        const message = isRecord(response) ? property(response, 'message') : undefined;
        if (result !== 1) {
          this.saveError =
            typeof message === 'string' && message
              ? message
              : 'The API could not save this truck.';
          this.saving = false;
          this.changeDetector.markForCheck();
          return;
        }

        this.modalOpen = false;
        this.saving = false;
        this.successMessage =
          (typeof message === 'string' && message) ||
          (isUpdate ? 'Truck updated successfully.' : 'Truck created successfully.');
        this.clearSuccessMessageTimer();
        this.successMessageTimer = setTimeout(() => {
          this.successMessage = '';
          this.successMessageTimer = undefined;
          this.changeDetector.markForCheck();
        }, 10_000);
        this.changeDetector.markForCheck();
        this.loadTrucks(!isUpdate);
      },
      error: (error: unknown) => {
        this.saveError = this.requestError(error, 'save this truck');
        this.saving = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private loadTrucks(showLastPage = false): void {
    this.loading = true;
    this.error = '';
    this.trucksApi.getDetails().subscribe({
      next: (response) => {
        const trucks = extractTrucks(response);
        if (trucks === null) {
          this.trucks = [];
          this.error = 'The API returned truck data in an unexpected format.';
        } else {
          this.trucks = trucks;
          this.page = showLastPage ? this.pageCount : Math.min(this.page, this.pageCount);
        }
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.trucks = [];
          this.page = 1;
        } else {
          this.error = this.requestError(error, 'load truck records');
        }
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private clearSuccessMessageTimer(): void {
    if (this.successMessageTimer !== undefined) {
      clearTimeout(this.successMessageTimer);
      this.successMessageTimer = undefined;
    }
  }

  private emptyForm(): TruckForm {
    return { truckNumber: '' };
  }

  private requestError(error: unknown, action: string): string {
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
}
