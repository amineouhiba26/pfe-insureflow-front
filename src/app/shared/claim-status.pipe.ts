import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(status: string): string {
    const map: Record<string, string> = {
      APPROVED:       '✅ Approuvé',
      REJECTED:       '❌ Rejeté',
      PENDING_REVIEW: '👁️ En révision',
      FRAUD_CHECK:    '🛡️ Vérification fraude',
      ESTIMATING:     '🔍 Estimation',
      VALIDATING:     '📄 Validation',
      SUBMITTED:      '📋 Soumis'
    };
    return map[status] || status;
  }
}

@Pipe({ name: 'statusColor', standalone: true })
export class StatusColorPipe implements PipeTransform {
  transform(status: string): string {
    const map: Record<string, string> = {
      APPROVED:       'bg-green-100 text-green-800',
      REJECTED:       'bg-red-100 text-red-800',
      PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
      FRAUD_CHECK:    'bg-orange-100 text-orange-800',
      ESTIMATING:     'bg-blue-100 text-blue-800',
      VALIDATING:     'bg-purple-100 text-purple-800',
      SUBMITTED:      'bg-gray-100 text-gray-800'
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  }
}
