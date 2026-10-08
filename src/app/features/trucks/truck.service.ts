import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TruckDetails } from '../../core/master-data.models';
import { MASTER_DATA_API_URL } from '../../core/master-data-api';
import { SaveTruckRequest, SaveTruckResult } from './truck';

@Injectable({ providedIn: 'root' })
export class TruckService {
  private readonly http = inject(HttpClient);

  getDetails(): Observable<TruckDetails[]> {
    return this.http.get<TruckDetails[]>(`${MASTER_DATA_API_URL}/GetTruckDetails`);
  }

  saveTruckDetails(truck: SaveTruckRequest): Observable<SaveTruckResult> {
    return this.http.post<SaveTruckResult>(`${MASTER_DATA_API_URL}/SaveTruck`, truck);
  }
}
