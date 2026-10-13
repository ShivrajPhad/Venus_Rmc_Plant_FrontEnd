import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import {
  CustomerDetails,
  DriverDetails,
  RecipeDetails,
  SiteDetails,
  TruckDetails,
} from '../../core/master-data.models';
import {
  BATCH_MATERIAL_COLUMNS,
  BatchDetailsComponent,
  BatchDetailsReport,
} from './batch-details.component';
import { BatchReportService } from './batch-report.service';
import { DocketDetailsSaveRequest } from './batch-report';
import { CustomerService } from '../customers/customer.service';
import { DriverService } from '../drivers/driver.service';
import { RecipeService } from '../recipes/recipe.service';
import { SiteService } from '../sites/site.service';
import { TruckService } from '../trucks/truck.service';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../shared/searchable-select/searchable-select.component';

function requestError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) {
      return 'Your session may have expired. Sign in again to load report options.';
    }
    return error.status
      ? `Could not load report options (${error.status}).`
      : 'Could not reach the API. Check the service connection.';
  }
  return 'Could not load report options.';
}

function errorMessage(error: unknown, action: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) {
      return `Your session may have expired. Sign in again to ${action}.`;
    }
    const serverMessage =
      error.error?.detail || error.error?.message || error.error?.title;
    if (serverMessage && typeof serverMessage === 'string') {
      return `Could not ${action}: ${serverMessage}`;
    }
    return error.status
      ? `Could not ${action} (${error.status}).`
      : `Could not reach the API to ${action}. Check the service connection.`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return `Could not ${action}.`;
}

@Component({
  selector: 'app-batch-report',
  imports: [FormsModule, BatchDetailsComponent, SearchableSelectComponent],
  templateUrl: './batch-report.component.html',
  styleUrl: './batch-report.component.scss',
})
export class BatchReportComponent implements OnInit {
  @ViewChild(BatchDetailsComponent) batchDetailsComponent?: BatchDetailsComponent;

  private readonly customersApi = inject(CustomerService);
  private readonly sitesApi = inject(SiteService);
  private readonly recipesApi = inject(RecipeService);
  private readonly driversApi = inject(DriverService);
  private readonly trucksApi = inject(TruckService);
  private readonly batchReportApi = inject(BatchReportService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  customers: CustomerDetails[] = [];
  sites: SiteDetails[] = [];
  recipes: RecipeDetails[] = [];
  drivers: DriverDetails[] = [];
  trucks: TruckDetails[] = [];
  docketNo = '800';
  customerId: number | null = null;
  siteId: number | null = null;
  recipeId: number | null = null;
  driverId: number | null = null;
  truckId: number | null = null;
  startTime = '';
  loadQuantity: number | null = null;
  batchSize: number | null = null;
  loading = true;
  saving = false;
  dataError = '';
  formError = '';
  saveMessage = '';
  saveError = '';
  report: BatchDetailsReport | null = null;
  reportColumns = BATCH_MATERIAL_COLUMNS.map((column) => ({ ...column, selected: true }));

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    forkJoin({
      customers: this.customersApi.getDetails(),
      sites: this.sitesApi.getDetails(),
      recipes: this.recipesApi.getDetails(),
      drivers: this.driversApi.getDetails(),
      trucks: this.trucksApi.getDetails(),
    }).subscribe({
      next: ({ customers, sites, recipes, drivers, trucks }) => {
        const options: [string, unknown][] = [
          ['customers', customers],
          ['sites', sites],
          ['recipes', recipes],
          ['drivers', drivers],
          ['trucks', trucks],
        ];
        const unavailable = options
          .filter(([, rows]) => !Array.isArray(rows) || rows.length === 0)
          .map(([name]) => name);

        if (unavailable.length) {
          this.dataError = `Dropdowns are disabled because these options are unavailable: ${unavailable.join(', ')}.`;
          this.loading = false;
          return;
        }

        this.customers = customers;
        this.sites = sites;
        this.recipes = recipes;
        this.drivers = drivers;
        this.trucks = trucks;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.dataError = requestError(error);
        this.loading = false;
      },
    });
  }

  get dropdownsDisabled(): boolean {
    return this.loading || Boolean(this.dataError);
  }

  get customerOptions(): SearchableSelectOption[] {
    return this.customers.map((customer) => ({
      value: customer.cid,
      label: customer.customerName,
    }));
  }

  get siteOptions(): SearchableSelectOption[] {
    return this.sites
      .filter((site) => site.cid === this.customerId)
      .map((site) => ({ value: site.sid, label: site.siteName }));
  }

  get recipeOptions(): SearchableSelectOption[] {
    return this.recipes
      .filter((recipe) => recipe.cid === this.customerId)
      .map((recipe) => ({
        value: recipe.rid,
        label: `${recipe.recipeName}${recipe.recipeCode ? ` (${recipe.recipeCode})` : ''}`,
      }));
  }

  get driverOptions(): SearchableSelectOption[] {
    return this.drivers.map((driver) => ({ value: driver.drid, label: driver.driverName }));
  }

  get truckOptions(): SearchableSelectOption[] {
    return this.trucks.map((truck) => ({ value: truck.trid, label: truck.truckNumber }));
  }

  onCustomerChange(): void {
    this.siteId = null;
    this.recipeId = null;
    this.invalidateReport();
  }

  onSiteChange(): void {
    this.invalidateReport();
  }

  invalidateReport(): void {
    this.report = null;
    this.formError = '';
    this.saveMessage = '';
    this.saveError = '';
  }

  generate(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const customer = this.customers.find((item) => item.cid === this.customerId);
    const site = this.sites.find(
      (item) => item.sid === this.siteId && item.cid === this.customerId,
    );
    const recipe = this.recipes.find(
      (item) => item.rid === this.recipeId && item.cid === this.customerId,
    );
    const driver = this.drivers.find((item) => item.drid === this.driverId);
    const truck = this.trucks.find((item) => item.trid === this.truckId);

    const recipeValues = recipe
      ? [
          recipe.tenMM,
          recipe.cSandOne,
          recipe.cSandTwo,
          recipe.twentyMM,
          recipe.cement,
          recipe.gbbs,
          recipe.flash,
          recipe.water,
          recipe.addiOne,
        ]
      : [];

    if (
      !customer ||
      !site ||
      !recipe ||
      !driver ||
      !truck ||
      this.loadQuantity === null ||
      !Number.isFinite(this.loadQuantity) ||
      this.loadQuantity <= 0 ||
      this.batchSize === null ||
      !Number.isFinite(this.batchSize) ||
      this.batchSize <= 0 ||
      recipeValues.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)
    ) {
      this.formError =
        'Select valid report options, including a recipe with valid material values, and enter positive load quantity and batch size values.';
      return;
    }

    const visibleColumns = this.reportColumns
      .filter((column) => column.selected)
      .map((column) => column.id);
    if (!visibleColumns.length) {
      this.formError = 'Select at least one report column to display.';
      return;
    }

    this.formError = '';
    this.saveMessage = '';
    this.saveError = '';
    this.report = {
      docketNumber: this.docketNo.trim() || '800',
      customer,
      site,
      recipe,
      driver,
      truck,
      startTime: this.startTime,
      loadQuantity: this.loadQuantity,
      batchSize: this.batchSize,
      generatedAt: new Date(),
      visibleColumns,
    };
  }

  clear(form: NgForm): void {
    form.resetForm({
      customerId: null,
      siteId: null,
      recipeId: null,
      driverId: null,
      truckId: null,
      startTime: '',
      loadQuantity: null,
      batchSize: null,
    });
    this.docketNo = '800';
    this.customerId = null;
    this.siteId = null;
    this.recipeId = null;
    this.driverId = null;
    this.truckId = null;
    this.startTime = '';
    this.loadQuantity = null;
    this.batchSize = null;
    this.report = null;
    this.formError = '';
    this.saveMessage = '';
    this.saveError = '';
  }

  private buildDocketSaveRequest(report: BatchDetailsReport): DocketDetailsSaveRequest {
    if (this.batchDetailsComponent) {
      return this.batchDetailsComponent.toSaveRequest();
    }

    const count = Math.ceil(report.loadQuantity / report.batchSize);
    const reportDate =
      report.generatedAt instanceof Date
        ? report.generatedAt.toISOString()
        : new Date(report.generatedAt).toISOString();

    return {
      dockID: 0,
      docketNo: report.docketNumber || this.docketNo.trim() || '800',
      docketDate: reportDate,
      cid: report.customer?.cid ?? null,
      sid: report.site?.sid ?? null,
      rid: report.recipe?.rid ?? null,
      trid: report.truck?.trid ?? null,
      drid: report.driver?.drid ?? null,
      startTime: report.startTime || null,
      endTime: reportDate,
      batchCount: count,
      batchSize: report.batchSize,
      orderQuantity: report.loadQuantity,
      deliveredQuantity: report.loadQuantity,
      thVolume: null,
      reportDate: reportDate,
      caTotal: null,
      productionQuantity: report.loadQuantity,
      totalCycle: count,
      cycleStatus: 'Cycle Complete',
      wcRatio: null,
      batchDetails: [],
    };
  }

  async saveDocketDetails(): Promise<void> {
    if (!this.report || this.saving || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.saving = true;
    this.saveError = '';
    this.saveMessage = '';

    const payload = this.buildDocketSaveRequest(this.report);

    try {
      const result = await firstValueFrom(this.batchReportApi.saveDocketDetails(payload));
      const savedDocketNo = result?.docketNo || payload.docketNo;
      if (savedDocketNo) {
        this.docketNo = savedDocketNo;
        if (this.report) {
          this.report.docketNumber = savedDocketNo;
        }
      }
      this.saveMessage = `Docket ${savedDocketNo ?? ''} details saved successfully.`;
    } catch (error) {
      this.saveError = errorMessage(error, 'save docket details');
    } finally {
      this.saving = false;
    }
  }

  SaveDocketDetails(): Promise<void> {
    return this.saveDocketDetails();
  }

  saveReport(): void {
    if (!this.report || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const fields = [
      ['Customer', this.report.customer.customerName],
      ['Site', this.report.site.siteName],
      ['Recipe', this.report.recipe.recipeName],
      ['Recipe code', this.report.recipe.recipeCode],
      ['Start time', new Date(this.report.startTime).toLocaleString()],
      ['Driver', this.report.driver.driverName],
      ['Truck', this.report.truck.truckNumber],
      ['Load quantity', this.report.loadQuantity],
      ['Batch size', this.report.batchSize],
      ['Report generated', this.report.generatedAt.toLocaleString()],
    ];
    const csv = fields.map(([label, value]) => `${this.csvField(label)},${this.csvField(value)}`);
    const blob = new Blob([`\uFEFF${csv.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `batch-report-${this.report.generatedAt.toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.saveMessage = 'Report saved as a CSV file.';
  }

  printReport(): void {
    if (!this.report || !isPlatformBrowser(this.platformId) || !this.document.defaultView) {
      return;
    }

    const body = this.document.body;
    body.classList.add('printing-batch-details');
    try {
      this.document.defaultView.print();
    } finally {
      body.classList.remove('printing-batch-details');
    }
  }

  formatStartTime(value: string): string {
    return new Date(value).toLocaleString();
  }

  formatReportDate(value: Date): string {
    return value.toLocaleDateString();
  }

  private csvField(value: string | number): string {
    return `"${String(value).replace(/"/g, '""')}"`;
  }
}
