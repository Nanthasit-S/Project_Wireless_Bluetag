import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return String(value).trim();
}

export class AppConfig {
  public readonly port = Number(process.env.PORT || 8000);
  public readonly pgHost = requireEnv('PGHOST');
  public readonly pgPort = Number(process.env.PGPORT || 5432);
  public readonly pgUser = requireEnv('PGUSER');
  public readonly pgPassword = requireEnv('PGPASSWORD');
  public readonly pgDatabase = requireEnv('PGDATABASE');
  public readonly pgSslMode = process.env.PGSSLMODE === 'require' ? 'require' : 'disable';
  public readonly jwtSecret = requireEnv('JWT_SECRET');
  public readonly jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  public readonly tagWriteMinIntervalMs = Number(process.env.TAG_WRITE_MIN_INTERVAL_MS || 15000);
  public readonly tagMoveMinMeters = Number(process.env.TAG_MOVE_MIN_METERS || 30);
  public readonly tagsCacheTtlMs = Number(process.env.TAGS_CACHE_TTL_MS || 5000);
  public readonly tagsListLimit = Number(process.env.TAGS_LIST_LIMIT || 300);
  public readonly tagRetentionDays = Number(process.env.TAG_RETENTION_DAYS || 30);
  public readonly tagCleanupIntervalMs = Number(process.env.TAG_CLEANUP_INTERVAL_MS || 3600000);
}
