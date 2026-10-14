import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { type Auth, type DecodedIdToken, getAuth, type UserRecord } from 'firebase-admin/auth';

const FIREBASE_ADMIN_APP_NAME = 'black-market-auth';

@Injectable()
export class FirebaseAuthService {
  private auth: Auth | null = null;

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(
      this.config.get<string>('FIREBASE_PROJECT_ID') &&
      this.config.get<string>('FIREBASE_AUTH_DOMAIN') &&
      this.config.get<string>('FIREBASE_API_KEY') &&
      this.config.get<string>('FIREBASE_APP_ID') &&
      this.config.get<string>('FIREBASE_ADMIN_CREDENTIALS_BASE64'),
    );
  }

  async verifyIdToken(token: string): Promise<DecodedIdToken> {
    return this.adminAuth().verifyIdToken(token, true);
  }

  async getUser(uid: string): Promise<UserRecord> {
    return this.adminAuth().getUser(uid);
  }

  async createCustomToken(uid: string): Promise<string> {
    if (!uid || uid.length > 128) throw new Error('Firebase UID inválido.');
    return this.adminAuth().createCustomToken(uid);
  }

  private adminAuth(): Auth {
    if (this.auth) return this.auth;
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const encodedCredentials = this.config.get<string>('FIREBASE_ADMIN_CREDENTIALS_BASE64');
    if (!this.enabled || !projectId || !encodedCredentials)
      throw new ServiceUnavailableException('A autenticação ainda não está disponível.');

    let serviceAccount: ServiceAccount & { project_id?: string };
    try {
      serviceAccount = JSON.parse(
        Buffer.from(encodedCredentials, 'base64').toString('utf8'),
      ) as ServiceAccount & { project_id?: string };
    } catch {
      throw new ServiceUnavailableException('A autenticação ainda não está disponível.');
    }
    if (serviceAccount.project_id !== projectId)
      throw new ServiceUnavailableException('A autenticação ainda não está disponível.');

    const existingApp = getApps().find((app) => app.name === FIREBASE_ADMIN_APP_NAME);
    if (existingApp && existingApp.options.projectId !== projectId)
      throw new ServiceUnavailableException('A autenticação ainda não está disponível.');
    const app =
      existingApp ??
      initializeApp({ credential: cert(serviceAccount), projectId }, FIREBASE_ADMIN_APP_NAME);
    this.auth = getAuth(app);
    return this.auth;
  }
}
