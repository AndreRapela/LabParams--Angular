import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  loginErro: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required]]
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.loginErro = null;

    const { email, senha } = this.form.value;

    try {
      const res = await this.authService.login(email, senha);

      if (res.error) {
        if (res.error.message.includes('Invalid login credentials')) {
          this.loginErro = "Email ou senha incorretos.";
        } else {
          this.loginErro = "Erro ao fazer login.";
        }
        this.loading = false;
        return;
      }

      await this.authService.getSession();

      this.router.navigateByUrl('/dashboard-web');

    } catch (err) {
      console.error('Erro no login', err);
      this.loginErro = "Erro inesperado. Tente novamente.";
    }

    this.loading = false;
  }

  goToForgotPassword(): void {
    this.router.navigate(['/recuperar-senha']);
  }
}
