import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import type { CatalogRecipePart } from '@bdo/shared';

import { CatalogApiService } from '../../core/catalog-api.service';
import { ItemIcon } from '../item-icon/item-icon';

export interface RecipeIngredientAlternative {
  recipeKey: string;
  part: CatalogRecipePart;
}

@Component({
  selector: 'app-recipe-ingredient-alternatives',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemIcon],
  template: `
    <fieldset class="ingredient-alternatives">
      <legend>Ingrediente equivalente</legend>
      <div class="ingredient-alternative-list">
        @for (choice of choices(); track choice.recipeKey) {
          <label
            class="ingredient-alternative"
            [class.selected]="choice.recipeKey === selectedKey()"
          >
            <input
              type="radio"
              [name]="groupName()"
              [value]="choice.recipeKey"
              [checked]="choice.recipeKey === selectedKey()"
              (change)="choiceSelected.emit(choice.recipeKey)"
            />
            <app-item-icon [url]="catalog.resolveIconUrl(choice.part)" [name]="choice.part.name" />
            <span class="ingredient-alternative-copy">
              <strong>{{ choice.part.name }}</strong>
              <small>
                {{
                  choice.part.quantity === null
                    ? 'Quantidade a confirmar'
                    : +choice.part.quantity + ' por operação'
                }}
              </small>
            </span>
          </label>
        }
      </div>
    </fieldset>
  `,
  styleUrl: './recipe-ingredient-alternatives.scss',
})
export class RecipeIngredientAlternatives {
  readonly catalog = inject(CatalogApiService);
  readonly choices = input.required<RecipeIngredientAlternative[]>();
  readonly selectedKey = input.required<string>();
  readonly groupName = input.required<string>();
  readonly choiceSelected = output<string>();
}
