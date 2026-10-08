import { Routes } from '@angular/router';
import { MasterComponent } from './features/master/master.component';
import { LoginComponent } from './features/login/login.component';
import { MasterLayoutComponent } from './layouts/master-layout/master-layout.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MasterLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'master', component: MasterComponent },
      { path: 'dashboard', pathMatch: 'full', redirectTo: 'master' },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/customers/customers.component').then(
            (module) => module.CustomersComponent,
          ),
      },
      {
        path: 'sites',
        loadComponent: () =>
          import('./features/sites/sites.component').then((module) => module.SitesComponent),
      },
      {
        path: 'recipes',
        loadComponent: () =>
          import('./features/recipes/recipes.component').then(
            (module) => module.RecipesComponent,
          ),
      },
      {
        path: 'trucks',
        loadComponent: () =>
          import('./features/trucks/trucks.component').then((module) => module.TrucksComponent),
      },
      {
        path: 'drivers',
        loadComponent: () =>
          import('./features/drivers/drivers.component').then((module) => module.DriversComponent),
      },
      {
        path: 'batch-report',
        loadComponent: () =>
          import('./features/batch-report/batch-report.component').then(
            (module) => module.BatchReportComponent,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'master' },
    ],
  },
  { path: '**', redirectTo: 'master' },
];
