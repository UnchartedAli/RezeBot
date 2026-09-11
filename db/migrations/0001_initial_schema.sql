-- UP

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Telegram users)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    language_code TEXT DEFAULT 'fa',
    is_premium BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chats table (Telegram groups/channels)
CREATE TABLE IF NOT EXISTS chats (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('private', 'group', 'supergroup', 'channel')),
    title TEXT,
    username TEXT,
    description TEXT,
    invite_link TEXT,
    member_count INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat settings (per-group configuration with isolation)
CREATE TABLE IF NOT EXISTS chat_settings (
    chat_id BIGINT PRIMARY KEY REFERENCES chats(chat_id) ON DELETE CASCADE,
    language TEXT DEFAULT 'fa',
    bot_mode TEXT DEFAULT 'guardian',
    profile TEXT DEFAULT 'balanced',
    enable_ai BOOLEAN DEFAULT FALSE,
    enable_crypto BOOLEAN DEFAULT FALSE,
    enable_gifts BOOLEAN DEFAULT FALSE,
    enable_games BOOLEAN DEFAULT TRUE,
    enable_music BOOLEAN DEFAULT FALSE,
    enable_payments BOOLEAN DEFAULT FALSE,
    enable_mini_app BOOLEAN DEFAULT TRUE,
    enable_topics BOOLEAN DEFAULT TRUE,
    enable_reactions BOOLEAN DEFAULT TRUE,
    anti_spam_enabled BOOLEAN DEFAULT TRUE,
    anti_raid_enabled BOOLEAN DEFAULT TRUE,
    link_protection BOOLEAN DEFAULT TRUE,
    media_protection BOOLEAN DEFAULT FALSE,
    new_member_protection BOOLEAN DEFAULT TRUE,
    flood_protection BOOLEAN DEFAULT TRUE,
    quarantine_mode BOOLEAN DEFAULT TRUE,
    welcome_enabled BOOLEAN DEFAULT TRUE,
    welcome_message TEXT,
    goodbye_enabled BOOLEAN DEFAULT FALSE,
    goodbye_message TEXT,
    rules_enabled BOOLEAN DEFAULT TRUE,
    rules_text TEXT,
    report_enabled BOOLEAN DEFAULT TRUE,
    auto_delete_links BOOLEAN DEFAULT TRUE,
    auto_delete_media BOOLEAN DEFAULT FALSE,
    slow_mode_enabled BOOLEAN DEFAULT FALSE,
    slow_mode_seconds INTEGER,
    delete_after_seconds INTEGER,
    max_warnings INTEGER DEFAULT 3,
    warn_action TEXT DEFAULT 'mute',
    warn_mute_duration INTEGER,
    warn_kick_at INTEGER,
    warn_ban_at INTEGER,
    retention_days INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot permissions per chat
CREATE TABLE IF NOT EXISTS chat_permissions (
    chat_id BIGINT PRIMARY KEY REFERENCES chats(chat_id) ON DELETE CASCADE,
    bot_user_id BIGINT NOT NULL,
    can_delete_messages BOOLEAN DEFAULT FALSE,
    can_restrict_members BOOLEAN DEFAULT FALSE,
    can_invite_users BOOLEAN DEFAULT FALSE,
    can_pin_messages BOOLEAN DEFAULT FALSE,
    can_change_info BOOLEAN DEFAULT FALSE,
    can_manage_topics BOOLEAN DEFAULT FALSE,
    can_manage_video_chats BOOLEAN DEFAULT FALSE,
    can_be_edited BOOLEAN DEFAULT FALSE,
    can_post_messages BOOLEAN DEFAULT FALSE,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT one_active_bot_per_chat CHECK (bot_user_id IS NOT NULL)
);

-- Chat members (current state)
CREATE TABLE IF NOT EXISTS chat_members (
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('creator', 'administrator', 'member', 'restricted', 'left', 'kicked')),
    is_admin BOOLEAN DEFAULT FALSE,
    is_owner BOOLEAN DEFAULT FALSE,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_date TIMESTAMP WITH TIME ZONE,
    can_restrict_members BOOLEAN DEFAULT FALSE,
    can_ban_users BOOLEAN DEFAULT FALSE,
    can_pin_messages BOOLEAN DEFAULT FALSE,
    can_delete_messages BOOLEAN DEFAULT FALSE,
    can_invite_users BOOLEAN DEFAULT FALSE,
    can_manage_topics BOOLEAN DEFAULT FALSE,
    can_manage_video_chats BOOLEAN DEFAULT FALSE,
    can_manage_chat BOOLEAN DEFAULT FALSE,
    restricted_until TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (chat_id, user_id)
);

-- Roles and permissions
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    can_ban BOOLEAN DEFAULT FALSE,
    can_kick BOOLEAN DEFAULT FALSE,
    can_mute BOOLEAN DEFAULT FALSE,
    can_warn BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_pin BOOLEAN DEFAULT FALSE,
    can_set_topic BOOLEAN DEFAULT FALSE,
    can_invite BOOLEAN DEFAULT FALSE,
    can_manage_chat BOOLEAN DEFAULT FALSE,
    can_manage_topics BOOLEAN DEFAULT FALSE,
    can_manage_video_chats BOOLEAN DEFAULT FALSE,
    can_manage_messages BOOLEAN DEFAULT FALSE,
    priority INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles per chat
CREATE TABLE IF NOT EXISTS user_roles (
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (chat_id, user_id)
);

-- Protected users (cannot be moderated)
CREATE TABLE IF NOT EXISTS protected_users (
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    reason TEXT NOT NULL,
    added_by BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

-- Exemptions (whitelist)
CREATE TABLE IF NOT EXISTS exemptions (
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'role', 'domain', 'command')),
    entity_value TEXT NOT NULL,
    module_key TEXT NOT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (chat_id, entity_type, entity_value, module_key)
);

-- Moderation actions (audit log of ALL actions)
CREATE TABLE IF NOT EXISTS moderation_actions (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    actor_id BIGINT NOT NULL,
    target_id BIGINT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('ban', 'unban', 'kick', 'mute', 'unmute', 'warn', 'delete', 'pin', 'unpin', 'slow_mode', 'lockdown', 'unlockdown', 'restrict', 'unrestrict', 'approve', 'reject')),
    reason TEXT,
    source TEXT NOT NULL CHECK (source IN ('command', 'natural_language', 'inline_button', 'web_panel', 'mini_app', 'automation', 'ai', 'scheduler')),
    duration_seconds BIGINT,
    result TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'failed', 'skipped', 'denied')),
    metadata JSONB DEFAULT '{}',
    target_message_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_chat ON moderation_actions(chat_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_actor ON moderation_actions(actor_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON moderation_actions(target_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created_at ON moderation_actions(created_at DESC);

-- Warnings system
CREATE TABLE IF NOT EXISTS warnings (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    reason TEXT NOT NULL,
    actor_id BIGINT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warnings_user_chat ON warnings(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_warnings_active ON warnings(chat_id, expires_at NULLIF(expires_at, created_at) IS NULL);

-- Filter rules
CREATE TABLE IF NOT EXISTS filters (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('word', 'phrase', 'regex', 'link', 'domain', 'username', 'media', 'caption')),
    pattern TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('delete', 'warn', 'mute', 'ban')),
    duration_seconds BIGINT,
    is_enabled BOOLEAN DEFAULT TRUE,
    matched_count BIGINT DEFAULT 0,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filters_chat ON filters(chat_id);
CREATE INDEX IF NOT EXISTS idx_filters_enabled ON filters(chat_id, is_enabled);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    reporter_id BIGINT NOT NULL,
    target_id BIGINT NOT NULL,
    message_id BIGINT,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
    assigned_to BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_reports_chat ON reports(chat_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(chat_id, status);

-- FAQ
CREATE TABLE IF NOT EXISTS faqs (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    aliases TEXT[] DEFAULT '{}',
    view_count INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faqs_chat ON faqs(chat_id);
CREATE INDEX IF NOT EXISTS idx_faqs_question ON faqs(chat_id, question);

-- Scheduled jobs
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_chat ON scheduled_jobs(chat_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_scheduled_at ON scheduled_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_pending ON scheduled_jobs(chat_id, is_completed, scheduled_at);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    category TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
    assigned_to BIGINT,
    subject TEXT,
    messages JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tickets_chat ON tickets(chat_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(chat_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(chat_id, user_id);

-- Game profiles
CREATE TABLE IF NOT EXISTS game_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    last_played TIMESTAMP WITH TIME ZONE,
    achievements TEXT[] DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_game_profiles_chat ON game_profiles(chat_id);
CREATE INDEX IF NOT EXISTS idx_game_profiles_xp ON game_profiles(chat_id, xp DESC);

-- Game transactions (idempotent)
CREATE TABLE IF NOT EXISTS game_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    game_type TEXT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('bet', 'win', 'reward', 'purchase', 'daily_bonus')),
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('xp', 'coins')),
    metadata JSONB DEFAULT '{}',
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_transactions_user ON game_transactions(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_game_transactions_idempotency ON game_transactions(idempotency_key);

-- Crypto prices (cached market data)
CREATE TABLE IF NOT EXISTS crypto_prices (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT,
    price_usd NUMERIC(20, 8),
    change_24h NUMERIC(10, 4),
    change_7d NUMERIC(10, 4),
    volume_24h NUMERIC(20, 4),
    market_cap NUMERIC(24, 2),
    ath NUMERIC(20, 8),
    ath_distance NUMERIC(10, 4),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol)
);

CREATE INDEX IF NOT EXISTS idx_crypto_prices_symbol ON crypto_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_prices_updated_at ON crypto_prices(updated_at DESC);

-- Crypto alerts
CREATE TABLE IF NOT EXISTS crypto_alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT,
    symbol TEXT NOT NULL,
    target_price NUMERIC(20, 8),
    condition TEXT NOT NULL CHECK (condition IN ('above', 'below', 'percent_up', 'percent_down')),
    percent_threshold NUMERIC(10, 4),
    is_active BOOLEAN DEFAULT TRUE,
    is_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_alerts_user ON crypto_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_alerts_active ON crypto_alerts(is_active, is_notified);

-- Currency rates
CREATE TABLE IF NOT EXISTS currency_rates (
    id BIGSERIAL PRIMARY KEY,
    base_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    rate NUMERIC(16, 8) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT,
    UNIQUE(base_currency, target_currency)
);

CREATE INDEX IF NOT EXISTS idx_currency_rates_pair ON currency_rates(base_currency, target_currency);

-- Telegram gifts
CREATE TABLE IF NOT EXISTS gifts (
    id BIGSERIAL PRIMARY KEY,
    gift_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    stars INTEGER NOT NULL,
    supply INTEGER,
    remaining INTEGER,
    is_collectible BOOLEAN DEFAULT FALSE,
    rarity TEXT,
    attributes JSONB DEFAULT '{}',
    resale_value NUMERIC(20, 2),
    floor_price NUMERIC(20, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gifts_stars ON gifts(stars);
CREATE INDEX IF NOT EXISTS idx_gifts_rarity ON gifts(rarity);

-- Gift alerts
CREATE TABLE IF NOT EXISTS gift_alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    gift_id TEXT NOT NULL,
    target_stars INTEGER,
    condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
    is_active BOOLEAN DEFAULT TRUE,
    is_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_alerts_user ON gift_alerts(user_id);

-- AI sessions
CREATE TABLE IF NOT EXISTS ai_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    mode TEXT DEFAULT 'mention_only' CHECK (mode IN ('off', 'command_only', 'mention_only', 'reply_only', 'always_on')),
    memory_level TEXT DEFAULT 'short_term' CHECK (memory_level IN ('none', 'short_term', 'long_term')),
    retention_days INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chat_id)
);

-- AI memory entries
CREATE TABLE IF NOT EXISTS ai_memory (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, chat_key, chat_id) WHERE (chat_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON ai_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_expires ON ai_memory(expires_at);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT,
    plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'premium')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(is_active, expires_at);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT,
    provider TEXT NOT NULL,
    provider_payment_id TEXT,
    amount NUMERIC(12, 2),
    currency TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
    id BIGSERIAL PRIMARY KEY,
    referrer_id BIGINT NOT NULL,
    referred_id BIGINT NOT NULL,
    chat_id BIGINT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    converted BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(referrer_id, referred_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- Notes (admin-only internal notes)
CREATE TABLE IF NOT EXISTS notes (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_by BIGINT NOT NULL,
    is_internal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_chat_user ON notes(chat_id, user_id);

-- Audit logs (separate from moderation_actions for non-moderation sensitive actions)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT,
    actor_id BIGINT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id BIGINT,
    reason TEXT,
    source TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_chat ON audit_logs(chat_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Web sessions
CREATE TABLE IF NOT EXISTS web_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    chat_id BIGINT,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_web_sessions_user ON web_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_web_sessions_active ON web_sessions(expires_at > NOW());

-- Feature flags per chat
CREATE TABLE IF NOT EXISTS chat_feature_flags (
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL,
    updated_by BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (chat_id, flag_key)
);

-- Analytics events (aggregated metrics)
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    user_id BIGINT,
    value NUMERIC(12, 4) DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_chat_type ON analytics_events(chat_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_recorded_at ON analytics_events(recorded_at);

-- Daily rewards
CREATE TABLE IF NOT EXISTS daily_rewards (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    day INTEGER NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('coins', 'xp')),
    reward_amount INTEGER NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chat_id, day, claimed_at::date)
);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_user ON daily_rewards(user_id, chat_id);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT,
    message TEXT NOT NULL,
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders(is_completed, remind_at);

-- Seed roles
INSERT INTO roles (name, display_name, can_ban, can_kick, can_mute, can_warn, can_delete, can_pin, can_invite, can_manage_chat, priority) VALUES
    ('owner', 'Owner', true, true, true, true, true, true, true, true, 100),
    ('super_admin', 'Super Admin', true, true, true, true, true, true, true, true, 90),
    ('admin', 'Admin', true, true, true, true, true, true, true, true, 80),
    ('moderator', 'Moderator', false, true, true, true, true, false, true, false, 60),
    ('helper', 'Helper', false, false, true, true, true, false, true, false, 40),
    ('user', 'User', false, false, false, false, false, false, false, false, 0);

-- Create index on users for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_chats_chat_id ON chats(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_chat ON user_roles(chat_id);

-- DOWN

DROP INDEX IF EXISTS idx_users_username, idx_users_telegram_id, idx_chats_chat_id, idx_chat_members_chat, idx_user_roles_chat;

DROP TABLE IF EXISTS chat_feature_flags;
DROP TABLE IF EXISTS analytics_events;
DROP TABLE IF EXISTS daily_rewards;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS web_sessions;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS ai_memory;
DROP TABLE IF EXISTS ai_sessions;
DROP TABLE IF EXISTS gift_alerts;
DROP TABLE IF EXISTS gifts;
DROP TABLE IF EXISTS currency_rates;
DROP TABLE IF EXISTS crypto_alerts;
DROP TABLE IF EXISTS crypto_prices;
DROP TABLE IF EXISTS game_transactions;
DROP TABLE IF EXISTS game_profiles;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS scheduled_jobs;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS filters;
DROP TABLE IF EXISTS warnings;
DROP TABLE IF EXISTS moderation_actions;
DROP TABLE IF EXISTS exemptions;
DROP TABLE IF EXISTS protected_users;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS chat_members;
DROP TABLE IF EXISTS chat_permissions;
DROP TABLE IF EXISTS chat_settings;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS migrations;

DROP EXTENSION IF EXISTS "uuid-ossp";
