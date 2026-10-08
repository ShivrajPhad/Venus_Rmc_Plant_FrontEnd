import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-master-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './master-layout.component.html',
  styleUrl: './master-layout.component.scss',
})
export class MasterLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  mobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  logout(): void {
    this.closeMobileMenu();
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
