import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-login.html'
})
export class AdminLogin {
  constructor(private auth: AuthService) {}
  login() { this.auth.adminLogin(); }
}
