import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Policy } from './claim';

@Injectable({ providedIn: 'root' })
export class PolicyService {
  private readonly API = 'http://localhost:8080/api/v1/policies';

  constructor(private http: HttpClient) {}

  getMyPolicies(): Observable<Policy[]> {
    return this.http.get<Policy[]>(`${this.API}/my`);
  }
}
