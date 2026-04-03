import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ClaimService, Claim } from '../../services/claim';
import { ClaimProgress } from '../../shared/claim-progress/claim-progress';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ClaimProgress],
  templateUrl: './admin.html'
})
export class Admin implements OnInit {
  claims:   Claim[] = [];
  selected: Claim | null = null;
  filter:   'all' | 'pending' = 'all';
  stats:    any = null;
  loading   = true;
  approveNotes = '';
  rejectReason = '';
  rejectNotes  = '';
  rejectError  = '';

  constructor(
    public auth: AuthService,
    private claimService: ClaimService
  ) {}

  ngOnInit() {
    this.loadStats();
    this.loadClaims();
  }

  loadStats() {
    this.claimService.getStats().subscribe(s => this.stats = s);
  }

  loadClaims() {
    this.loading = true;
    const obs = this.filter === 'pending'
      ? this.claimService.getPendingClaims()
      : this.claimService.getAllClaims();

    obs.subscribe({
      next: claims => {
        this.claims  = claims.sort((a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setFilter(f: 'all' | 'pending') {
    this.filter   = f;
    this.selected = null;
    this.loadClaims();
  }

  approve() {
    if (!this.selected) return;
    this.claimService.approveClaim(this.selected.id, this.approveNotes).subscribe(() => {
      this.selected!.status = 'APPROVED';
      this.approveNotes     = '';
      this.loadStats();
      this.loadClaims();
    });
  }

  reject() {
    if (!this.selected) return;
    if (!this.rejectReason.trim()) {
      this.rejectError = 'Le motif de rejet est obligatoire';
      return;
    }
    this.rejectError = '';
    this.claimService.rejectClaim(
      this.selected.id, this.rejectReason, this.rejectNotes
    ).subscribe(() => {
      this.selected!.status = 'REJECTED';
      this.rejectReason     = '';
      this.rejectNotes      = '';
      this.loadStats();
      this.loadClaims();
    });
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
}