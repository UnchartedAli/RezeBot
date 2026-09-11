import { getPool } from '../pool';
import { LoggerProvider } from '../../core/logging';

const logger = LoggerProvider.get('Migration');

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  description?: string;
}

export const migrations: Migration[] = [
  {
    id: '001',
    name: 'init_schema',
    description: 'Initial database schema with core tables',
    up: `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        is_bot BOOLEAN NOT NULL DEFAULT FALSE,
        language_code TEXT,
        is_premium BOOLEAN,
        join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned', 'muted', 'quarantined', 'restricted')),
        risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
        warning_count INTEGER NOT NULL DEFAULT 0,
        warn_expiry TIMESTAMP WITH TIME ZONE,
        mute_expiry TIMESTAMP WITH TIME ZONE,
        ban_expiry TIMESTAMP WITH TIME ZONE,
        quarantine_expiry TIMESTAMP WITH TIME ZONE,
        total_warnings INTEGER NOT NULL DEFAULT 0,
        total_restricts INTEGER NOT NULL DEFAULT 0,
        total_actions INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Chats table
      CREATE TABLE IF NOT EXISTS chats (
        id BIGINT PRIMARY KEY,
        title TEXT,
        type TEXT NOT NULL CHECK (type IN ('private', 'group', 'supergroup', 'channel')),
        username TEXT,
        invite_link TEXT,
        description TEXT,
        settings JSONB,
        features JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Chat members (per-chat user state)
      CREATE TABLE IF NOT EXISTS chat_members (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'administrator', 'creator', 'moderator', 'trusted', 'member', 'restricted', 'user')),
        join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_quarantined BOOLEAN NOT NULL DEFAULT FALSE,
        quarantine_expiry TIMESTAMP WITH TIME ZONE,
        warning_count INTEGER NOT NULL DEFAULT 0,
        warn_expiry TIMESTAMP WITH TIME ZONE,
        mute_expiry TIMESTAMP WITH TIME ZONE,
        ban_expiry TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(chat_id, user_id)
      );

      -- Permissions matrix
      CREATE TABLE IF NOT EXISTS permissions (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        actions TEXT[] NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(chat_id, role)
      );

      -- Audit logs
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        actor_id BIGINT,
        chat_id BIGINT NOT NULL,
        target_id BIGINT,
        action TEXT NOT NULL,
        reason TEXT,
        source TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        result TEXT NOT NULL CHECK (result IN ('success', 'failed', 'blocked', 'error')),
        details JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_chat_id ON audit_logs(chat_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);

      -- Feature flags
      CREATE TABLE IF NOT EXISTS feature_flags (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT REFERENCES chats(id) ON DELETE CASCADE,
        user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        flag TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'requires_provider', 'requires_mtproto', 'unsupported')),
        scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'chat', 'user')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(flag, chat_id, user_id, scope) WHERE chat_id IS NOT NULL AND user_id IS NOT NULL,
        UNIQUE(flag, chat_id, user_id, scope) WHERE chat_id IS NOT NULL AND user_id IS NULL,
        UNIQUE(flag, chat_id, user_id, scope) WHERE chat_id IS NULL AND user_id IS NOT NULL,
        UNIQUE(flag, chat_id, user_id, scope) WHERE chat_id IS NULL AND user_id IS NULL
      );

      -- Moderation actions
      CREATE TABLE IF NOT EXISTS moderation_actions (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        target_id BIGINT NOT NULL REFERENCES users(id),
        actor_id BIGINT NOT NULL REFERENCES users(id),
        action_type TEXT NOT NULL CHECK (action_type IN ('ban', 'kick', 'mute', 'warn', 'delete', 'lock', 'unlock', 'quarantine', 'unquarantine')),
        reason TEXT,
        duration BIGINT,
        expires_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        source TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_moderation_actions_chat ON moderation_actions(chat_id);
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON moderation_actions(target_id);
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_active ON moderation_actions(is_active);

      -- Warnings
      CREATE TABLE IF NOT EXISTS warnings (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id),
        issuer_id BIGINT NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(user_id);
      CREATE INDEX IF NOT EXISTS idx_warnings_chat ON warnings(chat_id);

      -- Filters
      CREATE TABLE IF NOT EXISTS filters (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('keyword', 'regex', 'media', 'spam')),
        pattern TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('delete', 'warn', 'mute', 'ban', 'kick', 'quarantine')),
        duration BIGINT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by BIGINT REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_filters_chat ON filters(chat_id);
      CREATE INDEX IF NOT EXISTS idx_filters_pattern ON filters(pattern);

      -- FAQ entries
      CREATE TABLE IF NOT EXISTS faq_entries (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        keywords TEXT[],
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_faq_chat ON faq_entries(chat_id);
      CREATE INDEX IF NOT EXISTS idx_faq_keywords ON faq_entries USING GIN(keywords);

      -- Welcome settings
      CREATE TABLE IF NOT EXISTS welcome_settings (
        chat_id BIGINT PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        message TEXT,
        button_text TEXT,
        button_url TEXT,
        auto_delete BOOLEAN NOT NULL DEFAULT TRUE,
        delete_after INTEGER NOT NULL DEFAULT 60,
        require_username BOOLEAN NOT NULL DEFAULT FALSE,
        require_captcha BOOLEAN NOT NULL DEFAULT FALSE,
        captcha_type TEXT CHECK (captcha_type IN ('math', 'image', 'text')) DEFAULT 'math',
        welcome_channel_id BIGINT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Rules
      CREATE TABLE IF NOT EXISTS chat_rules (
        chat_id BIGINT PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        text TEXT,
        require_accept BOOLEAN NOT NULL DEFAULT FALSE,
        accepted_users BIGINT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Tickets
      CREATE TABLE IF NOT EXISTS tickets (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id),
        subject TEXT,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        assigned_to BIGINT REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        closed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(chat_id, user_id, 'open'),
        UNIQUE(chat_id, user_id, 'in_progress')
      );

      CREATE INDEX IF NOT EXISTS idx_tickets_chat ON tickets(chat_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

      -- Economy
      CREATE TABLE IF NOT EXISTS user_balances (
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        balance INTEGER NOT NULL DEFAULT 0,
        lifetime_earned INTEGER NOT NULL DEFAULT 0,
        daily_streak INTEGER NOT NULL DEFAULT 0,
        last_daily TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (user_id, chat_id)
      );

      CREATE TABLE IF NOT EXISTS economy_transactions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id),
        chat_id BIGINT NOT NULL REFERENCES chats(id),
        type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'transfer', 'daily', 'gift', 'admin')),
        amount INTEGER NOT NULL,
        balance_before INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        description TEXT,
        reference_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_economy_user ON economy_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_economy_chat ON economy_transactions(chat_id);

      -- Giveaways
      CREATE TABLE IF NOT EXISTS giveaways (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        creator_id BIGINT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        prize TEXT NOT NULL,
        winner_count INTEGER NOT NULL DEFAULT 1,
        duration BIGINT,
        ends_at TIMESTAMP WITH TIME ZONE,
        ended BOOLEAN NOT NULL DEFAULT FALSE,
        entries_count INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        required_action TEXT CHECK (required_action IN ('join', 'none', 'premium')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS giveaway_entries (
        id BIGSERIAL PRIMARY KEY,
        giveaway_id INTEGER NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id),
        entry_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(giveaway_id, user_id)
      );

      -- Scheduler jobs
      CREATE TABLE IF NOT EXISTS scheduled_jobs (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        payload JSONB,
        chat_id BIGINT REFERENCES chats(id),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_run TIMESTAMP WITH TIME ZONE,
        next_run TIMESTAMP WITH TIME ZONE,
        created_by BIGINT REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Analytics
      CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGSERIAL PRIMARY KEY,
        event_name TEXT NOT NULL,
        user_id BIGINT REFERENCES users(id),
        chat_id BIGINT REFERENCES chats(id),
        properties JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
      CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);

      -- Web sessions (for mini-app auth)
      CREATE TABLE IF NOT EXISTS web_sessions (
        id TEXT PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id),
        chat_id BIGINT,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_web_sessions_user ON web_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions(expires_at);

      -- Bot sessions (for grammY session middleware)
      CREATE TABLE IF NOT EXISTS bot_sessions (
        key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_bot_sessions_expires ON bot_sessions(expires_at);

      -- Migration version tracking
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        applied_by TEXT
      );
    `,
    down: `
      DROP TABLE IF EXISTS migrations CASCADE;
      DROP TABLE IF EXISTS web_sessions CASCADE;
      DROP TABLE IF EXISTS analytics_events CASCADE;
      DROP TABLE IF EXISTS scheduled_jobs CASCADE;
      DROP TABLE IF EXISTS giveaway_entries CASCADE;
      DROP TABLE IF EXISTS giveaways CASCADE;
      DROP TABLE IF EXISTS economy_transactions CASCADE;
      DROP TABLE IF EXISTS user_balances CASCADE;
      DROP TABLE IF EXISTS chat_rules CASCADE;
      DROP TABLE IF EXISTS welcome_settings CASCADE;
      DROP TABLE IF EXISTS faq_entries CASCADE;
      DROP TABLE IF EXISTS filters CASCADE;
      DROP TABLE IF EXISTS warnings CASCADE;
      DROP TABLE IF EXISTS moderation_actions CASCADE;
      DROP TABLE IF EXISTS feature_flags CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS permissions CASCADE;
      DROP TABLE IF EXISTS chat_members CASCADE;
      DROP TABLE IF EXISTS chats CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `,
  },
  {
    id: '002',
    name: 'add_indexes',
    description: 'Add additional indexes for performance',
    up: `
      CREATE INDEX IF NOT EXISTS idx_audit_logs_chat_action ON audit_logs(chat_id, action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_chat ON audit_logs(actor_id, chat_id);
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_chat_target ON moderation_actions(chat_id, target_id);
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_expires ON moderation_actions(expires_at) WHERE is_active = TRUE;
      CREATE INDEX IF NOT EXISTS idx_warnings_chat_user ON warnings(chat_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_filters_chat_active ON filters(chat_id) WHERE is_active = TRUE;
      CREATE INDEX IF NOT EXISTS idx_faq_chat_active ON faq_entries(chat_id) WHERE is_active = TRUE;
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_users_risk ON users(risk_score);
      CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC);
    `,
    down: `
      DROP INDEX IF EXISTS idx_audit_logs_chat_action;
      DROP INDEX IF EXISTS idx_audit_logs_actor_chat;
      DROP INDEX IF EXISTS idx_moderation_actions_chat_target;
      DROP INDEX IF EXISTS idx_moderation_actions_expires;
      DROP INDEX IF EXISTS idx_warnings_chat_user;
      DROP INDEX IF EXISTS idx_filters_chat_active;
      DROP INDEX IF EXISTS idx_faq_chat_active;
      DROP INDEX IF EXISTS idx_users_status;
      DROP INDEX IF EXISTS idx_users_risk;
      DROP INDEX IF EXISTS idx_users_last_seen;
    `,
  },
  {
    id: '003',
    name: 'add_chat_settings_json',
    description: 'Migrate chat settings to JSONB with defaults',
    up: `
      -- Add default settings for existing chats
      UPDATE chats SET settings = COALESCE(settings, '{"language":"auto","welcomeEnabled":true,"rulesEnabled":true,"autoDelete":false,"deleteAfter":60,"antiSpam":true,"antiRaid":true,"guardian":true,"aiEnabled":false,"logsEnabled":false,"logsChannelId":null}')::jsonb WHERE settings IS NULL;
      UPDATE chats SET features = COALESCE(features, '{}')::jsonb WHERE features IS NULL;
    `,
    down: `
      -- Revert: nothing to do, this was a data migration
    `,
  },
  {
    id: '004',
    name: 'add_gift_tables',
    description: 'Add tables for gift system',
    up: `
      CREATE TABLE IF NOT EXISTS gift_pack_definitions (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        price INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'stars',
        animation_url TEXT,
        emoji TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_limited BOOLEAN NOT NULL DEFAULT FALSE,
        stock_count INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_gifts (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id),
        gift_definition_id INTEGER NOT NULL REFERENCES gift_pack_definitions(id),
        sender_id BIGINT REFERENCES users(id),
        chat_id BIGINT REFERENCES chats(id),
        received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_opened BOOLEAN NOT NULL DEFAULT FALSE,
        UNIQUE(user_id, gift_definition_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_gifts_user ON user_gifts(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_gifts_gift_def ON user_gifts(gift_definition_id);
    `,
    down: `
      DROP TABLE IF EXISTS user_gifts CASCADE;
      DROP TABLE IF EXISTS gift_pack_definitions CASCADE;
    `,
  },
  {
    id: '005',
    name: 'add_crypto_tables',
    description: 'Add tables for crypto module',
    up: `
      CREATE TABLE IF NOT EXISTS crypto_watchlists (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id),
        chat_id BIGINT REFERENCES chats(id),
        coin_ids TEXT[] NOT NULL,
        target_price NUMERIC(20,8),
        direction TEXT CHECK (direction IN ('above', 'below')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crypto_portfolios (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id),
        chat_id BIGINT REFERENCES chats(id),
        coin_id TEXT NOT NULL,
        amount NUMERIC(20,8) NOT NULL,
        purchase_price NUMERIC(20,8),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, chat_id, coin_id)
      );

      CREATE INDEX IF NOT EXISTS idx_crypto_watchlists_user ON crypto_watchlists(user_id);
      CREATE INDEX IF NOT EXISTS idx_crypto_portfolios_user ON crypto_portfolios(user_id);
    `,
    down: `
      DROP TABLE IF EXISTS crypto_portfolios CASCADE;
      DROP TABLE IF EXISTS crypto_watchlists CASCADE;
    `,
  },
  {
    id: '006',
    name: 'add_currency_tables',
    description: 'Add tables for currency module',
    up: `
      CREATE TABLE IF NOT EXISTS currency_rates (
        id BIGSERIAL PRIMARY KEY,
        from_currency TEXT NOT NULL,
        to_currency TEXT NOT NULL,
        rate NUMERIC(20,8) NOT NULL,
        fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(from_currency, to_currency)
      );

      CREATE TABLE IF NOT EXISTS currency_watchlists (
        user_id BIGINT NOT NULL REFERENCES users(id),
        chat_id BIGINT REFERENCES chats(id),
        currency_pairs TEXT[] NOT NULL,
        threshold NUMERIC(20,8),
        direction TEXT CHECK (direction IN ('above', 'below')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (user_id, chat_id)
      );

      CREATE INDEX IF NOT EXISTS idx_currency_rates_pair ON currency_rates(from_currency, to_currency);
    `,
    down: `
      DROP TABLE IF EXISTS currency_watchlists CASCADE;
      DROP TABLE IF EXISTS currency_rates CASCADE;
    `,
  },
  {
    id: '007',
    name: 'add_music_tables',
    description: 'Add tables for music module (MTProto metadata only)',
    up: `
      CREATE TABLE IF NOT EXISTS music_queues (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        current_track JSONB,
        queue JSONB,
        is_loop BOOLEAN NOT NULL DEFAULT FALSE,
        is_shuffle BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS music_stats (
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        tracks_played INTEGER NOT NULL DEFAULT 0,
        last_played TIMESTAMP WITH TIME ZONE,
        primary key (chat_id)
      );

      -- Note: Music playback requires MTProto via @mtproto/music-player service.
      -- This table only stores metadata; actual audio streaming is handled by the MTProto service.
    `,
    down: `
      DROP TABLE IF EXISTS music_stats CASCADE;
      DROP TABLE IF EXISTS music_queues CASCADE;
    `,
  },
  {
    id: '008',
    name: 'add_reaction_tables',
    description: 'Add tables for reaction roles and tracking',
    up: `
      CREATE TABLE IF NOT EXISTS reaction_roles (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        message_id INTEGER NOT NULL,
        emoji TEXT NOT NULL,
        role_name TEXT NOT NULL,
        role_id BIGINT,
        created_by BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(chat_id, message_id, emoji)
      );

      CREATE TABLE IF NOT EXISTS reaction_stats (
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id),
        emoji TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        primary key (chat_id, user_id, emoji)
      );

      CREATE INDEX IF NOT EXISTS idx_reaction_roles_chat_msg ON reaction_roles(chat_id, message_id);
      CREATE INDEX IF NOT EXISTS idx_reaction_stats_user ON reaction_stats(user_id);
    `,
    down: `
      DROP TABLE IF EXISTS reaction_stats CASCADE;
      DROP TABLE IF EXISTS reaction_roles CASCADE;
    `,
  },
];

export async function createMigrationsTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      applied_by TEXT
    );
  `);
}

export async function getAppliedMigrations(): Promise<string[]> {
  const pool = getPool();
  const result = await pool.query('SELECT id FROM migrations ORDER BY id');
  return result.rows.map((row: { id: string }) => row.id);
}

export async function recordMigration(
  migration: Migration,
  appliedBy = 'system'
): Promise<void> {
  const pool = getPool();
  await pool.query(
    'INSERT INTO migrations (id, name, description, applied_by) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
    [migration.id, migration.name, migration.description, appliedBy]
  );
}

export async function removeMigrationRecord(migrationId: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM migrations WHERE id = $1', [migrationId]);
}

export async function runMigrations(): Promise<{ applied: string[]; failed: string[] }> {
  await createMigrationsTable();

  const applied = await getAppliedMigrations();
  const pending = migrations.filter((m) => !applied.includes(m.id));

  const results = { applied: [] as string[], failed: [] as string[] };

  for (const migration of pending) {
    try {
      logger.info(`Applying migration ${migration.id}: ${migration.name}`);
      const pool = getPool();
      await pool.query('BEGIN');
      await pool.query(migration.up);
      await recordMigration(migration);
      await pool.query('COMMIT');
      results.applied.push(migration.id);
      logger.info(`Migration ${migration.id} applied successfully`);
    } catch (error) {
      await getPool().query('ROLLBACK');
      logger.error(`Migration ${migration.id} failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      results.failed.push(migration.id);
      break;
    }
  }

  return results;
}

export async function rollbackMigration(): Promise<boolean> {  const applied = await getAppliedMigrations();
  if (applied.length === 0) {
    logger.info('No migrations to rollback');
    return false;
  }

  const lastId = applied[applied.length - 1]!;
  const migration = migrations.find((m) => m.id === lastId);

  if (!migration) {
    logger.error(`Migration ${lastId} not found in definitions`);
    return false;
  }

  try {
    logger.info(`Rolling back migration ${lastId}: ${migration.name}`);
    const pool = getPool();
    await pool.query('BEGIN');
    await pool.query(migration.down);
    await removeMigrationRecord(lastId);
    await pool.query('COMMIT');
    logger.info(`Migration ${lastId} rolled back successfully`);
    return true;
  } catch (error) {
    await getPool().query('ROLLBACK');
    logger.error(`Rollback of ${lastId} failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
