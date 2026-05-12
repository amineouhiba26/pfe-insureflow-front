import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(status: string, mode: 'label' | 'colorOnly' = 'label'): string {
    if (mode === 'colorOnly') {
      const colorMap: Record<string, string> = {
        APPROVED:       'bg-status-approved-bg text-status-approved-text',
        REJECTED:       'bg-status-rejected-bg text-status-rejected-text',
        PENDING_REVIEW: 'bg-status-revision-bg text-status-revision-text',
        FRAUD_CHECK:    'bg-slate-100 text-slate-600',
        ESTIMATING:     'bg-slate-100 text-slate-600',
        VALIDATING:     'bg-slate-100 text-slate-600',
        ROUTING:        'bg-slate-100 text-slate-600',
        SUBMITTED:      'bg-slate-100 text-slate-600'
      };
      return colorMap[status] || 'bg-slate-100 text-slate-600';
    }

    const labelMap: Record<string, string> = {
      APPROVED:       'Approuvé',
      REJECTED:       'Rejeté',
      PENDING_REVIEW: 'En révision',
      FRAUD_CHECK:    'Vérification fraude',
      ESTIMATING:     'Estimation',
      VALIDATING:     'Validation',
      ROUTING:        'Routage',
      SUBMITTED:      'Soumis'
    };
    return labelMap[status] || status;
  }
}

@Pipe({ name: 'statusColor', standalone: true })
export class StatusColorPipe implements PipeTransform {
  transform(status: string): string {
    const map: Record<string, string> = {
      APPROVED:       'bg-status-approved-bg text-status-approved-text',
      REJECTED:       'bg-status-rejected-bg text-status-rejected-text',
      PENDING_REVIEW: 'bg-status-revision-bg text-status-revision-text',
      FRAUD_CHECK:    'bg-slate-100 text-slate-600',
      ESTIMATING:     'bg-slate-100 text-slate-600',
      VALIDATING:     'bg-slate-100 text-slate-600',
      ROUTING:        'bg-slate-100 text-slate-600',
      SUBMITTED:      'bg-slate-100 text-slate-600'
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  }
}
