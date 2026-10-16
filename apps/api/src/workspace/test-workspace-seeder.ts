import { characterSchema } from '@bdo/calculators';
import type { Workspace } from '@bdo/calculators/workspace';
import { emptyWorkspace, workspaceSchema } from '@bdo/calculators/workspace';
import { authUsers, userWorkspaces } from '@bdo/database/schema';
import type { CatalogCategoriesResponse, CatalogItem } from '@bdo/shared';
import { REGION_CODES, stagingTestCharacter } from '@bdo/shared';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql } from 'drizzle-orm';

import { CatalogService } from '../catalog/catalog.service';
import { DatabaseService } from '../database/database.service';
import {
  buildStagingTestWorkspace,
  mergeStagingTestWorkspace,
  type StagingGearItems,
  type StagingRecipeFixture,
} from './staging-test-workspace';

const stagingRegion = stagingTestCharacter.region;
const stagingLocale = 'pt';
const recipeGroups = ['cooking', 'alchemy', 'processing'] as const;

function normalizeCategoryName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function catalogCategory(categories: CatalogCategoriesResponse['categories'], name: string) {
  const expected = normalizeCategoryName(name);
  return categories.find((category) => normalizeCategoryName(category.name) === expected);
}

@Injectable()
export class TestWorkspaceSeeder {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
    private readonly catalog: CatalogService,
  ) {}

  async seed(firebaseUid: string) {
    if (this.config.get<string>('APP_ENV') !== 'staging')
      throw new ForbiddenException(
        'O perfil sintético pode ser criado somente no ambiente staging.',
      );

    const configuredUid = this.config.get<string>('STAGING_TEST_FIREBASE_UID');
    if (!configuredUid || firebaseUid !== configuredUid)
      throw new ForbiddenException('Informe a UID de teste configurada para o staging.');

    const fixture = await this.loadFixture();

    return this.database.db.transaction(async (transaction) => {
      await transaction.execute(sql`select set_config('app.firebase_uid', ${configuredUid}, true)`);
      const [user] = await transaction
        .select({ id: authUsers.id })
        .from(authUsers)
        .where(eq(authUsers.firebaseUid, configuredUid))
        .limit(1);
      if (!user)
        throw new NotFoundException(
          'A conta de staging ainda não existe. Entre uma vez com Google ou Steam e tente novamente.',
        );

      await transaction.execute(sql`select set_config('app.user_id', ${user.id}, true)`);
      await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${user.id},0))`);
      const [row] = await transaction
        .select({ version: userWorkspaces.version, data: userWorkspaces.data })
        .from(userWorkspaces)
        .where(eq(userWorkspaces.userId, user.id))
        .limit(1);

      const existing = workspaceSchema.parse(row?.data ?? emptyWorkspace());
      const fixtureCharacter = characterSchema.parse(stagingTestCharacter);
      const fixtureRegion = REGION_CODES.find((region) => region === fixtureCharacter.region);
      if (!fixtureRegion) throw new Error('A região do personagem de teste não é suportada.');
      if (
        !existing.characters.some((character) => character.id === fixtureCharacter.id) &&
        existing.characters.length >= 30
      )
        throw new ConflictException('O workspace já atingiu o limite de personagens.');
      const merged = mergeStagingTestWorkspace(existing, fixture);
      if (JSON.stringify(merged) === JSON.stringify(existing))
        return {
          seeded: false,
          version: row?.version ?? 0,
          counts: this.counts(existing, existing),
        };
      const version = (row?.version ?? 0) + 1;
      if (version > 2147483647)
        throw new ConflictException('A versão atual do espaço não permite adicionar o perfil.');
      const updatedAt = new Date();
      await transaction
        .insert(userWorkspaces)
        .values({ userId: user.id, version, updatedAt, data: merged })
        .onConflictDoUpdate({
          target: userWorkspaces.userId,
          set: { version, updatedAt, data: merged },
        });

      return { seeded: true, version, counts: this.counts(existing, merged) };
    });
  }

  private async loadFixture() {
    const recipes: StagingRecipeFixture[] = [];
    for (const group of recipeGroups) {
      const candidates = new Map<number, string>();
      for (let page = 1; page <= 3 && candidates.size < 5; page += 1) {
        const listing = await this.catalog.listRecipes({
          region: stagingRegion,
          locale: stagingLocale,
          recipeGroup: group,
          page,
          pageSize: 100,
        });
        for (const candidate of listing.recipes)
          if (!candidates.has(candidate.itemId)) candidates.set(candidate.itemId, candidate.key);
      }
      for (const key of [...candidates.values()].slice(0, 5)) {
        const detail = await this.catalog.recipe(key, {
          region: stagingRegion,
          locale: stagingLocale,
        });
        if (detail.recipe.inputs.length && detail.recipe.outputs.length)
          recipes.push({ group, recipe: detail.recipe });
      }
    }

    const categoryData = await this.catalog.listCategories({
      region: stagingRegion,
      locale: stagingLocale,
    });
    const gearItems = await this.loadGearItems(categoryData.categories);
    return buildStagingTestWorkspace(recipes, gearItems);
  }

  private async loadGearItems(
    categories: CatalogCategoriesResponse['categories'],
  ): Promise<StagingGearItems> {
    const specs: {
      slot: keyof StagingGearItems;
      category: string;
      query?: string;
      itemCategory?: string;
    }[] = [
      { slot: 'mainhand', category: 'Arma Principal', itemCategory: 'MainWeapon' },
      { slot: 'offhand', category: 'Arma Secundária', itemCategory: 'SubWeapon' },
      { slot: 'awakening', category: 'Arma Desperta', itemCategory: 'MainWeapon' },
      { slot: 'helmet', category: 'Elmo', query: 'Elmo', itemCategory: 'Armor' },
      { slot: 'armor', category: 'Armadura', query: 'Armadura', itemCategory: 'Armor' },
      { slot: 'gloves', category: 'Luvas', query: 'Luvas', itemCategory: 'Armor' },
      { slot: 'shoes', category: 'Sapatos', query: 'Sapatos', itemCategory: 'Armor' },
      { slot: 'necklace', category: 'Colar', query: 'Colar', itemCategory: 'Accessory' },
      { slot: 'belt', category: 'Cinto', query: 'Cinto', itemCategory: 'Accessory' },
      { slot: 'ring1', category: 'Anel', query: 'Anel', itemCategory: 'Accessory' },
      { slot: 'ring2', category: 'Anel', query: 'Anel', itemCategory: 'Accessory' },
      { slot: 'earring1', category: 'Brinco', query: 'Orelha', itemCategory: 'Accessory' },
      { slot: 'earring2', category: 'Brinco', query: 'Orelha', itemCategory: 'Accessory' },
      {
        slot: 'clothes',
        category: 'Traje de Produção',
        query: 'Uniforme de Trabalho',
        itemCategory: 'Armor',
      },
      { slot: 'tool', category: 'Lenhador', query: 'Machado', itemCategory: 'Etc' },
    ];
    const usedItems = new Set<number>();
    const result: StagingGearItems = {};
    const pages = new Map<string, Promise<{ items: CatalogItem[] }>>();

    for (const spec of specs) {
      const category = catalogCategory(categories, spec.category);
      if (!category) continue;
      const cacheKey = `${category.id}:${spec.query ?? ''}`;
      let page = pages.get(cacheKey);
      if (!page) {
        page = this.catalog.listItems({
          region: stagingRegion,
          locale: stagingLocale,
          categoryId: category.id,
          q: spec.query,
          page: 1,
          pageSize: 100,
        });
        pages.set(cacheKey, page);
      }
      const { items } = await page;
      const item = items.find(
        (candidate) =>
          !usedItems.has(candidate.id) &&
          candidate.name.trim().length > 0 &&
          (!spec.itemCategory || candidate.category === spec.itemCategory),
      );
      if (!item) continue;
      usedItems.add(item.id);
      result[spec.slot] = item;
    }
    return result;
  }

  private counts(before: Workspace, after: Workspace) {
    return {
      characters: after.characters.length - before.characters.length,
      characterGear:
        after.characters.reduce((total, character) => total + character.gear.length, 0) -
        before.characters.reduce((total, character) => total + character.gear.length, 0),
      gear: after.gear.length - before.gear.length,
      recipes: after.recipes.length - before.recipes.length,
      quotes: after.quotes.length - before.quotes.length,
      inventory: after.inventory.length - before.inventory.length,
      plans: after.personalPlans.length - before.personalPlans.length,
      sessions: after.sessions.length - before.sessions.length,
      presets: after.presets.length - before.presets.length,
      projects: after.projects.length - before.projects.length,
      buffs: after.buffs.length - before.buffs.length,
      familyPets:
        (after.families?.[stagingRegion]?.pets.length ?? 0) -
        (before.families?.[stagingRegion]?.pets.length ?? 0),
      familyMounts:
        (after.families?.[stagingRegion]?.mounts.length ?? 0) -
        (before.families?.[stagingRegion]?.mounts.length ?? 0),
    };
  }
}
