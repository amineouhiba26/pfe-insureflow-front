import { Component, Input } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-fraud-distribution-chart',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="chart-card chart-card--accent-orange">
      <p class="chart-card__title">Distribution des scores de fraude</p>
      <div class="chart-canvas" style="height: 155px">
        <canvas baseChart
                [type]="'bar'"
                [data]="data"
                [options]="options">
        </canvas>
      </div>
    </div>
  `,
  styles: [':host { display: contents; }'],
})
export class FraudDistributionChartComponent {
  @Input({ required: true }) data!: ChartData<'bar'>;

  readonly options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        labels: {
          font: { family: 'Inter, system-ui, sans-serif', size: 12 },
          color: '#374151',
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      title: {
        display: true,
        text: 'Distribution des scores de fraude',
        font: { size: 13, weight: 'bold' },
        color: '#1E293B',
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { color: '#6B7280', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { color: '#6B7280', font: { size: 11 } },
      },
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart',
    },
    transitions: {
      show: { animation: { duration: 2000, easing: 'easeInOutQuart' } },
      resize: { animation: { duration: 2000, easing: 'easeInOutQuart' } },
    },
  };
}
