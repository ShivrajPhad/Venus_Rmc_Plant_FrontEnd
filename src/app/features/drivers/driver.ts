export interface SaveDriverRequest {
  DRID: number | null;
  DriverName: string;
  DriverMobileNo: string;
}

export interface SaveDriverResult {
  Result: number;
  Message: string | null;
  DRID: number | null;
}
