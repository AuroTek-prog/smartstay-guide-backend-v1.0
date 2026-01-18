type EnvCheck = {
  ok: boolean;
  message: string;
};

function requireEnv(name: string): EnvCheck {
  if (!process.env[name]) {
    return { ok: false, message: `${name} is required` };
  }
  return { ok: true, message: '' };
}

function requireFirebaseCreds(): EnvCheck {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return { ok: true, message: '' };
  }

  const hasInlineCreds =
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY;

  if (!hasInlineCreds) {
    return {
      ok: false,
      message:
        'Firebase enabled but missing FIREBASE_SERVICE_ACCOUNT_PATH or inline credentials',
    };
  }

  return { ok: true, message: '' };
}

export function validateEnv(): void {
  const errors: string[] = [];
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';

  const baseChecks = [requireEnv('DATABASE_URL')];
  baseChecks.forEach((check) => {
    if (!check.ok) {
      errors.push(check.message);
    }
  });

  const firebaseEnabled = process.env.FIREBASE_ENABLED === 'true';
  if (isProd && !firebaseEnabled) {
    errors.push('FIREBASE_ENABLED must be true in production');
  }
  if (firebaseEnabled) {
    const firebaseCheck = requireFirebaseCreds();
    if (!firebaseCheck.ok) {
      errors.push(firebaseCheck.message);
    }
  }
  if (isProd && process.env.DEV_BYPASS_TOKEN) {
    errors.push('DEV_BYPASS_TOKEN must not be set in production');
  }

  const stripeEnabled = process.env.STRIPE_ENABLED === 'true';
  if (stripeEnabled) {
    if (!process.env.STRIPE_SECRET_KEY) {
      errors.push('STRIPE_SECRET_KEY is required when STRIPE_ENABLED=true');
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      errors.push('STRIPE_WEBHOOK_SECRET is required when STRIPE_ENABLED=true');
    }
  }

  if (errors.length > 0) {
    const message =
      'Invalid environment configuration:\n' +
      errors.map((error) => `- ${error}`).join('\n');
    throw new Error(message);
  }
}
