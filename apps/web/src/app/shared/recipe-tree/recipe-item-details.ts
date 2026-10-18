import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ItemDossier } from '../item-dossier/item-dossier';
import { ItemIcon } from '../item-icon/item-icon';
import type { RecipeTree } from './recipe-tree';

@Component({
  selector: 'app-recipe-item-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, ItemIcon, ItemDossier],
  templateUrl: './recipe-item-details.html',
  styleUrl: './recipe-item-details.scss',
})
export class RecipeItemDetails {
  readonly tree = input.required<RecipeTree>();
}
