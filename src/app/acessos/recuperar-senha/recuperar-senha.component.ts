import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-recuperar-senha',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './recuperar-senha.component.html'
})
export class RecuperarSenhaComponent {
  form: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const email = this.form.value.email;

    this.authService.requestPasswordReset(email)
      .then(() => {
        this.successMessage =
          'Se o email existir em nossa base, você receberá um link de recuperação.';
      })
      .catch((err) => {
        this.errorMessage =
          err?.message || 'Erro ao enviar o link de recuperação.';
      })
      .finally(() => {
        this.loading = false;
      });
  }

  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }
}
