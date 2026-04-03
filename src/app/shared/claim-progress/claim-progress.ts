import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-claim-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './claim-progress.html'
})
export class ClaimProgress {
  @Input() status = 'SUBMITTED';

  steps = [
    { key: 'SUBMITTED',     label: 'Soumis',      icon: '📋' },
    { key: 'ROUTING',       label: 'Routage',      icon: '🔀' },
    { key: 'VALIDATING',    label: 'Validation',   icon: '📄' },
    { key: 'ESTIMATING',    label: 'Estimation',   icon: '🔍' },
    { key: 'FRAUD_CHECK',   label: 'Anti-fraude',  icon: '🛡️' },
    { key: 'FINAL',         label: 'Décision',     icon: '⚖️' }
  ];

  finalStatuses = ['APPROVED', 'REJECTED', 'PENDING_REVIEW'];

  getCurrentStep(): number {
    if (this.finalStatuses.includes(this.status)) return 5;
    const map: Record<string, number> = {
      SUBMITTED:   0,
      ROUTING:     1,
      VALIDATING:  2,
      ESTIMATING:  3,
      FRAUD_CHECK: 4
    };
    return map[this.status] ?? 0;
  }

  isCompleted(i: number) { return i < this.getCurrentStep(); }
  isActive(i: number)    { return i === this.getCurrentStep(); }

  getFinalLabel() {
    if (this.status === 'APPROVED')       return '✅ Approuvé';
    if (this.status === 'REJECTED')       return '❌ Rejeté';
    if (this.status === 'PENDING_REVIEW') return '👁️ En révision';
    return '⚖️ Décision';
  }

  getFinalColor() {
    if (this.status === 'APPROVED')       return 'text-green-600';
    if (this.status === 'REJECTED')       return 'text-red-600';
    if (this.status === 'PENDING_REVIEW') return 'text-yellow-600';
    return 'text-gray-500';
  }
}