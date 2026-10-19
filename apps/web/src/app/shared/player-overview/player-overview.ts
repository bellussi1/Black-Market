import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { recommend } from '@bdo/calculators';

import { IdentityService } from '../../core/identity.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { silver } from '../formatters';
@Component({
  selector: 'app-player-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (store.activeCharacter(); as profile) {
      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">
              {{ profile.familyName || profile.name }} · {{ profile.className }} ·
              {{ profile.level }}
            </p>
            <h2 i18n>Seu personagem, seus próximos passos</h2>
          </div>
          @if (identity.authenticated()) {
            <a routerLink="/family" i18n>Atualizar ficha →</a>
          }
        </div>
        <div class="form-grid">
          <div>
            <span i18n>PA / despertar / PD</span
            ><strong class="hero-metric"
              >{{ profile.mainAp }} / {{ profile.awakeAp }} / {{ profile.dp }}</strong
            >
          </div>
          <div>
            <span i18n>Prata disponível na família</span
            ><strong class="hero-metric">{{ silver(wealth().cash) }}</strong>
          </div>
          <div>
            <span i18n>Materiais com preço conhecido</span
            ><strong class="hero-metric">{{ silver(wealth().stock) }}</strong>
          </div>
          <div>
            <span i18n>Energia / contribuição</span
            ><strong class="hero-metric">{{ profile.energy }} / {{ profile.contribution }}</strong>
          </div>
        </div>
        <p class="help" i18n>
          Patrimônio parcial: {{ silver(wealth().total) }}. Conta cada saldo e cada linha de estoque
          uma vez. Equipamentos usados, {{ wealth().unknown }} linhas sem preço e itens não
          avaliados ficam fora. Preços salvos podem estar desatualizados.
        </p>
        <div class="action-row">
          <a class="btn" routerLink="/recipes" i18n>Planejar uma produção</a>
          @if (identity.authenticated()) {
            <a class="btn subtle" routerLink="/storage" i18n>Ver meus materiais</a>
          }
          @if (identity.authenticated()) {
            <a class="btn subtle" routerLink="/family" [queryParams]="{ tab: 'equipment' }" i18n
              >Revisar equipamentos</a
            >
          }
        </div>
        <h3 i18n>Uma atividade para comparar</h3>
        @if (best(); as recommendation) {
          <p>
            <strong>{{ recommendation.name }}</strong> · {{ silver(recommendation.perHour) }} / h
          </p>
          <p class="help" i18n>
            Estimativa com os seus registros e o tempo disponível, não uma promessa de rendimento. A
            sessão do exemplo é simulada.
          </p>
          @if (identity.authenticated()) {
            <a routerLink="/lifeskills" [queryParams]="{ tab: 'production' }" i18n
              >Ver cálculo e limitações →</a
            >
          }
        } @else {
          <p i18n>
            Registre uma atividade ou prepare uma receita para receber comparações específicas.
          </p>
          <a routerLink="/lifeskills" i18n>Registrar atividade →</a>
        }
        @if (store.data().familyLifeSkills; as skills) {
          <h3 i18n>Profissões da família</h3>
          <div class="form-grid">
            @for (skill of skillNames; track skill.id) {
              <div>
                <strong>{{ skill.label }}</strong>
                <p>
                  {{ skills[skill.id].tier }} {{ skills[skill.id].level }} ·
                  {{ profile.mastery[skill.id] }} <ng-container i18n>de maestria</ng-container>
                </p>
              </div>
            }
          </div>
          @if (identity.authenticated()) {
            <a routerLink="/family" i18n>Conferir profissões e bônus →</a>
          }
        }
      </section>
    }
  `,
})
export class PlayerOverview {
  readonly store = inject(WorkspaceStore);
  readonly identity = inject(IdentityService);
  readonly silver = silver;
  readonly skillNames = [
    { id: 'cooking', label: 'Culinária' },
    { id: 'alchemy', label: 'Alquimia' },
    { id: 'processing', label: 'Processamento' },
    { id: 'gathering', label: 'Coleta' },
    { id: 'fishing', label: 'Pesca' },
    { id: 'hunting', label: 'Caça' },
    { id: 'training', label: 'Treino' },
    { id: 'farming', label: 'Cultivo' },
    { id: 'sailing', label: 'Navegação' },
    { id: 'barter', label: 'Permuta' },
  ] as const;
  readonly wealth = computed(() => {
    const s = this.store.data(),
      rows = s.inventory.filter((r) => r.region === s.region);
    const cash = s.characters
      .filter((c) => c.region === s.region)
      .reduce(
        (n, c) => n + BigInt(c.silver),
        BigInt(s.familySilverRegion === s.region ? s.familySilver : '0'),
      );
    const stock = rows.reduce((sum, r) => {
      const quote = s.quotes
        .filter((q) => q.region === s.region && q.itemId === r.itemId && !q.subId)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
      return sum + BigInt(quote?.price ?? r.price) * BigInt(r.quantity);
    }, 0n);
    return {
      cash: String(cash),
      stock: String(stock),
      total: String(cash + stock),
      unknown: rows.filter(
        (r) =>
          r.price === '0' &&
          !s.quotes.some(
            (q) => q.region === s.region && q.itemId === r.itemId && !q.subId && q.price !== '0',
          ),
      ).length,
    };
  });
  readonly best = computed(() => {
    const profile = this.store.activeCharacter();
    return profile ? (recommend(this.store.data(), profile)[0] ?? null) : null;
  });
}
