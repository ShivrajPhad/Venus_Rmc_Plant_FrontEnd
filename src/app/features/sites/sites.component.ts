import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { CustomerDetails, SiteDetails } from '../../core/master-data.models';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../shared/searchable-select/searchable-select.component';
import { CustomerService } from '../customers/customer.service';
import { SaveSiteRequest } from './site';
import { SiteService } from './site.service';

interface SiteForm {
  cid: number | null;
  siteName: string;
  siteAddress: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function property(value: Record<string, unknown>, name: string): unknown {
  const key = Object.keys(value).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? value[key] : undefined;
}

function extractRows<T>(value: unknown, rowMapper: (item: unknown) => T | null): T[] | null {
  if (Array.isArray(value)) {
    const rows = value.map(rowMapper);
    return rows.every((row) => row !== null) ? rows : null;
  }
  if (!isRecord(value)) {
    return null;
  }

  for (const key of ['data', 'result', 'items', 'records', 'value']) {
    const nested = property(value, key);
    if (Array.isArray(nested)) {
      return extractRows(nested, rowMapper);
    }
    if (isRecord(nested)) {
      const rows = extractRows(nested, rowMapper);
      if (rows !== null) {
        return rows;
      }
    }
  }
  return null;
}

function normalizeSite(value: unknown): SiteDetails | null {
  if (!isRecord(value)) {
    return null;
  }
  const sid = Number(property(value, 'sid'));
  const cid = Number(property(value, 'cid'));
  const siteName = property(value, 'siteName');
  const siteAddress = property(value, 'siteAddress');
  if (
    !Number.isFinite(sid) ||
    !Number.isFinite(cid) ||
    typeof siteName !== 'string' ||
    typeof siteAddress !== 'string'
  ) {
    return null;
  }
  return { ...value, sid, cid, siteName, siteAddress };
}

function normalizeCustomer(value: unknown): CustomerDetails | null {
  if (!isRecord(value)) {
    return null;
  }
  const cid = Number(property(value, 'cid') ?? property(value, 'customerId'));
  const customerName = property(value, 'customerName');
  const customerAddress = property(value, 'customerAddress');
  const rawOder = property(value, 'oder') ?? property(value, 'order');
  const oder = typeof rawOder === 'string' ? rawOder : (rawOder == null ? '' : String(rawOder));
  if (
    !Number.isFinite(cid) ||
    typeof customerName !== 'string' ||
    typeof customerAddress !== 'string'
  ) {
    return null;
  }
  return { ...value, cid, customerName, oder, customerAddress };
}

@Component({
  selector: 'app-sites',
  imports: [FormsModule, SearchableSelectComponent],
  templateUrl: './sites.component.html',
  styleUrl: './sites.component.scss',
})
export class SitesComponent implements OnInit {
  private readonly sitesApi = inject(SiteService);
  private readonly customersApi = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetector = inject(ChangeDetectorRef);

  sites: SiteDetails[] = [];
  customers: CustomerDetails[] = [];
  loading = true;
  customersLoading = true;
  error = '';
  customerError = '';
  saveError = '';
  successMessage = '';
  modalOpen = false;
  saving = false;
  editingSite: SiteDetails | null = null;
  siteForm: SiteForm = this.emptyForm();
  siteFilterCustomerId: number | null = null;
  page = 1;
  pageSize = 10;

  get filteredSites(): SiteDetails[] {
    return this.siteFilterCustomerId === null || this.siteFilterCustomerId === 0
      ? this.sites
      : this.sites.filter((site) => site.cid === this.siteFilterCustomerId);
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filteredSites.length / this.pageSize));
  }

  get pagedSites(): SiteDetails[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredSites.slice(start, start + this.pageSize);
  }

  get firstVisibleRecord(): number {
    return this.filteredSites.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get lastVisibleRecord(): number {
    return Math.min(this.page * this.pageSize, this.filteredSites.length);
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }
    this.loadRecords();
  }

  customerName(cid: number): string {
    return this.customers.find((customer) => customer.cid === cid)?.customerName ?? 'Unknown customer';
  }

  get customerOptions(): SearchableSelectOption[] {
    return this.customers.map((customer) => ({
      value: customer.cid,
      label: customer.customerName,
    }));
  }

  get customerFilterOptions(): SearchableSelectOption[] {
    return [{ value: 0, label: 'All customers' }, ...this.customerOptions];
  }

  onCustomerFilterChange(): void {
    this.page = 1;
  }

  openCreateDialog(): void {
    this.editingSite = null;
    this.siteForm = this.emptyForm();
    this.saveError = '';
    this.successMessage = '';
    this.modalOpen = true;
  }

  openEditDialog(site: SiteDetails): void {
    this.editingSite = site;
    this.siteForm = {
      cid: site.cid,
      siteName: site.siteName,
      siteAddress: site.siteAddress,
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

  saveSite(form: NgForm): void {
    if (!form.valid || this.saving || this.siteForm.cid === null) {
      return;
    }

    const siteName = this.siteForm.siteName.trim();
    const siteAddress = this.siteForm.siteAddress.trim();
    if (!siteName || !siteAddress) {
      this.saveError = 'Site name and address are required.';
      return;
    }

    const request: SaveSiteRequest = {
      SID: this.editingSite?.sid ?? null,
      CID: this.siteForm.cid,
      SiteName: siteName,
      SiteAddress: siteAddress,
      UserID: this.auth.getUserId(),
    };

    this.saveError = '';
    this.successMessage = '';
    this.saving = true;
    this.sitesApi.saveSite(request).subscribe({
      next: (response) => {
        const result = isRecord(response) ? Number(property(response, 'result')) : Number.NaN;
        const message = isRecord(response) ? property(response, 'message') : undefined;
        if (result !== 1) {
          this.saveError =
            typeof message === 'string' && message
              ? message
              : 'The API could not save this site.';
          this.saving = false;
          this.changeDetector.markForCheck();
          return;
        }

        this.modalOpen = false;
        this.saving = false;
        this.successMessage =
          (typeof message === 'string' && message) ||
          (this.editingSite ? 'Site updated successfully.' : 'Site created successfully.');
        this.changeDetector.markForCheck();
        this.loadRecords(!this.editingSite);
      },
      error: (error: unknown) => {
        this.saveError = this.requestError(error, 'save this site');
        this.saving = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private loadRecords(showLastPage = false): void {
    this.loading = true;
    this.error = '';
    this.customerError = '';
    this.customersLoading = true;
    this.sitesApi.getDetails().subscribe({
      next: (response) => {
        const rows = extractRows(response, normalizeSite);
        if (rows === null) {
          this.error = 'The API returned site data in an unexpected format.';
        } else {
          this.sites = rows;
          this.page = showLastPage ? this.pageCount : Math.min(this.page, this.pageCount);
        }
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.sites = [];
          this.loading = false;
        } else {
          this.error = this.requestError(error, 'load site records');
        }
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });

    this.customersApi.getDetails().subscribe({
      next: (response) => {
        const rows = extractRows(response, normalizeCustomer);
        if (rows === null) {
          this.customers = [];
          this.customerError = 'The API returned customer data in an unexpected format.';
        } else {
          this.customers = rows;
        }
        this.customersLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.customers = [];
        } else {
          this.customerError = this.requestError(error, 'load customers');
        }
        this.customersLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private emptyForm(): SiteForm {
    return { cid: null, siteName: '', siteAddress: '' };
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
