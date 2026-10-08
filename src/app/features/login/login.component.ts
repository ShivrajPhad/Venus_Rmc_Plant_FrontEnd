import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as unknown;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = body['message'];
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    return error.status
      ? `Login failed (${error.status}). Check your credentials and try again.`
      : 'Could not reach the login service. Check the API connection and try again.';
  }
  return error instanceof Error ? error.message : 'Login failed. Please try again.';
}

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  error = '';
  submitting = false;

  submit(): void {
    if (this.submitting) {
      return;
    }

    this.error = '';
    this.submitting = true;
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        void this.router.navigate(['/master']);
      },
      error: (error: unknown) => {
        this.error = errorMessage(error);
        this.submitting = false;
      },
      complete: () => {
        this.submitting = false;
      },
    });
  }
}
