export interface SaveSiteRequest {
  SID: number | null;
  CID: number;
  SiteName: string;
  SiteAddress: string;
  UserID: number | null;
}

export interface SaveSiteResult {
  result: number;
  message: string | null;
  sid: number | null;
}
