import { characterSchema, familyProfileSchema } from '@bdo/calculators';
import { emptyWorkspace, workspaceSchema } from '@bdo/calculators/workspace';
import { authUsers, userWorkspaces } from '@bdo/database/schema';
import { REGION_CODES, stagingTestCharacter, stagingTestFamily } from '@bdo/shared';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class TestWorkspaceSeeder {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  async seed(firebaseUid: string) {
    if (this.config.get<string>('APP_ENV') !== 'staging')
      throw new ForbiddenException(
        'O perfil sintético pode ser criado somente no ambiente staging.',
      );

    const configuredUid = this.config.get<string>('STAGING_TEST_FIREBASE_UID');
    if (!configuredUid || firebaseUid !== configuredUid)
      throw new ForbiddenException('Informe a UID de teste configurada para o staging.');

    return this.database.db.transaction(async (transaction) => {
      const [user] = await transaction
        .select({ id: authUsers.id })
        .from(authUsers)
        .where(eq(authUsers.firebaseUid, configuredUid))
        .limit(1);
      if (!user)
        throw new NotFoundException(
          'A conta de staging ainda não existe. Entre uma vez com Google ou Steam e tente novamente.',
        );

      await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${user.id},0))`);
      const [row] = await transaction
        .select({ version: userWorkspaces.version, data: userWorkspaces.data })
        .from(userWorkspaces)
        .where(eq(userWorkspaces.userId, user.id))
        .limit(1);

      const existing = workspaceSchema.parse(row?.data ?? emptyWorkspace());
      const fixtureCharacter = characterSchema.parse(stagingTestCharacter);
      const fixtureFamily = familyProfileSchema.parse(stagingTestFamily);
      const fixtureRegion = REGION_CODES.find((region) => region === fixtureCharacter.region);
      if (!fixtureRegion) throw new Error('A região do personagem de teste não é suportada.');
      const hasCharacter = existing.characters.some(
        (character) => character.id === fixtureCharacter.id,
      );
      if (!hasCharacter && existing.characters.length >= 30)
        throw new ConflictException('O workspace já atingiu o limite de personagens.');
      const hasFamily = Boolean(existing.families?.[fixtureRegion]);
      const activeCharacterId = existing.activeCharacterId ?? fixtureCharacter.id;

      if (hasCharacter && hasFamily && existing.activeCharacterId === activeCharacterId)
        return { seeded: false, version: row?.version ?? 0 };

      const merged = workspaceSchema.parse({
        ...existing,
        activeCharacterId,
        characters: hasCharacter ? existing.characters : [...existing.characters, fixtureCharacter],
        families: hasFamily
          ? existing.families
          : { ...existing.families, [fixtureRegion]: fixtureFamily },
      });
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

      return { seeded: true, version };
    });
  }
}
