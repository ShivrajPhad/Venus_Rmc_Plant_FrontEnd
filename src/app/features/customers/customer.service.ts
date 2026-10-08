import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomerDetails } from '../../core/master-data.models';
import { MASTER_DATA_API_URL } from '../../core/master-data-api';
import { SaveCustomerRequest, SaveCustomerResponse } from './customer';


@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);

  getDetails(): Observable<CustomerDetails[]> {
    return this.http.get<CustomerDetails[]>(`${MASTER_DATA_API_URL}/GetCustomerDetails`);
  }

  saveCustomer(customer: SaveCustomerRequest): Observable<SaveCustomerResponse> {
    return this.http.post<SaveCustomerResponse>(`${MASTER_DATA_API_URL}/SaveCustomer`, customer);
  }
}
