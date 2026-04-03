import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

export interface Claim {
  id: string;
  clientId: string;
  policyId: string;
  type: string;
  status: string;
  description: string;
  estimatedCost: number;
  clientEstimatedCost: number;
  confidenceScore: number;
  submittedAt: string;
  updatedAt: string;
  routerResult: any;
  validatorResult: any;
  estimatorResult: any;
  fraudResult: any;
  rejectionReason: string;
}

@Injectable({ providedIn: 'root' })
export class ClaimService {
  private readonly API = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient) {}

  submitWithPhotos(policyId: string, description: string,
                   clientEstimatedCost: number, photos: File[]): Observable<Claim> {
    const form = new FormData();
    form.append('policyId',            policyId);
    form.append('description',         description);
    form.append('clientEstimatedCost', String(clientEstimatedCost));
    photos.forEach(f => form.append('photos', f));
    return this.http.post<Claim>(`${this.API}/claims/with-photos`, form);
  }

  getById(id: string): Observable<Claim> {
    return this.http.get<Claim>(`${this.API}/claims/${id}`);
  }

  getMyClaims(): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${this.API}/claims`);
  }

  // Polls every 5 seconds until claim reaches a final status
  pollUntilFinal(id: string): Observable<Claim> {
    const finalStatuses = ['APPROVED', 'REJECTED', 'PENDING_REVIEW'];
    return interval(5000).pipe(
      switchMap(() => this.getById(id)),
      takeWhile(claim => !finalStatuses.includes(claim.status), true)
    );
  }

  // Admin endpoints
  getAllClaims(): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${this.API}/admin/claims`);
  }

  getPendingClaims(): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${this.API}/admin/claims/pending`);
  }

  approveClaim(id: string, notes: string = ''): Observable<any> {
    return this.http.post(`${this.API}/admin/claims/${id}/approve`, { notes });
  }

  rejectClaim(id: string, reason: string, notes: string = ''): Observable<any> {
    return this.http.post(`${this.API}/admin/claims/${id}/reject`, { reason, notes });
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.API}/admin/stats`);
  }
}

export interface Policy {
  id: string;
  policyNumber: string;
  type: string;
  typeLabel: string;
  coverageLimit: number;
  deductible: number;
  startDate: string;
  endDate: string;
}