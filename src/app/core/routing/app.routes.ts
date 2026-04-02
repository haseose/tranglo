import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../../dashboard/dashboard-page/dashboard-page').then(
            m => m.DashboardPageComponent
          ),
      },
      {
        path: 'trends',
        loadComponent: () =>
          import('../../historical-trends/trends-page/trends-page').then(
            m => m.TrendsPageComponent
          ),
      },
      {
        path: 'converter',
        loadComponent: () =>
          import('../../converter/converter-page/converter-page').then(
            m => m.ConverterPageComponent
          ),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
