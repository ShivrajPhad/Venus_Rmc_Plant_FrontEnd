export interface BatchDetailSaveRequest {
  srNo: number | null;
  sec: number | null;
  volumeM3: number | null;
  tenMM: number | null;
  csandOne: number | null;
  csandTwo: number | null;
  twentyMM: number | null;
  cement: number | null;
  gbbs: number | null;
  flash: number | null;
  water: number | null;
  addiOne: number | null;
  totalKg: number | null;
}

export interface DocketDetailsSaveRequest {
  dockID: number | null;
  docketNo: string | null;
  docketDate: Date | string | null;
  cid: number | null;
  sid: number | null;
  rid: number | null;
  trid: number | null;
  drid: number | null;
  startTime: string | null;
  endTime: string | null;
  batchCount: number | null;
  batchSize: number | null;
  orderQuantity: number | null;
  deliveredQuantity: number | null;
  thVolume: number | null;
  reportDate: Date | string | null;
  caTotal: number | null;
  productionQuantity: number | null;
  totalCycle: number | null;
  cycleStatus: string | null;
  wcRatio: number | null;
  batchDetails: BatchDetailSaveRequest[] | null;
}

export interface DocketReportDetails extends DocketDetailsSaveRequest {
  customerName: string | null;
  siteName: string | null;
  recipeName: string | null;
  truckNumber: string | null;
  driverName: string | null;
}

export interface SaveDocketDetailsResponse {
  docketNo: string;
}
