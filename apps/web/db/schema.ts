import { pgTable, unique, uuid, text, timestamp, foreignKey, integer, boolean, date, time, primaryKey, index, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const importedSongs = pgTable("imported_songs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	artist: text().notNull(),
	slug: text().notNull(),
	content: text().notNull(),
	origin: text().notNull(),
	letter: text(),
	artistFolder: text("artist_folder"),
	status: text().default('review').notNull(),
	pathologies: text(),
	songKey: text("song_key"),
	sourceFile: text("source_file"),
	publishedSongId: uuid("published_song_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	promotedAt: timestamp("promoted_at", { withTimezone: true, mode: 'string' }),
	// URLs públicas /<artist_slug>/<title_slug>; versão principal tem
	// version_slug='' (NULL quebraria a unicidade do grupo no Postgres)
	artistSlug: text("artist_slug"),
	titleSlug: text("title_slug"),
	versionLabel: text("version_label"),
	versionSlug: text("version_slug").default('').notNull(),
}, (table) => [
	unique("imported_songs_slug_unique").on(table.slug),
	index("imported_songs_artist_slug_idx").on(table.artistSlug),
	uniqueIndex("imported_songs_group_version_unique")
		.on(table.artistSlug, table.titleSlug, table.versionSlug)
		.where(sql`artist_slug is not null`),
]);

// ── Analytics primeira-parte ────────────────────────────────────────────────
// page_events guarda só as últimas 48h (poda no /api/track) — serve pro
// "online agora" e únicos do dia; o histórico fica no agregado diário.
export const pageEvents = pgTable("page_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	path: text().notNull(),
	visitor: text().notNull(),
	referrer: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("page_events_created_at_idx").on(table.createdAt),
]);

export const pageViewsDaily = pgTable("page_views_daily", {
	day: date().notNull(),
	path: text().notNull(),
	views: integer().default(0).notNull(),
}, (table) => [
	primaryKey({ columns: [table.day, table.path], name: "page_views_daily_pk" }),
]);

export const songs = pgTable("songs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	artist: text().notNull(),
	slug: text().notNull(),
	sourceUrl: text("source_url"),
	canonicalVersionId: uuid("canonical_version_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("songs_slug_unique").on(table.slug),
]);

export const songProposals = pgTable("song_proposals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	songId: uuid("song_id").notNull(),
	content: text().notNull(),
	proposedBy: uuid("proposed_by").notNull(),
	proposedAt: timestamp("proposed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	status: text().default('pending').notNull(),
	reviewedBy: uuid("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.songId],
			foreignColumns: [songs.id],
			name: "song_proposals_song_id_songs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.proposedBy],
			foreignColumns: [users.id],
			name: "song_proposals_proposed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "song_proposals_reviewed_by_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	name: text(),
	image: text(),
	role: text().default('user').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const userProfiles = pgTable("user_profiles", {
	userId: uuid("user_id").primaryKey().notNull(),
	bio: text(),
	location: text(),
	availability: text().default('available').notNull(),
	functions: text().array().default([]).notNull(),
	instruments: text().array().default([]).notNull(),
	competencies: text().array().default([]).notNull(),
	rider: text(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userImportedSongs = pgTable("user_imported_songs", {
	userId: uuid("user_id").notNull(),
	importedSongId: uuid("imported_song_id").notNull(),
	favorite: boolean().default(false).notNull(),
	lastSeen: timestamp("last_seen", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_imported_songs_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.importedSongId],
			foreignColumns: [importedSongs.id],
			name: "user_imported_songs_imported_song_id_imported_songs_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.importedSongId], name: "user_imported_songs_user_id_imported_song_id_pk"}),
]);

export const songVersions = pgTable("song_versions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	songId: uuid("song_id").notNull(),
	content: text().notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.songId],
			foreignColumns: [songs.id],
			name: "song_versions_song_id_songs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "song_versions_created_by_users_id_fk"
		}),
]);

export const repertoires = pgTable("repertoires", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupId: uuid("group_id").notNull(),
	name: text().notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "repertoires_group_id_groups_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "repertoires_created_by_users_id_fk"
		}),
]);

export const groupSongs = pgTable("group_songs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupId: uuid("group_id").notNull(),
	title: text().notNull(),
	artist: text().default('').notNull(),
	content: text().notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "group_songs_group_id_groups_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "group_songs_created_by_users_id_fk"
		}),
]);

export const repertoireSongs = pgTable("repertoire_songs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	repertoireId: uuid("repertoire_id").notNull(),
	songId: uuid("song_id"),
	groupSongId: uuid("group_song_id"),
	position: integer().default(0).notNull(),
	notes: text(),
	itemType: text("item_type").default('song').notNull(),
	title: text(),
	body: text(),
	songKey: text("song_key"),
	bpm: integer(),
	durationSec: integer("duration_sec"),
	segue: boolean().default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.repertoireId],
			foreignColumns: [repertoires.id],
			name: "repertoire_songs_repertoire_id_repertoires_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.songId],
			foreignColumns: [songs.id],
			name: "repertoire_songs_song_id_songs_id_fk"
		}),
	foreignKey({
			columns: [table.groupSongId],
			foreignColumns: [groupSongs.id],
			name: "repertoire_songs_group_song_id_group_songs_id_fk"
		}),
]);

export const groups = pgTable("groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	inviteCode: text("invite_code").notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	image: text(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "groups_created_by_users_id_fk"
		}),
	unique("groups_invite_code_unique").on(table.inviteCode),
]);

export const events = pgTable("events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupId: uuid("group_id").notNull(),
	title: text().notNull(),
	eventDate: date("event_date").notNull(),
	eventTime: time("event_time"),
	location: text(),
	eventType: text("event_type").default('other').notNull(),
	notice: text(),
	repertoireId: uuid("repertoire_id"),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	publicToken: uuid("public_token"),
	technicalRider: text("technical_rider"),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "events_group_id_groups_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.repertoireId],
			foreignColumns: [repertoires.id],
			name: "events_repertoire_id_repertoires_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "events_created_by_users_id_fk"
		}),
	unique("events_public_token_unique").on(table.publicToken),
]);

export const tickets = pgTable("tickets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	title: text().notNull(),
	status: text().default('open').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tickets_user_id_fkey"
		}).onDelete("cascade"),
]);

export const ticketMessages = pgTable("ticket_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ticketId: uuid("ticket_id").notNull(),
	userId: uuid("user_id").notNull(),
	body: text().notNull(),
	isAdmin: boolean("is_admin").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tickets.id],
			name: "ticket_messages_ticket_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ticket_messages_user_id_fkey"
		}).onDelete("cascade"),
]);

export const eventRoles = pgTable("event_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventId: uuid("event_id").notNull(),
	roleName: text("role_name").notNull(),
	userId: uuid("user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "event_roles_event_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "event_roles_user_id_fkey"
		}).onDelete("set null"),
]);

export const playlists = pgTable("playlists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "playlists_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const eventRepertoires = pgTable("event_repertoires", {
	eventId: uuid("event_id").notNull(),
	repertoireId: uuid("repertoire_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "event_repertoires_event_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.repertoireId],
			foreignColumns: [repertoires.id],
			name: "event_repertoires_repertoire_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.eventId, table.repertoireId], name: "event_repertoires_pkey"}),
]);

export const eventAcknowledgments = pgTable("event_acknowledgments", {
	eventId: uuid("event_id").notNull(),
	userId: uuid("user_id").notNull(),
	acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "event_acknowledgments_event_id_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "event_acknowledgments_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.eventId, table.userId], name: "event_acknowledgments_event_id_user_id_pk"}),
]);

export const userFavorites = pgTable("user_favorites", {
	userId: uuid("user_id").notNull(),
	songId: uuid("song_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_favorites_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.songId],
			foreignColumns: [songs.id],
			name: "user_favorites_song_id_songs_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.songId], name: "user_favorites_user_id_song_id_pk"}),
]);

export const userSongs = pgTable("user_songs", {
	userId: uuid("user_id").notNull(),
	songId: uuid("song_id").notNull(),
	draft: text(),
	lastSeen: timestamp("last_seen", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_songs_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.songId],
			foreignColumns: [songs.id],
			name: "user_songs_song_id_songs_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.songId], name: "user_songs_user_id_song_id_pk"}),
]);

export const groupMembers = pgTable("group_members", {
	groupId: uuid("group_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: text().default('member').notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "group_members_group_id_groups_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_members_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.groupId, table.userId], name: "group_members_group_id_user_id_pk"}),
]);

export const playlistSongs = pgTable("playlist_songs", {
	playlistId: uuid("playlist_id").notNull(),
	songId: uuid("song_id").notNull(),
	position: integer().default(0).notNull(),
	addedAt: timestamp("added_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.playlistId],
			foreignColumns: [playlists.id],
			name: "playlist_songs_playlist_id_playlists_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.songId],
			foreignColumns: [songs.id],
			name: "playlist_songs_song_id_songs_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.playlistId, table.songId], name: "playlist_songs_playlist_id_song_id_pk"}),
]);

export const importSourceCounts = pgTable("import_source_counts", {
	origin: text().notNull(),
	letter: text().notNull(),
	artist: text().notNull(),
	totalFiles: integer("total_files").default(0).notNull(),
	scannedAt: timestamp("scanned_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	primaryKey({ columns: [table.origin, table.letter, table.artist], name: "import_source_counts_origin_letter_artist_pk"}),
]);

// Cache permanente da foto do artista (coletada uma vez de uma fonte pública e
// guardada aqui — não busca de novo a cada visita). Os bytes ficam no Vercel
// Blob (blobUrl), não no Postgres — guardar base64 aqui já encheu o banco
// (plano free do Neon, 512 MB) rapidinho.
export const artistPhotos = pgTable("artist_photos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	normalizedName: text("normalized_name").notNull(),
	artistName: text("artist_name").notNull(),
	blobUrl: text("blob_url"),
	contentType: text("content_type").notNull(),
	sourceUrl: text("source_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("artist_photos_normalized_name_unique").on(table.normalizedName),
]);

// Mesma ideia do artist_photos, mas por música (capa do álbum) — chave é
// título+artista normalizados, já que não temos tabela de álbum própria.
export const songCovers = pgTable("song_covers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	normalizedKey: text("normalized_key").notNull(),
	title: text().notNull(),
	artist: text().notNull(),
	blobUrl: text("blob_url"),
	contentType: text("content_type").notNull(),
	sourceUrl: text("source_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("song_covers_normalized_key_unique").on(table.normalizedKey),
]);
