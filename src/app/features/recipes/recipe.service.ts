import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RecipeDetails } from '../../core/master-data.models';
import { MASTER_DATA_API_URL } from '../../core/master-data-api';
import { SaveRecipeRequest, SaveRecipeResult } from './recipe';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly http = inject(HttpClient);

  getDetails(): Observable<RecipeDetails[]> {
    return this.http.get<RecipeDetails[]>(`${MASTER_DATA_API_URL}/GetRecipeDetails`);
  }

  saveRecipe(recipe: SaveRecipeRequest): Observable<SaveRecipeResult> {
    return this.http.post<SaveRecipeResult>(`${MASTER_DATA_API_URL}/SaveRecipe`, recipe);
  }
}
