import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AnalyticsSummary {
  totalClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  pendingClaims: number;
  avgProcessingTimeSeconds: number;
  avgEstimatedAmount: number;
  fraudFlaggedClaims: number;
}

export interface LabelValue {
  label: string;
  value: number;
}

export interface MonthlyStats {
  month: string;
  count: number;
}

export interface AmountByType {
  claimType: string;
  averageAmount: number;
}

export interface FraudDistribution {
  range: string;
  count: number;
}

export interface AgentPerformance {
  agent: string;
  avgSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly BASE = 'http://localhost:8080/api/v1/admin/analytics';

  constructor(private http: HttpClient) {}

  getSummary(): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(`${this.BASE}/summary`);
  }

  getClaimsByType(): Observable<LabelValue[]> {
    return this.http.get<LabelValue[]>(`${this.BASE}/claims-by-type`);
  }

  getClaimsByStatus(): Observable<LabelValue[]> {
    return this.http.get<LabelValue[]>(`${this.BASE}/claims-by-status`);
  }

  getClaimsMonthly(): Observable<MonthlyStats[]> {
    return this.http.get<MonthlyStats[]>(`${this.BASE}/claims-monthly`);
  }

  getAvgAmountByType(): Observable<AmountByType[]> {
    return this.http.get<AmountByType[]>(`${this.BASE}/avg-amount-by-type`);
  }

  getFraudScoreDistribution(): Observable<FraudDistribution[]> {
    return this.http.get<FraudDistribution[]>(`${this.BASE}/fraud-score-distribution`);
  }

  getAgentPerformance(): Observable<AgentPerformance[]> {
    return this.http.get<AgentPerformance[]>(`${this.BASE}/agent-performance`);
  }
}
