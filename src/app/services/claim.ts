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

  submitWithPhotos(clientId: string, policyId: string, description: string,
                   clientEstimatedCost: number, photos: string[] | File[]): Observable<Claim> {
    const form = new FormData();
    form.append('clientId', clientId);
    form.append('policyId', policyId);
    form.append('description', description);
    
    if (clientEstimatedCost != null) {
      form.append('clientEstimatedCost', String(clientEstimatedCost));
    }
    
    // We allow File[] or base64 string[] based on what caller has. 
    // Wait, the backend strictly expects multipart file. Let's just type it to File[].
    photos.forEach((f: any) => {
      // If it's a file, we can append it directly.
      form.append('photos', f);
    });
    
    return this.http.post<Claim>(`${this.API}/claims/with-photos`, form);
  }

  getById(id: string): Observable<Claim> {
    return this.http.get<Claim>(`${this.API}/claims/${id}`);
  }

  getMyClaims(clientId: string): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${this.API}/claims?clientId=${clientId}`);
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

  createClient(data: any): Observable<any> {
    return this.http.post(`${this.API}/admin/clients`, data);
  }

  getClients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/admin/clients`);
  }

  createPolicy(data: any): Observable<any> {
    return this.http.post(`${this.API}/admin/policies`, data);
  }

  getPolicies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/admin/policies`);
  }

  ingestContract(policyId: string, file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.API}/admin/contracts/${policyId}/ingest`, form);
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