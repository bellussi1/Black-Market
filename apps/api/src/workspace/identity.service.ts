import { authIdentities, authUsers } from '@bdo/database/schema';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import { FirebaseAuthService } from './firebase-auth.service';

type VerifiedIdentity = { firebaseUid: string; ownerId: string };

export function assertGoogleLinkAvailable(
  ownerId: string,
  googleOwnerId: string | undefined,
  currentGoogleSubject: string | undefined,
  googleSubject: string,
): 'attach' | 'already-linked' {
  if (googleOwnerId && googleOwnerId !== ownerId)
    throw new ConflictException('Esta conta Google já está vinculada a outra conta.');
  if (currentGoogleSubject && currentGoogleSubject !== googleSubject)
    throw new ConflictException('Outra conta Google já está vinculada a este usuário.');
  return googleOwnerId ? 'already-linked' : 'attach';
}

@Injectable()
export class IdentityService {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
    private readonly firebase: FirebaseAuthService,
  ) {}

  publicConfig() {
    const enabled = this.firebase.enabled;
    return {
      enabled,
      googleEnabled: enabled,
      steamEnabled: enabled && Boolean(this.config.get<string>('STEAM_OPENID_CALLBACK_URL')),
      apiKey: enabled ? this.config.get<string>('FIREBASE_API_KEY') : null,
      authDomain: enabled ? this.config.get<string>('FIREBASE_AUTH_DOMAIN') : null,
      projectId: enabled ? this.config.get<string>('FIREBASE_PROJECT_ID') : null,
      appId: enabled ? this.config.get<string>('FIREBASE_APP_ID') : null,
    };
  }

  async owner(authorization: string | undefined): Promise<string> {
    return (await this.verifiedIdentity(authorization)).ownerId;
  }

  async firebaseUid(authorization: string | undefined): Promise<string> {
    return (await this.verifiedIdentity(authorization)).firebaseUid;
  }

  async linkGoogle(authorization: string | undefined): Promise<{ linked: true }> {
    const current = await this.verifiedIdentity(authorization);
    const providerUser = await this.firebase.getUser(current.firebaseUid);
    const googleIdentity = providerUser.providerData.find(
      (provider) => provider.providerId === 'google.com' && provider.uid,
    );
    if (!googleIdentity)
      throw new UnauthorizedException('Conclua a autenticação Google antes de vincular a conta.');

    return this.database.db.transaction(async (transaction) => {
      const [identityForGoogleSubject] = await transaction
        .select()
        .from(authIdentities)
        .where(
          and(
            eq(authIdentities.provider, 'google'),
            eq(authIdentities.subject, googleIdentity.uid),
          ),
        )
        .limit(1);
      const [identityForUser] = await transaction
        .select()
        .from(authIdentities)
        .where(
          and(eq(authIdentities.userId, current.ownerId), eq(authIdentities.provider, 'google')),
        )
        .limit(1);
      const action = assertGoogleLinkAvailable(
        current.ownerId,
        identityForGoogleSubject?.userId,
        identityForUser?.subject,
        googleIdentity.uid,
      );

      if (action === 'attach')
        await transaction
          .insert(authIdentities)
          .values({ userId: current.ownerId, provider: 'google', subject: googleIdentity.uid })
          .onConflictDoNothing();

      const [linked] = await transaction
        .select()
        .from(authIdentities)
        .where(
          and(
            eq(authIdentities.provider, 'google'),
            eq(authIdentities.subject, googleIdentity.uid),
          ),
        )
        .limit(1);
      if (!linked || linked.userId !== current.ownerId)
        throw new ConflictException('Esta conta Google já está vinculada a outra conta.');
      return { linked: true };
    });
  }

  async me(authorization: string | undefined) {
    const identity = await this.verifiedIdentity(authorization);
    const [user, linkedIdentities] = await Promise.all([
      this.firebase.getUser(identity.firebaseUid),
      this.database.db
        .select({ provider: authIdentities.provider })
        .from(authIdentities)
        .where(eq(authIdentities.userId, identity.ownerId))
        .limit(2),
    ]);
    return {
      authenticated: true,
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      providers: [...new Set(linkedIdentities.map((row) => row.provider))],
      canManageRoadmap: this.roadmapAdminUids().has(identity.firebaseUid),
    };
  }

  async roadmapAdmin(authorization: string | undefined): Promise<string> {
    const identity = await this.verifiedIdentity(authorization);
    if (!this.roadmapAdminUids().has(identity.firebaseUid))
      throw new ForbiddenException('Você não tem permissão para editar o Roadmap.');
    return identity.ownerId;
  }

  private async verifiedIdentity(authorization: string | undefined): Promise<VerifiedIdentity> {
    if (!this.firebase.enabled)
      throw new ServiceUnavailableException('A sincronização ainda não está disponível.');
    if (!authorization?.startsWith('Bearer ') || authorization.length > 8192)
      throw new UnauthorizedException('Entre na sua conta para continuar.');

    try {
      const decoded = await this.firebase.verifyIdToken(authorization.slice(7));
      if (!decoded.uid || decoded.uid.length > 128) throw new Error('Invalid Firebase UID');
      const signInProvider = decoded.firebase?.sign_in_provider;

      if (signInProvider === 'google.com') {
        const providerUser = await this.firebase.getUser(decoded.uid);
        const googleIdentity = providerUser.providerData.find(
          (provider) => provider.providerId === 'google.com' && provider.uid,
        );
        if (!googleIdentity) throw new Error('Missing verified Google identity');
        const ownerId = await this.provisionGoogleIdentity(decoded.uid, googleIdentity.uid);
        return { firebaseUid: decoded.uid, ownerId };
      }

      if (signInProvider === 'custom') {
        const [user] = await this.database.db
          .select()
          .from(authUsers)
          .where(eq(authUsers.firebaseUid, decoded.uid))
          .limit(1);
        if (!user) throw new Error('Unknown Firebase custom-token UID');
        const [steamIdentity] = await this.database.db
          .select()
          .from(authIdentities)
          .where(and(eq(authIdentities.userId, user.id), eq(authIdentities.provider, 'steam')))
          .limit(1);
        if (!steamIdentity) throw new Error('Custom-token UID has no Steam identity');
        return { firebaseUid: decoded.uid, ownerId: user.id };
      }

      throw new Error('Unsupported Firebase sign-in provider');
    } catch {
      throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    }
  }

  private async provisionGoogleIdentity(firebaseUid: string, googleSubject: string) {
    return this.database.db.transaction(async (transaction) => {
      const [currentUser] = await transaction
        .select()
        .from(authUsers)
        .where(eq(authUsers.firebaseUid, firebaseUid))
        .limit(1);
      if (!currentUser)
        await transaction.insert(authUsers).values({ firebaseUid }).onConflictDoNothing();

      const [user] = await transaction
        .select()
        .from(authUsers)
        .where(eq(authUsers.firebaseUid, firebaseUid))
        .limit(1);
      if (!user) throw new UnauthorizedException('Não foi possível criar sua conta.');

      const [identityForGoogleSubject] = await transaction
        .select()
        .from(authIdentities)
        .where(
          and(eq(authIdentities.provider, 'google'), eq(authIdentities.subject, googleSubject)),
        )
        .limit(1);
      if (identityForGoogleSubject && identityForGoogleSubject.userId !== user.id)
        throw new ConflictException('Esta conta Google já está vinculada a outra conta.');

      const [identityForUser] = await transaction
        .select()
        .from(authIdentities)
        .where(and(eq(authIdentities.userId, user.id), eq(authIdentities.provider, 'google')))
        .limit(1);
      if (identityForUser && identityForUser.subject !== googleSubject)
        throw new ConflictException('Outra conta Google já está vinculada a este usuário.');

      if (!identityForGoogleSubject)
        await transaction
          .insert(authIdentities)
          .values({ userId: user.id, provider: 'google', subject: googleSubject })
          .onConflictDoNothing();

      const [linkedIdentity] = await transaction
        .select()
        .from(authIdentities)
        .where(and(eq(authIdentities.userId, user.id), eq(authIdentities.provider, 'google')))
        .limit(1);
      if (!linkedIdentity || linkedIdentity.subject !== googleSubject)
        throw new ConflictException('Esta conta Google já está vinculada a outra conta.');
      return user.id;
    });
  }

  private roadmapAdminUids() {
    return new Set(
      (this.config.get<string>('ROADMAP_ADMIN_FIREBASE_UIDS') ?? '')
        .split(',')
        .map((uid) => uid.trim())
        .filter(Boolean),
    );
  }
}
