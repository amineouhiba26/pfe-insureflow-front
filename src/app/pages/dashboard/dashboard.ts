import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ClaimService, Claim, Policy } from '../../services/claim';
import { PolicyService } from '../../services/policy';
import { ClaimProgress } from '../../shared/claim-progress/claim-progress';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ClaimProgress],
  templateUrl: './dashboard.html'
})
export class Dashboard implements OnInit {
  claims:   Claim[]  = [];
  policies: Policy[] = [];
  selected: Claim | null = null;
  activeTab: 'claims' | 'policies' = 'policies';
  loading = true;

  constructor(
    public  auth:          AuthService,
    private claimService:  ClaimService,
    private policyService: PolicyService,
    private router:        Router
  ) {}

  ngOnInit() {
    this.loadPolicies();
    this.loadClaims();
  }

  loadPolicies() {
    this.policyService.getMyPolicies().subscribe({
      next: p => this.policies = p,
      error: () => {}
    });
  }

  loadClaims() {
    this.loading = true;
    const clientId = this.auth.getClientId()!;
    this.claimService.getMyClaims(clientId).subscribe({
      next: claims => {
        this.claims  = claims.sort((a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  selectClaim(claim: Claim) {
    this.selected = claim;
    const finals  = ['APPROVED', 'REJECTED', 'PENDING_REVIEW'];
    if (!finals.includes(claim.status)) {
      this.claimService.pollUntilFinal(claim.id).subscribe(updated => {
        this.selected = updated;
        const idx = this.claims.findIndex(c => c.id === updated.id);
        if (idx >= 0) this.claims[idx] = updated;
      });
    }
  }

  submitForPolicy(policyId: string) {
    this.router.navigate(['/submit'], { queryParams: { policyId } });
  }

  statusColor(status: string) {
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

  statusLabel(status: string) {
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