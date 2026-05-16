import { Component, Input } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-claims-by-type-chart',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="chart-card chart-card--accent-indigo">
      <p class="chart-card__title">Sinistres par type</p>
      <div class="chart-canvas" style="height: 180px">
        <canvas baseChart
                [type]="'doughnut'"
                [data]="data"
                [options]="options">
        </canvas>
      </div>
    </div>
  `,
  styles: [':host { display: contents; }'],
})
export class ClaimsByTypeChartComponent {
  @Input({ required: true }) data!: ChartData<'doughnut'>;

  readonly options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: 'Inter, system-ui, sans-serif', size: 12 },
          color: '#374151',
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
        },
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
