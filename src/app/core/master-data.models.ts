export type MasterRecord = Record<string, unknown>;

export interface CustomerDetails extends MasterRecord {
  cid: number;
  customerName: string;
  oder?: string;
  customerAddress: string;
}

export interface SiteDetails extends MasterRecord {
  sid: number;
  cid: number;
  siteName: string;
  siteAddress: string;
}

export interface RecipeDetails extends MasterRecord {
  rid: number;
  cid: number;
  sid?: number;
  recipeName: string;
  recipeCode: string;
  tenMM: number;
  cSandOne: number;
  cSandTwo: number;
  twentyMM: number;
  cement: number;
  gbbs: number;
  flash: number;
  water: number;
  addiOne: number;
}

export interface TruckDetails extends MasterRecord {
  trid: number;
  truckNumber: string;
}

export interface DriverDetails extends MasterRecord {
  drid: number;
  driverName: string;
  driverMobileNo?: string;
}
