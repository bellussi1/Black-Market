import { schema, tutorialGuides, tutorialGuideSteps } from '@bdo/database';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

describe('tutorial persistence schema', () => {
  it('models unique screen and locale and the tutorial step cascade/order constraints', () => {
    expect(schema.tutorialGuides).toBe(tutorialGuides);
    expect(schema.tutorialGuideSteps).toBe(tutorialGuideSteps);

    const guidesConfig = getTableConfig(tutorialGuides);
    expect(guidesConfig.name).toBe('tutorial_guides');
    expect(guidesConfig.columns.find((col) => col.name === 'locale')?.getSQLType()).toBe(
      'varchar(16)',
    );
    expect(guidesConfig.columns.map((col) => col.name)).toEqual([
      'id',
      'screen_key',
      'locale',
      'enabled',
      'updated_at',
    ]);
    expect(guidesConfig.indexes.map((idx) => idx.config.name)).toContain(
      'tutorial_guides_screen_locale_uidx',
    );
    const screenLocaleIdx = guidesConfig.indexes.find(
      (idx) => idx.config.name === 'tutorial_guides_screen_locale_uidx',
    );
    expect(screenLocaleIdx?.config.unique).toBe(true);

    const stepsConfig = getTableConfig(tutorialGuideSteps);
    expect(stepsConfig.name).toBe('tutorial_guide_steps');
    expect(stepsConfig.columns.map((col) => col.name)).toEqual([
      'id',
      'guide_id',
      'sort_order',
      'anchor_key',
      'title',
      'body',
    ]);
    const anchorCol = stepsConfig.columns.find((col) => col.name === 'anchor_key');
    expect(anchorCol?.notNull).toBe(false);
    expect(anchorCol?.getSQLType()).toBe('varchar(120)');
    expect(stepsConfig.columns.find((col) => col.name === 'body')?.getSQLType()).toBe(
      'varchar(360)',
    );

    const stepOrderIdx = stepsConfig.indexes.find(
      (idx) => idx.config.name === 'tutorial_guide_steps_guide_order_uidx',
    );
    expect(stepOrderIdx?.config.unique).toBe(true);

    expect(stepsConfig.foreignKeys).toHaveLength(1);
    expect(stepsConfig.foreignKeys[0]?.onDelete).toBe('cascade');
    expect(stepsConfig.checks.map((chk) => chk.name)).toContain('tutorial_guide_steps_order_check');
  });
});
