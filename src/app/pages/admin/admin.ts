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

  // Add new tab and state
  activeTab: 'claims' | 'setup' = 'claims';

  // Client form
  newClient = { fullName: '', email: '', phone: '', cin: '' };
  clientSuccess = '';
  clientError   = '';

  // Policy form
  newPolicy = {
    clientId: '',
    policyNumber: '',
    type: 'VEHICLE_DAMAGE',
    coverageLimit: 0,
    deductible: 0,
    startDate: '',
    endDate: ''
  };
  policySuccess = '';
  policyError   = '';

  // Contract ingestion
  ingestPolicyId   = '';
  ingestFile: File | null = null;
  ingestSuccess    = '';
  ingestError      = '';

  clients:  any[] = [];
  policies: any[] = [];

  claimTypes = [
    { value: 'VEHICLE_DAMAGE',   label: 'Assurance Automobile' },
    { value: 'PROPERTY_DAMAGE',  label: 'Assurance Habitation' },
    { value: 'HEALTH',           label: 'Assurance Santé' },
    { value: 'THEFT',            label: 'Assurance Vol' },
    { value: 'NATURAL_DISASTER', label: 'Catastrophes Naturelles' }
  ];

  constructor(
    public auth: AuthService,
    private claimService: ClaimService
  ) {}

  ngOnInit() {
    this.loadStats();
    this.loadClaims();
    this.loadSetupData();
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
    this.activeTab = 'claims';
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

  loadSetupData() {
    this.claimService.getClients().subscribe(c => this.clients = c);
    this.claimService.getPolicies().subscribe(p => this.policies = p);
  }

  submitClient() {
    this.clientError = this.clientSuccess = '';
    if (!this.newClient.fullName || !this.newClient.cin) {
      this.clientError = 'Nom et CIN obligatoires';
      return;
    }
    this.claimService.createClient(this.newClient).subscribe({
      next: () => {
        this.clientSuccess = 'Client créé avec succès';
        this.newClient     = { fullName: '', email: '', phone: '', cin: '' };
        this.loadSetupData();
      },
      error: err => this.clientError = err.error?.error || 'Erreur lors de la création'
    });
  }

  submitPolicy() {
    this.policyError = this.policySuccess = '';
    if (!this.newPolicy.clientId || !this.newPolicy.policyNumber) {
      this.policyError = 'Client et numéro de police obligatoires';
      return;
    }
    this.claimService.createPolicy(this.newPolicy).subscribe({
      next: () => {
        this.policySuccess = 'Police créée avec succès';
        this.newPolicy     = {
          clientId: '', policyNumber: '', type: 'VEHICLE_DAMAGE',
          coverageLimit: 0, deductible: 0, startDate: '', endDate: ''
        };
        this.loadSetupData();
      },
      error: err => this.policyError = err.error?.error || 'Erreur lors de la création'
    });
  }

  onIngestFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.ingestFile = input.files[0];
  }

  submitIngest() {
    this.ingestError = this.ingestSuccess = '';
    if (!this.ingestPolicyId || !this.ingestFile) {
      this.ingestError = 'ID de police et fichier PDF obligatoires';
      return;
    }
    this.claimService.ingestContract(this.ingestPolicyId, this.ingestFile).subscribe({
      next: () => {
        this.ingestSuccess   = 'Contrat ingéré avec succès';
        this.ingestPolicyId  = '';
        this.ingestFile      = null;
      },
      error: err => this.ingestError = err.error?.error || 'Erreur lors de l\'ingestion'
    });
  }
}