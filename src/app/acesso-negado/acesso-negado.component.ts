import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-acesso-negado',
  standalone: true,
  templateUrl: './acesso-negado.component.html',
  styleUrls: ['./acesso-negado.component.css']
})
export class AcessoNegadoComponent {

  constructor(private router: Router) {}

  voltar() {
    this.router.navigate(['/']);
  }
}
