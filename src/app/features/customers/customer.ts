export interface SaveCustomerRequest {
  CID: number | null;
  CustomerName: string;
  CustomerAddress: string;
  CustomerStatus: number;
  UserID: number;
}

export interface SaveCustomerResponse {
  result: number;
  message: string;
  cid?: number;
}
