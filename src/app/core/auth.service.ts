import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, map, tap } from 'rxjs';

const API_BASE_URL = 'https://localhost:44391/api';
const TOKEN_STORAGE_KEY = 'venus-rmc-token';

function findToken(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim().replace(/^Bearer\s+/i, '') || null;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const response = value as Record<string, unknown>;
  for (const key of ['token', 'jwt', 'jwttoken', 'accesstoken', 'access_token']) {
    const property = Object.keys(response).find((name) => name.toLowerCase() === key);
    const token = property ? response[property] : undefined;
    if (typeof token === 'string' && token.trim()) {
      return token.trim().replace(/^Bearer\s+/i, '');
    }
  }

  for (const key of ['data', 'result', 'value']) {
    const token = findToken(response[key]);
    if (token) {
      return token;
    }
  }

  return null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  login(username: string, password: string): Observable<string> {
    return this.http
      .post<unknown>(`${API_BASE_URL}/Authantication/login`, { username, password })
      .pipe(
        map((response) => {
          const token = findToken(response);
          if (!token) {
            throw new Error('The login response did not contain a JWT token.');
          }
          return token;
        }),
        tap((token) => this.storeToken(token)),
      );
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  getUserId(): number | null {
    const token = this.getToken();
    const payload = token?.split('.')[1];
    if (!payload) {
      return null;
    }

    try {
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
      if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
        return null;
      }

      const claims = decoded as Record<string, unknown>;
      const userIdClaims = [
        'userid',
        'user_id',
        'uid',
        'nameid',
        'sub',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
      ];
      for (const claimName of userIdClaims) {
        const actualName = Object.keys(claims).find(
          (name) => name.toLowerCase() === claimName.toLowerCase(),
        );
        const value = actualName ? claims[actualName] : undefined;
        const userId = typeof value === 'number' ? value : Number(value);
        if (Number.isInteger(userId) && userId > 0) {
          return userId;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  private storeToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  }
}
