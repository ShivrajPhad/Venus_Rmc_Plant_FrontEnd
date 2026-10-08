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
import { AuthService } from '../../core/auth.service';
import { CustomerDetails } from '../../core/master-data.models';
import { CustomerService } from './customer.service';
import { SaveCustomerRequest } from './customer';

interface CustomerForm {
  customerName: string;
  customerAddress: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function property(value: Record<string, unknown>, name: string): unknown {
  const key = Object.keys(value).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? value[key] : undefined;
}

function normalizeCustomer(value: unknown): CustomerDetails | null {
  if (!isRecord(value)) {
    return null;
  }

  const cid = Number(property(value, 'cid') ?? property(value, 'customerId'));
  const customerName = property(value, 'customerName');
  const customerAddress = property(value, 'customerAddress');
  if (
    !Number.isFinite(cid) ||
    typeof customerName !== 'string' ||
    typeof customerAddress !== 'string'
  ) {
    return null;
  }

  return { ...value, cid, customerName, customerAddress };
}

function extractCustomerRows(value: unknown): CustomerDetails[] | null {
  if (Array.isArray(value)) {
    const customers: CustomerDetails[] = [];
    for (const item of value) {
      const customer = normalizeCustomer(item);
      if (!customer) {
        return null;
      }
      customers.push(customer);
    }
    return customers;
  }
  if (!isRecord(value)) {
    return null;
  }

  for (const key of ['data', 'result', 'items', 'records', 'value']) {
    const nested = property(value, key);
    if (Array.isArray(nested)) {
      return extractCustomerRows(nested);
    }
    if (isRecord(nested)) {
      const rows = extractCustomerRows(nested);
      if (rows !== null) {
        return rows;
      }
    }
  }
  return null;
}

@Component({
  selector: 'app-customers',
  imports: [FormsModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',
})
export class CustomersComponent implements OnInit, OnDestroy {
  private readonly customers = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetector = inject(ChangeDetectorRef);

  rows: CustomerDetails[] = [];
  loading = true;
  error = '';
  saveError = '';
  successMessage = '';
  modalOpen = false;
  saving = false;
  editingCustomer: CustomerDetails | null = null;
  customerForm: CustomerForm = this.emptyForm();
  searchTerm = '';
  page = 1;
  pageSize = 10;
  private successMessageTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    this.loadCustomers();
  }

  ngOnDestroy(): void {
    this.clearSuccessMessageTimer();
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  get filteredRows(): CustomerDetails[] {
    const search = this.searchTerm.trim().toLocaleLowerCase();
    return search
      ? this.rows.filter((customer) => customer.customerName.toLocaleLowerCase().includes(search))
      : this.rows;
  }

  get pagedRows(): CustomerDetails[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get firstVisibleRecord(): number {
    return this.filteredRows.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get lastVisibleRecord(): number {
    return Math.min(this.page * this.pageSize, this.filteredRows.length);
  }

  loadCustomers(focusCustomerId?: number, showLastPageIfMissing = false): void {
    this.loading = true;
    this.error = '';
    this.customers.getDetails().subscribe({
      next: (response) => {
        const rows = extractCustomerRows(response);
        if (!rows) {
          this.rows = [];
          this.error = 'The API returned customer data in an unexpected format.';
          this.loading = false;
          this.changeDetector.markForCheck();
          return;
        }

        this.rows = rows;
        const customerIndex = focusCustomerId
          ? this.filteredRows.findIndex((customer) => customer.cid === focusCustomerId)
          : -1;
        if (customerIndex >= 0) {
          this.page = Math.floor(customerIndex / this.pageSize) + 1;
        } else if (showLastPageIfMissing) {
          this.page = this.pageCount;
        } else {
          this.page = Math.min(this.page, this.pageCount);
        }
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.rows = [];
          this.page = 1;
          this.loading = false;
          this.changeDetector.markForCheck();
          return;
        }
        this.error = this.requestError(error, 'load customer records');
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  openCreateDialog(): void {
    this.clearSuccessMessageTimer();
    this.editingCustomer = null;
    this.customerForm = this.emptyForm();
    this.saveError = '';
    this.successMessage = '';
    this.modalOpen = true;
  }

  openEditDialog(customer: CustomerDetails): void {
    this.clearSuccessMessageTimer();
    this.editingCustomer = customer;
    this.customerForm = {
      customerName: customer.customerName,
      customerAddress: customer.customerAddress,
    };
    this.saveError = '';
    this.successMessage = '';
    this.modalOpen = true;
  }

  closeDialog(): void {
    if (this.saving) {
      return;
    }
    this.modalOpen = false;
  }

  changePageSize(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    this.pageSize = Number(target.value);
    this.page = 1;
  }

  onSearchChange(): void {
    this.page = 1;
  }

  saveCustomer(form: NgForm): void {
    if (!form.valid || this.saving) {
      return;
    }

    this.saveError = '';
    this.successMessage = '';
    const customerName = this.customerForm.customerName.trim();
    const customerAddress = this.customerForm.customerAddress.trim();
    if (!customerName || !customerAddress) {
      this.saveError = 'Customer name and address are required.';
      return;
    }

    const userId = this.auth.getUserId();
    if (userId === null) {
      this.saveError = 'Could not identify the signed-in user. Sign in again and retry.';
      return;
    }

    const isUpdate = this.editingCustomer !== null;
    const customer: SaveCustomerRequest = {
      CID: this.editingCustomer?.cid ?? null,
      CustomerName: customerName,
      CustomerAddress: customerAddress,
      CustomerStatus: 1,
      UserID: userId,
    };

    this.saving = true;
    this.customers.saveCustomer(customer).subscribe({
      next: (response) => {
        if (Number(response?.result) !== 1) {
          this.saveError = response?.message || 'The API could not save this customer.';
          this.saving = false;
          this.changeDetector.markForCheck();
          return;
        }

        this.saving = false;
        this.modalOpen = false;
        this.clearSuccessMessageTimer();
        this.successMessage =
          response.message ||
          (isUpdate ? 'Customer updated successfully.' : 'Customer created successfully.');
        this.successMessageTimer = setTimeout(() => {
          this.successMessage = '';
          this.successMessageTimer = undefined;
          this.changeDetector.markForCheck();
        }, 5_000);
        this.searchTerm = '';
        this.changeDetector.markForCheck();
        this.loadCustomers(
          response.cid ?? (isUpdate ? customer.CID ?? undefined : undefined),
          !isUpdate,
        );
      },
      error: (error: unknown) => {
        this.saveError = this.requestError(
          error,
          this.editingCustomer ? 'save the customer update' : 'save the new customer',
        );
        this.saving = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private emptyForm(): CustomerForm {
    return { customerName: '', customerAddress: '' };
  }

  private clearSuccessMessageTimer(): void {
    if (this.successMessageTimer !== undefined) {
      clearTimeout(this.successMessageTimer);
      this.successMessageTimer = undefined;
    }
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
