import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SiteDetails } from '../../core/master-data.models';
import { MASTER_DATA_API_URL } from '../../core/master-data-api';
import { SaveSiteRequest, SaveSiteResult } from './site';

@Injectable({ providedIn: 'root' })
export class SiteService {
  private readonly http = inject(HttpClient);

  getDetails(): Observable<SiteDetails[]> {
    return this.http.get<SiteDetails[]>(`${MASTER_DATA_API_URL}/GetSiteDetails`);
  }

  saveSite(site: SaveSiteRequest): Observable<SaveSiteResult> {
    return this.http.post<SaveSiteResult>(`${MASTER_DATA_API_URL}/SaveSite`, site);
  }
}
