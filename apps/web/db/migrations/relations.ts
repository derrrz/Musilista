import { relations } from "drizzle-orm/relations";
import { songs, songProposals, users, songVersions, groups, repertoires, groupSongs, repertoireSongs, events, tickets, ticketMessages, eventRoles, playlists, eventRepertoires, eventAcknowledgments, userFavorites, userSongs, groupMembers, playlistSongs } from "./schema";

export const songProposalsRelations = relations(songProposals, ({one}) => ({
	song: one(songs, {
		fields: [songProposals.songId],
		references: [songs.id]
	}),
	user_proposedBy: one(users, {
		fields: [songProposals.proposedBy],
		references: [users.id],
		relationName: "songProposals_proposedBy_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [songProposals.reviewedBy],
		references: [users.id],
		relationName: "songProposals_reviewedBy_users_id"
	}),
}));

export const songsRelations = relations(songs, ({many}) => ({
	songProposals: many(songProposals),
	songVersions: many(songVersions),
	repertoireSongs: many(repertoireSongs),
	userFavorites: many(userFavorites),
	userSongs: many(userSongs),
	playlistSongs: many(playlistSongs),
}));

export const usersRelations = relations(users, ({many}) => ({
	songProposals_proposedBy: many(songProposals, {
		relationName: "songProposals_proposedBy_users_id"
	}),
	songProposals_reviewedBy: many(songProposals, {
		relationName: "songProposals_reviewedBy_users_id"
	}),
	songVersions: many(songVersions),
	repertoires: many(repertoires),
	groupSongs: many(groupSongs),
	groups: many(groups),
	events: many(events),
	tickets: many(tickets),
	ticketMessages: many(ticketMessages),
	eventRoles: many(eventRoles),
	playlists: many(playlists),
	eventAcknowledgments: many(eventAcknowledgments),
	userFavorites: many(userFavorites),
	userSongs: many(userSongs),
	groupMembers: many(groupMembers),
}));

export const songVersionsRelations = relations(songVersions, ({one}) => ({
	song: one(songs, {
		fields: [songVersions.songId],
		references: [songs.id]
	}),
	user: one(users, {
		fields: [songVersions.createdBy],
		references: [users.id]
	}),
}));

export const repertoiresRelations = relations(repertoires, ({one, many}) => ({
	group: one(groups, {
		fields: [repertoires.groupId],
		references: [groups.id]
	}),
	user: one(users, {
		fields: [repertoires.createdBy],
		references: [users.id]
	}),
	repertoireSongs: many(repertoireSongs),
	events: many(events),
	eventRepertoires: many(eventRepertoires),
}));

export const groupsRelations = relations(groups, ({one, many}) => ({
	repertoires: many(repertoires),
	groupSongs: many(groupSongs),
	user: one(users, {
		fields: [groups.createdBy],
		references: [users.id]
	}),
	events: many(events),
	groupMembers: many(groupMembers),
}));

export const groupSongsRelations = relations(groupSongs, ({one, many}) => ({
	group: one(groups, {
		fields: [groupSongs.groupId],
		references: [groups.id]
	}),
	user: one(users, {
		fields: [groupSongs.createdBy],
		references: [users.id]
	}),
	repertoireSongs: many(repertoireSongs),
}));

export const repertoireSongsRelations = relations(repertoireSongs, ({one}) => ({
	repertoire: one(repertoires, {
		fields: [repertoireSongs.repertoireId],
		references: [repertoires.id]
	}),
	song: one(songs, {
		fields: [repertoireSongs.songId],
		references: [songs.id]
	}),
	groupSong: one(groupSongs, {
		fields: [repertoireSongs.groupSongId],
		references: [groupSongs.id]
	}),
}));

export const eventsRelations = relations(events, ({one, many}) => ({
	group: one(groups, {
		fields: [events.groupId],
		references: [groups.id]
	}),
	repertoire: one(repertoires, {
		fields: [events.repertoireId],
		references: [repertoires.id]
	}),
	user: one(users, {
		fields: [events.createdBy],
		references: [users.id]
	}),
	eventRoles: many(eventRoles),
	eventRepertoires: many(eventRepertoires),
	eventAcknowledgments: many(eventAcknowledgments),
}));

export const ticketsRelations = relations(tickets, ({one, many}) => ({
	user: one(users, {
		fields: [tickets.userId],
		references: [users.id]
	}),
	ticketMessages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({one}) => ({
	ticket: one(tickets, {
		fields: [ticketMessages.ticketId],
		references: [tickets.id]
	}),
	user: one(users, {
		fields: [ticketMessages.userId],
		references: [users.id]
	}),
}));

export const eventRolesRelations = relations(eventRoles, ({one}) => ({
	event: one(events, {
		fields: [eventRoles.eventId],
		references: [events.id]
	}),
	user: one(users, {
		fields: [eventRoles.userId],
		references: [users.id]
	}),
}));

export const playlistsRelations = relations(playlists, ({one, many}) => ({
	user: one(users, {
		fields: [playlists.userId],
		references: [users.id]
	}),
	playlistSongs: many(playlistSongs),
}));

export const eventRepertoiresRelations = relations(eventRepertoires, ({one}) => ({
	event: one(events, {
		fields: [eventRepertoires.eventId],
		references: [events.id]
	}),
	repertoire: one(repertoires, {
		fields: [eventRepertoires.repertoireId],
		references: [repertoires.id]
	}),
}));

export const eventAcknowledgmentsRelations = relations(eventAcknowledgments, ({one}) => ({
	event: one(events, {
		fields: [eventAcknowledgments.eventId],
		references: [events.id]
	}),
	user: one(users, {
		fields: [eventAcknowledgments.userId],
		references: [users.id]
	}),
}));

export const userFavoritesRelations = relations(userFavorites, ({one}) => ({
	user: one(users, {
		fields: [userFavorites.userId],
		references: [users.id]
	}),
	song: one(songs, {
		fields: [userFavorites.songId],
		references: [songs.id]
	}),
}));

export const userSongsRelations = relations(userSongs, ({one}) => ({
	user: one(users, {
		fields: [userSongs.userId],
		references: [users.id]
	}),
	song: one(songs, {
		fields: [userSongs.songId],
		references: [songs.id]
	}),
}));

export const groupMembersRelations = relations(groupMembers, ({one}) => ({
	group: one(groups, {
		fields: [groupMembers.groupId],
		references: [groups.id]
	}),
	user: one(users, {
		fields: [groupMembers.userId],
		references: [users.id]
	}),
}));

export const playlistSongsRelations = relations(playlistSongs, ({one}) => ({
	playlist: one(playlists, {
		fields: [playlistSongs.playlistId],
		references: [playlists.id]
	}),
	song: one(songs, {
		fields: [playlistSongs.songId],
		references: [songs.id]
	}),
}));