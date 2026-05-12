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
    { key: 'SUBMITTED',     label: 'Soumis' },
    { key: 'ROUTING',       label: 'Routage' },
    { key: 'VALIDATING',    label: 'Validation' },
    { key: 'ESTIMATING',    label: 'Estimation' },
    { key: 'FRAUD_CHECK',   label: 'Anti-fraude' },
    { key: 'FINAL',         label: 'Décision' }
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

  isCompleted(i: number) { 
    return i < this.getCurrentStep(); 
  }
  
  isActive(i: number) { 
    return i === this.getCurrentStep(); 
  }

  getStepCircleClass(i: number) {
    if (i === 5 && this.status === 'REJECTED') return 'bg-red-600';
    if (i === 5 && this.status === 'APPROVED') return 'bg-indigo-600';
    if (i === 5 && this.status === 'PENDING_REVIEW') return 'bg-amber-500';
    if (this.isCompleted(i) || (i === this.getCurrentStep() && this.status === 'APPROVED')) return 'bg-indigo-600';
    if (this.isActive(i)) return 'bg-white border-2 border-indigo-600';
    return 'bg-slate-100 border border-slate-200';
  }

  getConnectorClass(i: number) {
    const current = this.getCurrentStep();
    if (this.status === 'REJECTED' && i >= current - 1 && i < 5) return 'bg-red-600';
    if (i < current) return 'bg-indigo-600';
    return 'bg-slate-200';
  }

  getLabelClass(i: number) {
    if (i === 5 && this.status === 'REJECTED') return 'text-red-600';
    if (i === 5 && this.status === 'APPROVED') return 'text-indigo-600';
    if (i <= this.getCurrentStep()) return 'text-indigo-600';
    return 'text-slate-400';
  }

  getFinalLabel() {
    if (this.status === 'APPROVED')       return 'Approuvé';
    if (this.status === 'REJECTED')       return 'Rejeté';
    if (this.status === 'PENDING_REVIEW') return 'En révision';
    return 'Décision';
  }
}