import { Injectable } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { inject } from '@angular/core';

export interface AuthResponse {
  token: string;
  clientId: string;
  fullName: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = 'http://localhost:8080/api/v1/auth';

  constructor(private http: HttpClient, private router: Router) {}

  login(fullName: string, cin: string) {
    return this.http.post<AuthResponse>(`${this.API}/login`, { fullName, cin }).pipe(
      tap(res => {
        localStorage.setItem('token',    res.token);
        localStorage.setItem('clientId', res.clientId);
        localStorage.setItem('fullName', res.fullName);
        localStorage.setItem('role',     res.role);
      })
    );
  }

  adminLogin(username: string, password: string) {
    return this.http.post<AuthResponse>(`${this.API}/admin/login`, { username, password }).pipe(
      tap(res => {
        localStorage.setItem('token',    res.token);
        localStorage.setItem('clientId', res.clientId);
        localStorage.setItem('fullName', res.fullName);
        localStorage.setItem('role',     res.role);
      })
    );
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  getToken()    { return localStorage.getItem('token'); }
  getClientId() { return localStorage.getItem('clientId'); }
  getFullName() { return localStorage.getItem('fullName'); }
  getRole()     { return localStorage.getItem('role'); }
  isLoggedIn()  { return !!this.getToken(); }
  isAdmin()     { return this.getRole() === 'ADMIN'; }
}

// JWT interceptor — attaches token to every request automatically
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};