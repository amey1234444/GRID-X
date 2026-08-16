export interface AppConfig {
  port: number;
  globalPrefix: string;
  corsOrigins: string[];
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  sessionIdleTimeoutMinutes: number;
  otpTtlMinutes: number;
  storage: {
    driver: 'local' | 's3';
    localDir: string;
    signedUrlTtlSeconds: number;
    s3: {
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      forcePathStyle: boolean;
    };
  };
  notifications: {
    emailEnabled: boolean;
    smtp: {
      host?: string;
      port: number;
      user?: string;
      password?: string;
      from: string;
    };
    whatsappEnabled: boolean;
    whatsapp: {
      apiUrl?: string;
      apiToken?: string;
    };
  };
  ims: {
    enabled: boolean;
    baseUrl?: string;
    apiKey?: string;
    timeoutMs: number;
  };
  sentryDsn?: string;
  webAppUrl: string;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function configuration(): AppConfig {
  return {
    port: num(process.env.API_PORT, 4000),
    globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
      refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    },
    sessionIdleTimeoutMinutes: num(process.env.SESSION_IDLE_TIMEOUT_MINUTES, 60),
    otpTtlMinutes: num(process.env.OTP_TTL_MINUTES, 10),
    storage: {
      driver: (process.env.STORAGE_DRIVER as 'local' | 's3') ?? 'local',
      localDir: process.env.STORAGE_LOCAL_DIR ?? './storage',
      signedUrlTtlSeconds: num(process.env.STORAGE_SIGNED_URL_TTL_SECONDS, 300),
      s3: {
        endpoint: process.env.S3_ENDPOINT || undefined,
        region: process.env.S3_REGION ?? 'ap-south-1',
        bucket: process.env.S3_BUCKET ?? 'gridx',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || undefined,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || undefined,
        forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE, true),
      },
    },
    notifications: {
      emailEnabled: bool(process.env.NOTIFY_EMAIL_ENABLED, false),
      smtp: {
        host: process.env.SMTP_HOST || undefined,
        port: num(process.env.SMTP_PORT, 587),
        user: process.env.SMTP_USER || undefined,
        password: process.env.SMTP_PASSWORD || undefined,
        from: process.env.SMTP_FROM ?? 'GRID-X <no-reply@oswar.example>',
      },
      whatsappEnabled: bool(process.env.NOTIFY_WHATSAPP_ENABLED, false),
      whatsapp: {
        apiUrl: process.env.WHATSAPP_API_URL || undefined,
        apiToken: process.env.WHATSAPP_API_TOKEN || undefined,
      },
    },
    ims: {
      enabled: bool(process.env.IMS_ENABLED, false),
      baseUrl: process.env.IMS_BASE_URL || undefined,
      apiKey: process.env.IMS_API_KEY || undefined,
      timeoutMs: num(process.env.IMS_TIMEOUT_MS, 15000),
    },
    sentryDsn: process.env.SENTRY_DSN || undefined,
    webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:3000',
  };
}
