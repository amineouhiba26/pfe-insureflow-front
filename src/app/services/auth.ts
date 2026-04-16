import { Injectable, inject } from '@angular/core';
import Keycloak from 'keycloak-js';
import { Router } from '@angular/router';
import { HttpInterceptorFn } from '@angular/common/http';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private keycloak: Keycloak;
  private initialized = false;

  constructor(private router: Router) {
    this.keycloak = new Keycloak({
      url:      'http://localhost:8180',
      realm:    'insureflow',
      clientId: 'insureflow-frontend'
    });
  }

  async init(): Promise<boolean> {
    if (this.initialized) return this.keycloak.authenticated ?? false;

    const authenticated = await this.keycloak.init({
      onLoad:       'check-sso',
      checkLoginIframe: false
    });

    this.initialized = true;
    return authenticated;
  }

  login()
  {
    this.keycloak.login({ redirectUri: 'http://localhost:4200/dashboard'
    }); }

  logout() {
    this.keycloak.clearToken();
    localStorage.clear();
    sessionStorage.clear();
    this.keycloak.logout({ redirectUri: 'http://localhost:4200' });
  }

  adminLogin() {
    this.keycloak.login({ redirectUri: 'http://localhost:4200/admin' });
  }

  async getToken(): Promise<string | undefined> {
    if (!this.keycloak.authenticated) return undefined;

    try {
      // Refresh token if expires in less than 30 seconds
      await this.keycloak.updateToken(30);
    } catch {
      this.logout();
    }
    return this.keycloak.token;
  }

  getFullName(): string {
    const p = this.keycloak.tokenParsed;
    if (!p) return '';
    return `${p['given_name'] ?? ''} ${p['family_name'] ?? ''}`.trim()
           || p['preferred_username']
           || '';
  }

  getClientId(): string {
    return this.keycloak.tokenParsed?.['sub'] ?? '';
  }

  getCin(): string {
    return this.keycloak.tokenParsed?.['cin'] ?? '';
  }

  isLoggedIn(): boolean {
    return this.keycloak.authenticated ?? false;
  }

  isAdmin(): boolean {
    return this.keycloak.hasRealmRole('ADMIN');
  }

  isClient(): boolean {
    return this.keycloak.hasRealmRole('CLIENT');
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Get token asynchronously
  return from(authService.getToken()).pipe(
    switchMap(token => {
      if (token) {
        req = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
      }
      return next(req);
    })
  );
};
