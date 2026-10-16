import {
  authIdentities,
  authUsers,
  steamAuthAttempts,
  steamAuthExchanges,
} from '@bdo/database/schema';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';

export const STEAM_AUTH_STORE = Symbol('STEAM_AUTH_STORE');

export type SteamAuthAttempt = {
  stateHash: string;
  codeChallenge: string | null;
  firebaseUid: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
};

export type SteamAuthExchange = {
  codeHash: string;
  codeChallenge: string;
  firebaseUid: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

export interface SteamAuthStore {
  createAttempt(attempt: Omit<SteamAuthAttempt, 'consumedAt'>): Promise<void>;
  findAttempt(stateHash: string): Promise<SteamAuthAttempt | null>;
  consumeAttempt(stateHash: string, now: Date): Promise<boolean>;
  loginSteam(steamId: string): Promise<string>;
  linkSteam(firebaseUid: string, steamId: string): Promise<void>;
  createExchange(exchange: Omit<SteamAuthExchange, 'consumedAt'>): Promise<void>;
  findExchange(codeHash: string, now: Date): Promise<SteamAuthExchange | null>;
  consumeExchange(codeHash: string, now: Date): Promise<boolean>;
}

export function assertSteamLinkAvailable(
  ownerId: string,
  steamOwnerId: string | undefined,
  currentSteamSubject: string | undefined,
  steamId: string,
): 'attach' | 'already-linked' {
  if (steamOwnerId && steamOwnerId !== ownerId)
    throw new ConflictException('Esta conta Steam já está vinculada a outra conta.');
  if (currentSteamSubject && currentSteamSubject !== steamId)
    throw new ConflictException('Outra conta Steam já está vinculada a este usuário.');
  return steamOwnerId ? 'already-linked' : 'attach';
}

@Injectable()
export class DatabaseSteamAuthStore implements SteamAuthStore {
  constructor(private readonly database: DatabaseService) {}

  async createAttempt(attempt: Omit<SteamAuthAttempt, 'consumedAt'>): Promise<void> {
    await this.database.db
      .delete(steamAuthAttempts)
      .where(lt(steamAuthAttempts.expiresAt, new Date()));
    await this.database.db.insert(steamAuthAttempts).values(attempt);
  }

  async findAttempt(stateHash: string): Promise<SteamAuthAttempt | null> {
    const [attempt] = await this.database.db
      .select()
      .from(steamAuthAttempts)
      .where(eq(steamAuthAttempts.stateHash, stateHash))
      .limit(1);
    return attempt ?? null;
  }

  async consumeAttempt(stateHash: string, now: Date): Promise<boolean> {
    const [attempt] = await this.database.db
      .update(steamAuthAttempts)
      .set({ consumedAt: now })
      .where(
        and(
          eq(steamAuthAttempts.stateHash, stateHash),
          isNull(steamAuthAttempts.consumedAt),
          gt(steamAuthAttempts.expiresAt, now),
        ),
      )
      .returning({ stateHash: steamAuthAttempts.stateHash });
    return Boolean(attempt);
  }

  async loginSteam(steamId: string): Promise<string> {
    return this.database.db.transaction(async (transaction) => {
      await transaction.execute(sql`select set_config('app.identity_provider', 'steam', true)`);
      await transaction.execute(sql`select set_config('app.identity_subject', ${steamId}, true)`);
      const [linked] = await transaction
        .select()
        .from(authIdentities)
        .where(and(eq(authIdentities.provider, 'steam'), eq(authIdentities.subject, steamId)))
        .limit(1);
      if (linked) {
        await transaction.execute(sql`select set_config('app.user_id', ${linked.userId}, true)`);
        const [user] = await transaction
          .select()
          .from(authUsers)
          .where(eq(authUsers.id, linked.userId))
          .limit(1);
        if (user) return user.firebaseUid;
        throw new UnauthorizedException('Não foi possível recuperar a conta Steam.');
      }

      const firebaseUid = `steam:${steamId}`;
      await transaction.execute(sql`select set_config('app.firebase_uid', ${firebaseUid}, true)`);
      await transaction.insert(authUsers).values({ firebaseUid }).onConflictDoNothing();
      const [user] = await transaction
        .select()
        .from(authUsers)
        .where(eq(authUsers.firebaseUid, firebaseUid))
        .limit(1);
      if (!user) throw new UnauthorizedException('Não foi possível criar a conta Steam.');
      await transaction.execute(sql`select set_config('app.user_id', ${user.id}, true)`);

      const [currentSteam] = await transaction
        .select()
        .from(authIdentities)
        .where(and(eq(authIdentities.userId, user.id), eq(authIdentities.provider, 'steam')))
        .limit(1);
      assertSteamLinkAvailable(user.id, undefined, currentSteam?.subject, steamId);
      await transaction
        .insert(authIdentities)
        .values({ userId: user.id, provider: 'steam', subject: steamId })
        .onConflictDoNothing();

      const [identity] = await transaction
        .select()
        .from(authIdentities)
        .where(and(eq(authIdentities.provider, 'steam'), eq(authIdentities.subject, steamId)))
        .limit(1);
      if (!identity || identity.userId !== user.id)
        throw new ConflictException('Esta conta Steam já está vinculada a outra conta.');
      return user.firebaseUid;
    });
  }

  async linkSteam(firebaseUid: string, steamId: string): Promise<void> {
    await this.database.db.transaction(async (transaction) => {
      await transaction.execute(sql`select set_config('app.firebase_uid', ${firebaseUid}, true)`);
      const [user] = await transaction
        .select()
        .from(authUsers)
        .where(eq(authUsers.firebaseUid, firebaseUid))
        .limit(1);
      if (!user) throw new UnauthorizedException('Entre na sua conta para vincular a Steam.');
      await transaction.execute(sql`select set_config('app.user_id', ${user.id}, true)`);
      await transaction.execute(sql`select set_config('app.identity_provider', 'steam', true)`);
      await transaction.execute(sql`select set_config('app.identity_subject', ${steamId}, true)`);

      const [steamIdentity] = await transaction
        .select()
        .from(authIdentities)
        .where(and(eq(authIdentities.provider, 'steam'), eq(authIdentities.subject, steamId)))
        .limit(1);
      const [userSteam] = await transaction
        .select()
        .from(authIdentities)
        .where(and(eq(authIdentities.userId, user.id), eq(authIdentities.provider, 'steam')))
        .limit(1);

      const action = assertSteamLinkAvailable(
        user.id,
        steamIdentity?.userId,
        userSteam?.subject,
        steamId,
      );
      if (action === 'already-linked') return;
      await transaction
        .insert(authIdentities)
        .values({ userId: user.id, provider: 'steam', subject: steamId })
        .onConflictDoNothing();

      const [linked] = await transaction
        .select()
        .from(authIdentities)
        .where(and(eq(authIdentities.provider, 'steam'), eq(authIdentities.subject, steamId)))
        .limit(1);
      if (!linked || linked.userId !== user.id)
        throw new ConflictException('Esta conta Steam já está vinculada a outra conta.');
    });
  }

  async createExchange(exchange: Omit<SteamAuthExchange, 'consumedAt'>): Promise<void> {
    await this.database.db
      .delete(steamAuthExchanges)
      .where(lt(steamAuthExchanges.expiresAt, new Date()));
    await this.database.db.insert(steamAuthExchanges).values(exchange);
  }

  async findExchange(codeHash: string, now: Date): Promise<SteamAuthExchange | null> {
    const [exchange] = await this.database.db
      .select()
      .from(steamAuthExchanges)
      .where(
        and(
          eq(steamAuthExchanges.codeHash, codeHash),
          isNull(steamAuthExchanges.consumedAt),
          gt(steamAuthExchanges.expiresAt, now),
        ),
      )
      .limit(1);
    return exchange ?? null;
  }

  async consumeExchange(codeHash: string, now: Date): Promise<boolean> {
    const [exchange] = await this.database.db
      .update(steamAuthExchanges)
      .set({ consumedAt: now })
      .where(
        and(
          eq(steamAuthExchanges.codeHash, codeHash),
          isNull(steamAuthExchanges.consumedAt),
          gt(steamAuthExchanges.expiresAt, now),
        ),
      )
      .returning({ codeHash: steamAuthExchanges.codeHash });
    return Boolean(exchange);
  }
}
