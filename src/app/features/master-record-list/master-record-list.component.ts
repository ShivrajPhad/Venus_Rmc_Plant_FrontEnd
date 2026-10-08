import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { MasterRecord } from '../../core/master-data.models';

function isRecord(value: unknown): value is MasterRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractRows(value: unknown): MasterRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (!isRecord(value)) {
    return [];
  }

  for (const key of ['data', 'result', 'items', 'records', 'value']) {
    const nested = value[key];
    if (Array.isArray(nested)) {
      return nested.filter(isRecord);
    }
    if (isRecord(nested)) {
      const rows = extractRows(nested);
      if (rows.length) {
        return rows;
      }
    }
  }
  return [];
}

function requestError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) {
      return 'Your session may have expired. Sign in again to load these records.';
    }
    return error.status
      ? `Could not load this data (${error.status}).`
      : 'Could not reach the API. Check the service connection.';
  }
  return 'Could not load this data.';
}

@Component({
  selector: 'app-master-record-list',
  templateUrl: './master-record-list.component.html',
  styleUrl: './master-record-list.component.scss',
})
export class MasterRecordListComponent implements OnInit {
  @Input({ required: true }) title = '';
  @Input({ required: true }) records!: Observable<unknown>;

  rows: MasterRecord[] = [];
  loading = true;
  error: string | null = null;

  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    this.records.subscribe({
      next: (response) => {
        this.rows = extractRows(response);
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.rows = [];
          this.loading = false;
          this.changeDetector.markForCheck();
          return;
        }
        this.error = requestError(error);
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  columns(): string[] {
    const identifierColumns = new Set(['id', 'cid', 'sid', 'rid', 'trid', 'drid']);
    return [...new Set(this.rows.flatMap((row) => Object.keys(row)))].filter(
      (column) => !identifierColumns.has(column.toLowerCase()),
    );
  }

  formatCell(value: unknown): string {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  columnLabel(column: string): string {
    const labels: Record<string, string> = {
      tenMM: '10 MM',
      twentyMM: '20 MM',
      cSandOne: 'C Sand One',
      cSandTwo: 'C Sand Two',
      gbbs: 'GBBS',
      addiOne: 'Additive One',
    };

    return (
      labels[column] ??
      column.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase())
    );
  }
}
