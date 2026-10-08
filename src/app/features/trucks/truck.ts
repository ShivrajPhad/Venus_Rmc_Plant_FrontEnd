export interface SaveTruckRequest {
  TRID: number | null;
  TruckNumber: string;
}

export interface SaveTruckResult {
  Result: number;
  Message: string | null;
  TRID: number | null;
}
