import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DriverDetails } from '../../core/master-data.models';
import { MASTER_DATA_API_URL } from '../../core/master-data-api';
import { SaveDriverRequest, SaveDriverResult } from './driver';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private readonly http = inject(HttpClient);

  getDetails(): Observable<DriverDetails[]> {
    return this.http.get<DriverDetails[]>(`${MASTER_DATA_API_URL}/GetDriverDetails`);
  }

  saveDriverDetails(driver: SaveDriverRequest): Observable<SaveDriverResult> {
    return this.http.post<SaveDriverResult>(`${MASTER_DATA_API_URL}/SaveDriver`, driver);
  }
}
