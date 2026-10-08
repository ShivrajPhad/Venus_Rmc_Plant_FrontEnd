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
import { CustomerDetails, RecipeDetails } from '../../core/master-data.models';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../shared/searchable-select/searchable-select.component';
import { CustomerService } from '../customers/customer.service';
import { SaveRecipeRequest } from './recipe';
import { RecipeService } from './recipe.service';

interface RecipeForm {
  cid: number | null;
  recipeName: string;
  recipeCode: string;
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

const MATERIAL_FIELDS = [
  ['tenMM', 'TENMM'],
  ['cSandOne', 'CSANDONE'],
  ['cSandTwo', 'CSANDTWO'],
  ['twentyMM', 'TWENTYMM'],
  ['cement', 'CEMENT'],
  ['gbbs', 'GBBS'],
  ['flash', 'FLASH'],
  ['water', 'WATER'],
  ['addiOne', 'ADDONE'],
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function property(value: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    const key = Object.keys(value).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
    if (key) {
      return value[key];
    }
  }
  return undefined;
}

function extractRows<T>(value: unknown, mapper: (row: unknown) => T | null): T[] | null {
  if (Array.isArray(value)) {
    const rows: T[] = [];
    for (const item of value) {
      const row = mapper(item);
      if (row === null) {
        return null;
      }
      rows.push(row);
    }
    return rows;
  }
  if (!isRecord(value)) {
    return null;
  }
  for (const key of ['data', 'result', 'items', 'records', 'value']) {
    const nested = property(value, key);
    if (Array.isArray(nested)) {
      return extractRows(nested, mapper);
    }
    if (isRecord(nested)) {
      const rows = extractRows(nested, mapper);
      if (rows !== null) {
        return rows;
      }
    }
  }
  return null;
}

function normalizeCustomer(value: unknown): CustomerDetails | null {
  if (!isRecord(value)) {
    return null;
  }
  const cid = Number(property(value, 'cid', 'customerId'));
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

function normalizeRecipe(value: unknown): RecipeDetails | null {
  if (!isRecord(value)) {
    return null;
  }
  const rid = Number(property(value, 'rid', 'recipeId'));
  const cid = Number(property(value, 'cid', 'customerId'));
  const recipeName = property(value, 'recipeName');
  const recipeCode = property(value, 'recipeCode');
  if (
    !Number.isFinite(rid) ||
    !Number.isFinite(cid) ||
    typeof recipeName !== 'string' ||
    typeof recipeCode !== 'string'
  ) {
    return null;
  }
  const recipe: RecipeDetails = {
    ...value,
    rid,
    cid,
    recipeName,
    recipeCode,
    tenMM: 0,
    cSandOne: 0,
    cSandTwo: 0,
    twentyMM: 0,
    cement: 0,
    gbbs: 0,
    flash: 0,
    water: 0,
    addiOne: 0,
  };
  for (const [propertyName, apiName] of MATERIAL_FIELDS) {
    const raw = property(value, apiName, propertyName);
    const amount = raw === undefined || raw === null || raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(amount)) {
      return null;
    }
    recipe[propertyName] = amount;
  }
  const sid = property(value, 'sid', 'siteId');
  if (sid !== undefined && sid !== null) {
    recipe.sid = Number(sid);
  }
  return recipe;
}

@Component({
  selector: 'app-recipes',
  imports: [FormsModule, SearchableSelectComponent],
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss',
})
export class RecipesComponent implements OnInit, OnDestroy {
  private readonly recipesApi = inject(RecipeService);
  private readonly customersApi = inject(CustomerService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetector = inject(ChangeDetectorRef);

  recipes: RecipeDetails[] = [];
  customers: CustomerDetails[] = [];
  loading = true;
  customersLoading = true;
  error = '';
  customerError = '';
  saveError = '';
  successMessage = '';
  modalOpen = false;
  saving = false;
  editingRecipe: RecipeDetails | null = null;
  recipeForm: RecipeForm = this.emptyForm();
  page = 1;
  pageSize = 10;
  private successMessageTimer: ReturnType<typeof setTimeout> | undefined;

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.recipes.length / this.pageSize));
  }

  get pagedRecipes(): RecipeDetails[] {
    const start = (this.page - 1) * this.pageSize;
    return this.recipes.slice(start, start + this.pageSize);
  }

  get firstVisibleRecord(): number {
    return this.recipes.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get lastVisibleRecord(): number {
    return Math.min(this.page * this.pageSize, this.recipes.length);
  }

  get customerOptions(): SearchableSelectOption[] {
    return this.customers.map((customer) => ({
      value: customer.cid,
      label: customer.customerName,
    }));
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      this.customersLoading = false;
      return;
    }
    this.loadRecipes();
    this.loadCustomers();
  }

  ngOnDestroy(): void {
    this.clearSuccessMessageTimer();
  }

  customerName(cid: number): string {
    return this.customers.find((customer) => customer.cid === cid)?.customerName ?? 'Unknown customer';
  }

  openCreateDialog(): void {
    this.clearSuccessMessageTimer();
    this.editingRecipe = null;
    this.recipeForm = this.emptyForm();
    this.saveError = '';
    this.successMessage = '';
    this.modalOpen = true;
  }

  openEditDialog(recipe: RecipeDetails): void {
    this.clearSuccessMessageTimer();
    this.editingRecipe = recipe;
    this.recipeForm = {
      cid: recipe.cid,
      recipeName: recipe.recipeName,
      recipeCode: recipe.recipeCode,
      tenMM: recipe.tenMM,
      cSandOne: recipe.cSandOne,
      cSandTwo: recipe.cSandTwo,
      twentyMM: recipe.twentyMM,
      cement: recipe.cement,
      gbbs: recipe.gbbs,
      flash: recipe.flash,
      water: recipe.water,
      addiOne: recipe.addiOne,
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

  saveRecipe(form: NgForm): void {
    if (!form.valid || this.saving || this.recipeForm.cid === null) {
      return;
    }

    const recipeName = this.recipeForm.recipeName.trim();
    const recipeCode = this.recipeForm.recipeCode.trim();
    if (!recipeName || !recipeCode) {
      this.saveError = 'Recipe name and code are required.';
      return;
    }

    const request: SaveRecipeRequest = {
      RID: this.editingRecipe?.rid ?? null,
      CID: this.recipeForm.cid,
      RecipeName: recipeName,
      RecipeCode: recipeCode,
      TENMM: this.recipeForm.tenMM,
      CSANDONE: this.recipeForm.cSandOne,
      CSANDTWO: this.recipeForm.cSandTwo,
      TWENTYMM: this.recipeForm.twentyMM,
      CEMENT: this.recipeForm.cement,
      GBBS: this.recipeForm.gbbs,
      FLASH: this.recipeForm.flash,
      WATER: this.recipeForm.water,
      ADDONE: this.recipeForm.addiOne,
    };

    const isUpdate = this.editingRecipe !== null;
    this.saving = true;
    this.saveError = '';
    this.successMessage = '';
    this.recipesApi.saveRecipe(request).subscribe({
      next: (response) => {
        const result = isRecord(response) ? Number(property(response, 'result')) : Number.NaN;
        const message = isRecord(response) ? property(response, 'message') : undefined;
        if (result !== 1) {
          this.saveError =
            typeof message === 'string' && message
              ? message
              : 'The API could not save this recipe.';
          this.saving = false;
          this.changeDetector.markForCheck();
          return;
        }

        this.modalOpen = false;
        this.saving = false;
        this.successMessage =
          (typeof message === 'string' && message) ||
          (isUpdate ? 'Recipe updated successfully.' : 'Recipe created successfully.');
        this.clearSuccessMessageTimer();
        this.successMessageTimer = setTimeout(() => {
          this.successMessage = '';
          this.successMessageTimer = undefined;
          this.changeDetector.markForCheck();
        }, 10_000);
        this.changeDetector.markForCheck();
        this.loadRecipes(!isUpdate);
      },
      error: (error: unknown) => {
        this.saveError = this.requestError(error, 'save this recipe');
        this.saving = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private loadRecipes(showLastPage = false): void {
    this.loading = true;
    this.error = '';
    this.recipesApi.getDetails().subscribe({
      next: (response) => {
        const recipes = extractRows(response, normalizeRecipe);
        if (recipes === null) {
          this.recipes = [];
          this.error = 'The API returned recipe data in an unexpected format.';
        } else {
          this.recipes = recipes;
          this.page = showLastPage ? this.pageCount : Math.min(this.page, this.pageCount);
        }
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.recipes = [];
          this.page = 1;
        } else {
          this.error = this.requestError(error, 'load recipe records');
        }
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private loadCustomers(): void {
    this.customerError = '';
    this.customersApi.getDetails().subscribe({
      next: (response) => {
        const customers = extractRows(response, normalizeCustomer);
        if (customers === null) {
          this.customers = [];
          this.customerError = 'The API returned customer data in an unexpected format.';
        } else {
          this.customers = customers;
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

  private clearSuccessMessageTimer(): void {
    if (this.successMessageTimer !== undefined) {
      clearTimeout(this.successMessageTimer);
      this.successMessageTimer = undefined;
    }
  }

  private emptyForm(): RecipeForm {
    return {
      cid: null,
      recipeName: '',
      recipeCode: '',
      tenMM: 0,
      cSandOne: 0,
      cSandTwo: 0,
      twentyMM: 0,
      cement: 0,
      gbbs: 0,
      flash: 0,
      water: 0,
      addiOne: 0,
    };
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
