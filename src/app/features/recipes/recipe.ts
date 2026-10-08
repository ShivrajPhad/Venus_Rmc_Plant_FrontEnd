export interface SaveRecipeRequest {
  RID: number | null;
  CID: number;
  RecipeName: string;
  RecipeCode: string;
  TENMM: number;
  CSANDONE: number;
  CSANDTWO: number;
  TWENTYMM: number;
  CEMENT: number;
  GBBS: number;
  FLASH: number;
  WATER: number;
  ADDONE: number;
}

export interface SaveRecipeResult {
  Result: number;
  Message: string | null;
  RID: number | null;
}
