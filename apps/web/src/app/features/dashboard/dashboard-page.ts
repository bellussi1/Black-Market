import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

type ApiStatus = 'checking' | 'online' | 'offline';

interface ReadinessResponse {
  status: 'ok';
  database: 'up';
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage implements OnInit {
  private readonly http = inject(HttpClient);
  readonly apiStatus = signal<ApiStatus>('checking');

  readonly tools = [
    {
      index: '01',
      title: 'Mercado central',
      description: 'Acompanhe preço, volume e histórico por região.',
      category: 'Economia',
    },
    {
      index: '02',
      title: 'Oficina de produção',
      description: 'Compare comprar materiais com produzir e vender.',
      category: 'Crafting',
    },
    {
      index: '03',
      title: 'Progressão e enhancement',
      description: 'Modele custos, tentativas e caminhos de equipamento.',
      category: 'Progressão',
    },
  ];

  ngOnInit(): void {
    this.http.get<ReadinessResponse>(environment.apiBaseUrl + '/ready').subscribe({
      next: (result) => this.apiStatus.set(result.status === 'ok' ? 'online' : 'offline'),
      error: () => this.apiStatus.set('offline'),
    });
  }

  get apiStatusLabel(): string {
    const labels: Record<ApiStatus, string> = {
      checking: 'Verificando API',
      online: 'API e banco conectados',
      offline: 'API ainda não conectada',
    };
    return labels[this.apiStatus()];
  }
}
