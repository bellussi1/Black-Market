import { schema, tutorialGuides, tutorialGuideSteps } from '@bdo/database/schema';
import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

describe('Tutorial persistence schema', () => {
  it('models unique screen and locale and the tutorial step cascade/order constraints', () => {
    expect(tutorialGuides).toBeDefined();
    expect(tutorialGuideSteps).toBeDefined();
    expect(schema.tutorialGuides).toBe(tutorialGuides);
    expect(schema.tutorialGuideSteps).toBe(tutorialGuideSteps);

    const guides = getTableConfig(tutorialGuides);
    const steps = getTableConfig(tutorialGuideSteps);
    expect(guides.name).toBe('tutorial_guides');
    expect(guides.columns.map(({ name }) => name)).toEqual([
      'id',
      'screen_key',
      'locale',
      'enabled',
      'updated_at',
    ]);
    expect(tutorialGuides.id).toMatchObject({
      primary: true,
      columnType: 'PgUUID',
      hasDefault: true,
    });
    expect(tutorialGuides.enabled).toMatchObject({ notNull: true });
    expect(tutorialGuides.updatedAt).toMatchObject({ notNull: true, hasDefault: true });
    expect(guides.columns.every(({ notNull }) => notNull)).toBe(true);
    expect(
      guides.indexes.map(({ config }) => ({
        unique: config.unique,
        columns: config.columns.map((column) => ('name' in column ? column.name : null)),
      })),
    ).toEqual([{ unique: true, columns: ['screen_key', 'locale'] }]);

    expect(steps.name).toBe('tutorial_guide_steps');
    expect(steps.columns.map(({ name }) => name)).toEqual([
      'id',
      'guide_id',
      'sort_order',
      'anchor_key',
      'title',
      'body',
    ]);
    expect(tutorialGuideSteps.id).toMatchObject({
      primary: true,
      columnType: 'PgUUID',
      hasDefault: true,
    });
    expect(tutorialGuideSteps.anchorKey.notNull).toBe(false);
    expect(
      steps.columns.filter(({ name }) => name !== 'anchor_key').every(({ notNull }) => notNull),
    ).toBe(true);
    expect(
      steps.indexes.map(({ config }) => ({
        unique: config.unique,
        columns: config.columns.map((column) => ('name' in column ? column.name : null)),
      })),
    ).toEqual([{ unique: true, columns: ['guide_id', 'sort_order'] }]);
    expect(steps.foreignKeys).toHaveLength(1);
    const foreignKey = steps.foreignKeys[0];
    expect(foreignKey.onDelete).toBe('cascade');
    expect(foreignKey.reference()).toMatchObject({
      columns: [tutorialGuideSteps.guideId],
      foreignTable: tutorialGuides,
      foreignColumns: [tutorialGuides.id],
    });
    expect(steps.checks).toHaveLength(1);
    expect(new PgDialect().sqlToQuery(steps.checks[0].value).sql).toBe(
      '"tutorial_guide_steps"."sort_order" >= 0',
    );
    expect(guides.checks).toHaveLength(0);
  });
});
