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
import { DriverDetails } from '../../core/master-data.models';
import { SaveDriverRequest } from './driver';
import { DriverService } from './driver.service';

interface DriverForm {
  driverName: string;
  driverMobileNo: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function property(value: Record<string, unknown>, name: string): unknown {
  const key = Object.keys(value).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? value[key] : undefined;
}

function extractDrivers(value: unknown): DriverDetails[] | null {
  if (Array.isArray(value)) {
    const drivers: DriverDetails[] = [];
    for (const item of value) {
      if (!isRecord(item)) {
        return null;
      }
      const drid = Number(property(item, 'drid') ?? property(item, 'driverId'));
      const driverName = property(item, 'driverName');
      const mobileNumber =
        property(item, 'driverMobileNo') ??
        property(item, 'driverMobile') ??
        property(item, 'driverMobileNumber') ??
        property(item, 'mobileNo') ??
        property(item, 'mobileNumber');
      if (
        !Number.isFinite(drid) ||
        typeof driverName !== 'string' ||
        (mobileNumber !== undefined &&
          mobileNumber !== null &&
          typeof mobileNumber !== 'string' &&
          typeof mobileNumber !== 'number')
      ) {
        return null;
      }
      drivers.push({
        ...item,
        drid,
        driverName,
        driverMobileNo:
          typeof mobileNumber === 'string' || typeof mobileNumber === 'number'
            ? String(mobileNumber)
            : '',
      });
    }
    return drivers;
  }
  if (!isRecord(value)) {
    return null;
  }
  for (const key of ['data', 'result', 'items', 'records', 'value']) {
    const nested = property(value, key);
    if (Array.isArray(nested)) {
      return extractDrivers(nested);
    }
    if (isRecord(nested)) {
      const drivers = extractDrivers(nested);
      if (drivers !== null) {
        return drivers;
      }
    }
  }
  return null;
}

@Component({
  selector: 'app-drivers',
  imports: [FormsModule],
  templateUrl: './drivers.component.html',
  styleUrl: './drivers.component.scss',
})
export class DriversComponent implements OnInit, OnDestroy {
  private readonly driversApi = inject(DriverService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetector = inject(ChangeDetectorRef);

  drivers: DriverDetails[] = [];
  loading = true;
  error = '';
  saveError = '';
  successMessage = '';
  modalOpen = false;
  saving = false;
  editingDriver: DriverDetails | null = null;
  driverForm: DriverForm = this.emptyForm();
  page = 1;
  pageSize = 10;
  private successMessageTimer: ReturnType<typeof setTimeout> | undefined;

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.drivers.length / this.pageSize));
  }

  get pagedDrivers(): DriverDetails[] {
    const start = (this.page - 1) * this.pageSize;
    return this.drivers.slice(start, start + this.pageSize);
  }

  get firstVisibleRecord(): number {
    return this.drivers.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get lastVisibleRecord(): number {
    return Math.min(this.page * this.pageSize, this.drivers.length);
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }
    this.loadDrivers();
  }

  ngOnDestroy(): void {
    this.clearSuccessMessageTimer();
  }

  openCreateDialog(): void {
    this.clearSuccessMessageTimer();
    this.editingDriver = null;
    this.driverForm = this.emptyForm();
    this.saveError = '';
    this.successMessage = '';
    this.modalOpen = true;
  }

  openEditDialog(driver: DriverDetails): void {
    this.clearSuccessMessageTimer();
    this.editingDriver = driver;
    this.driverForm = {
      driverName: driver.driverName,
      driverMobileNo: driver.driverMobileNo ?? '',
    };
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

  saveDriver(form: NgForm): void {
    if (!form.valid || this.saving) {
      return;
    }

    const driverName = this.driverForm.driverName.trim();
    const driverMobileNo = this.driverForm.driverMobileNo.trim();
    if (!driverName || !driverMobileNo) {
      this.saveError = 'Driver name and mobile number are required.';
      return;
    }

    const isUpdate = this.editingDriver !== null;
    const request: SaveDriverRequest = {
      DRID: this.editingDriver?.drid ?? null,
      DriverName: driverName,
      DriverMobileNo: driverMobileNo,
    };

    this.saving = true;
    this.saveError = '';
    this.successMessage = '';
    this.driversApi.saveDriverDetails(request).subscribe({
      next: (response) => {
        const result = isRecord(response) ? Number(property(response, 'result')) : Number.NaN;
        const message = isRecord(response) ? property(response, 'message') : undefined;
        if (result !== 1) {
          this.saveError =
            typeof message === 'string' && message
              ? message
              : 'The API could not save this driver.';
          this.saving = false;
          this.changeDetector.markForCheck();
          return;
        }

        this.modalOpen = false;
        this.saving = false;
        this.successMessage =
          (typeof message === 'string' && message) ||
          (isUpdate ? 'Driver updated successfully.' : 'Driver created successfully.');
        this.clearSuccessMessageTimer();
        this.successMessageTimer = setTimeout(() => {
          this.successMessage = '';
          this.successMessageTimer = undefined;
          this.changeDetector.markForCheck();
        }, 10_000);
        this.changeDetector.markForCheck();
        this.loadDrivers(!isUpdate);
      },
      error: (error: unknown) => {
        this.saveError = this.requestError(error, 'save this driver');
        this.saving = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private loadDrivers(showLastPage = false): void {
    this.loading = true;
    this.error = '';
    this.driversApi.getDetails().subscribe({
      next: (response) => {
        const drivers = extractDrivers(response);
        if (drivers === null) {
          this.drivers = [];
          this.error = 'The API returned driver data in an unexpected format.';
        } else {
          this.drivers = drivers;
          this.page = showLastPage ? this.pageCount : Math.min(this.page, this.pageCount);
        }
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.drivers = [];
          this.page = 1;
        } else {
          this.error = this.requestError(error, 'load driver records');
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

  private emptyForm(): DriverForm {
    return { driverName: '', driverMobileNo: '' };
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
