import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DOCKET_DATA_API_URL } from '../../core/master-data-api';
import {
  DocketDetailsSaveRequest,
  DocketReportDetails,
  SaveDocketDetailsResponse,
} from './batch-report';

@Injectable({ providedIn: 'root' })
export class BatchReportService {
  private readonly http = inject(HttpClient);

  getDocketDetails(docketNo?: string): Observable<DocketReportDetails[]> {
    let params = new HttpParams();
    if (docketNo && docketNo.trim()) {
      params = params.set('docketNo', docketNo.trim());
    }
    return this.http.get<DocketReportDetails[]>(`${DOCKET_DATA_API_URL}/GetDocketDetails`, {
      params,
    });
  }

  saveDocketDetails(
    docket: DocketDetailsSaveRequest,
  ): Observable<SaveDocketDetailsResponse> {
    return this.http.post<SaveDocketDetailsResponse>(
      `${DOCKET_DATA_API_URL}/SaveDocketDetails`,
      docket,
    );
  }
}
