import { workspaceSchema } from '@bdo/calculators/workspace';
import { userWorkspaces } from '@bdo/database/schema';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class WorkspaceService {
  constructor(private readonly database: DatabaseService) {}
  async get(owner: string) {
    const [row] = await this.database.db
      .select()
      .from(userWorkspaces)
      .where(eq(userWorkspaces.userId, owner))
      .limit(1);
    return row
      ? { version: row.version, updatedAt: row.updatedAt, data: row.data }
      : { version: 0, updatedAt: null, data: null };
  }
  async save(owner: string, input: unknown) {
    const parsed = z
      .object({ expectedVersion: z.number().int().min(0).max(2147483646), data: workspaceSchema })
      .safeParse(input);
    if (!parsed.success) throw new BadRequestException('Confira os dados antes de sincronizar.');
    return this.database.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${owner},0))`);
      const [held] = await tx
        .select()
        .from(userWorkspaces)
        .where(eq(userWorkspaces.userId, owner))
        .limit(1);
      if ((held?.version ?? 0) !== parsed.data.expectedVersion)
        throw new ConflictException(
          'Seus dados foram alterados em outro dispositivo. Carregue a versão atual e revise antes de salvar.',
        );
      const version = parsed.data.expectedVersion + 1;
      const updatedAt = new Date();
      await tx
        .insert(userWorkspaces)
        .values({ userId: owner, version, updatedAt, data: parsed.data.data })
        .onConflictDoUpdate({
          target: userWorkspaces.userId,
          set: { version, updatedAt, data: parsed.data.data },
        });
      return { version, updatedAt };
    });
  }
  async remove(owner: string) {
    return this.database.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${owner},0))`);
      const [held] = await tx
        .select({ version: userWorkspaces.version })
        .from(userWorkspaces)
        .where(eq(userWorkspaces.userId, owner))
        .limit(1);
      if (!held) return { deleted: true, version: 0 };
      const version = held.version + 1;
      // Remove personal contents while retaining the revision to reject stale devices.
      await tx
        .update(userWorkspaces)
        .set({ data: null, version, updatedAt: new Date() })
        .where(eq(userWorkspaces.userId, owner));
      return { deleted: true, version };
    });
  }
}
