import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChartData } from 'chart.js';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import {
  AnalyticsService,
  AnalyticsSummary,
} from '../../services/analytics.service';
import { AuthService } from '../../services/auth';

import { ClaimsByTypeChartComponent } from './charts/claims-by-type-chart.component';
import { ClaimsByStatusChartComponent } from './charts/claims-by-status-chart.component';
import { MonthlyEvolutionChartComponent } from './charts/monthly-evolution-chart.component';
import { AvgAmountChartComponent } from './charts/avg-amount-chart.component';
import { FraudDistributionChartComponent } from './charts/fraud-distribution-chart.component';
import { AgentPerformanceChartComponent } from './charts/agent-performance-chart.component';

const TYPE_LABELS: Record<string, string> = {
  VEHICLE_DAMAGE: 'Dommages véhicule',
  THEFT: 'Vol',
  PROPERTY_DAMAGE: 'Dommages matériels',
  OTHER: 'Autre',
};

const TYPE_COLORS: Record<string, string> = {
  VEHICLE_DAMAGE: '#6366F1',
  THEFT: '#F59E0B',
  PROPERTY_DAMAGE: '#10B981',
  OTHER: '#94A3B8',
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  PENDING_REVIEW: 'En révision',
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  PENDING_REVIEW: '#F59E0B',
};

const AGENT_COLORS: Record<string, string> = {
  RouterAgent: '#6366F1',
  ValidatorAgent: '#10B981',
  EstimatorAgent: '#F59E0B',
  FraudAgent: '#EF4444',
};

const FRAUD_COLORS = ['#10B981', '#84CC16', '#F59E0B', '#F97316', '#EF4444'];

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ClaimsByTypeChartComponent,
    ClaimsByStatusChartComponent,
    MonthlyEvolutionChartComponent,
    AvgAmountChartComponent,
    FraudDistributionChartComponent,
    AgentPerformanceChartComponent,
  ],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss'],
})
export class AnalyticsDashboardComponent implements OnInit {
  loading = true;
  lastUpdated = new Date();
  hasErrors = false;
  summary: AnalyticsSummary | null = null;

  // Chart 1 — Doughnut: claims by type
  byTypeData: ChartData<'doughnut'> = { datasets: [] };

  // Chart 2 — Doughnut: claims by status
  byStatusData: ChartData<'doughnut'> = { datasets: [] };

  // Chart 3 — Line: monthly evolution
  monthlyData: ChartData<'line'> = { datasets: [] };

  // Chart 4 — Bar: avg amount by type
  avgAmountData: ChartData<'bar'> = { datasets: [] };

  // Chart 5 — Bar: fraud score distribution
  fraudDistData: ChartData<'bar'> = { datasets: [] };

  // Chart 6 — Horizontal Bar: agent performance
  agentPerfData: ChartData<'bar'> = { datasets: [] };

  constructor(
    private analyticsService: AnalyticsService,
    public auth: AuthService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      summary: this.analyticsService.getSummary().pipe(catchError(() => of(null))),
      byType: this.analyticsService.getClaimsByType().pipe(catchError(() => of(null))),
      byStatus: this.analyticsService.getClaimsByStatus().pipe(catchError(() => of(null))),
      monthly: this.analyticsService.getClaimsMonthly().pipe(catchError(() => of(null))),
      avgAmount: this.analyticsService.getAvgAmountByType().pipe(catchError(() => of(null))),
      fraudDist: this.analyticsService.getFraudScoreDistribution().pipe(catchError(() => of(null))),
      agentPerf: this.analyticsService.getAgentPerformance().pipe(catchError(() => of(null))),
    }).subscribe({
      next: (data) => {
        this.hasErrors = Object.values(data).some((v) => v === null);

        if (data.summary) {
          this.summary = data.summary;
        }

        if (data.byType) {
          this.byTypeData = {
            labels: data.byType.map((d) => TYPE_LABELS[d.label] ?? d.label),
            datasets: [
              {
                data: data.byType.map((d) => d.value),
                backgroundColor: data.byType.map((d) => TYPE_COLORS[d.label] ?? '#6B7280'),
              },
            ],
          };
        }

        if (data.byStatus) {
          this.byStatusData = {
            labels: data.byStatus.map((d) => STATUS_LABELS[d.label] ?? d.label),
            datasets: [
              {
                data: data.byStatus.map((d) => d.value),
                backgroundColor: data.byStatus.map((d) => STATUS_COLORS[d.label] ?? '#94A3B8'),
              },
            ],
          };
        }

        if (data.monthly) {
          this.monthlyData = {
            labels: data.monthly.map((d) => d.month),
            datasets: [
              {
                label: 'Sinistres',
                data: data.monthly.map((d) => d.count),
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                pointRadius: 4,
                tension: 0.4,
              },
            ],
          };
        }

        if (data.avgAmount) {
          this.avgAmountData = {
            labels: data.avgAmount.map((d) => TYPE_LABELS[d.claimType] ?? d.claimType),
            datasets: [
              {
                data: data.avgAmount.map((d) => d.averageAmount),
                backgroundColor: data.avgAmount.map(
                  (d) => TYPE_COLORS[d.claimType] ?? '#6B7280',
                ),
              },
            ],
          };
        }

        if (data.fraudDist) {
          this.fraudDistData = {
            labels: data.fraudDist.map((d) => d.range),
            datasets: [
              {
                data: data.fraudDist.map((d) => d.count),
                backgroundColor: FRAUD_COLORS,
              },
            ],
          };
        }

        if (data.agentPerf) {
          this.agentPerfData = {
            labels: data.agentPerf.map((d) => d.agent),
            datasets: [
              {
                data: data.agentPerf.map((d) => d.avgSeconds),
                backgroundColor: data.agentPerf.map(
                  (d) => AGENT_COLORS[d.agent] ?? '#94A3B8',
                ),
              },
            ],
          };
        }

        this.loading = false;
      },
      error: () => {
        this.hasErrors = true;
        this.loading = false;
      },
    });
  }
}
