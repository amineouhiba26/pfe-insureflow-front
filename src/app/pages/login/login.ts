import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html'
})
export class Login {
  tab: 'client' | 'admin' = 'client';

  fullName = '';
  cin      = '';
  username = '';
  password = '';
  error    = '';
  loading  = false;

  constructor(private auth: AuthService, private router: Router) {}

  loginClient() {
    if (!this.fullName || !this.cin) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }
    this.loading = true;
    this.error   = '';
    this.auth.login(this.fullName, this.cin).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.error   = 'Nom ou CIN incorrect';
        this.loading = false;
      }
    });
  }

  loginAdmin() {
    if (!this.username || !this.password) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }
    this.loading = true;
    this.error   = '';
    this.auth.adminLogin(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: () => {
        this.error   = 'Identifiants incorrects';
        this.loading = false;
      }
    });
  }
}