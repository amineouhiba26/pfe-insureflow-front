import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ClaimService } from '../../services/claim';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-submit-claim',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './submit-claim.html'
})
export class SubmitClaim implements OnInit {
  policyId            = '';
  description         = '';
  clientEstimatedCost = 0;
  photos: File[]      = [];
  previews: string[]  = [];
  loading             = false;
  error               = '';

  constructor(
    private claimService: ClaimService,
    public  auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['policyId']) this.policyId = params['policyId'];
    });
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.photos   = Array.from(input.files);
    this.previews = [];
    this.photos.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => this.previews.push(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  removePhoto(i: number) {
    this.photos.splice(i, 1);
    this.previews.splice(i, 1);
  }

  submit() {
    if (!this.policyId || !this.description) {
      this.error = 'Veuillez remplir tous les champs obligatoires';
      return;
    }
    this.loading = true;
    this.error   = '';

    this.claimService.submitWithPhotos(
      this.auth.getClientId()!,
      this.policyId,
      this.description,
      this.clientEstimatedCost,
      this.photos
    ).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: any) => {
        this.error   = 'Erreur lors de la soumission. Vérifiez vos informations.';
        this.loading = false;
        console.error(err);
      }
    });
  }
}