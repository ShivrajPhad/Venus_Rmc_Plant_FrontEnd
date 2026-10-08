import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface MasterLink {
  title: string;
  description: string;
  route: string;
}

@Component({
  selector: 'app-master',
  imports: [RouterLink],
  templateUrl: './master.component.html',
  styleUrl: './master.component.scss',
})
export class MasterComponent {
  readonly links: MasterLink[] = [
    {
      title: 'Customer Details',
      description: 'Browse and review your customer records.',
      route: '/customers',
    },
    {
      title: 'Site Details',
      description: 'View plant sites associated with customers.',
      route: '/sites',
    },
    {
      title: 'Recipe Details',
      description: 'Review the configured concrete mix recipes.',
      route: '/recipes',
    },
    {
      title: 'Truck Details',
      description: 'Browse trucks registered for operations.',
      route: '/trucks',
    },
    {
      title: 'Driver Details',
      description: 'Browse drivers registered for operations.',
      route: '/drivers',
    },
  ];
}
