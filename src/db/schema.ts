import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  serial,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---- Tablas requeridas por @auth/drizzle-adapter ----
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ---- Dominio ----
export const matchStage = pgEnum("match_stage", [
  "group",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
]);

export const matchStatus = pgEnum("match_status", ["scheduled", "finished"]);

export const teams = pgTable("team", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fifaCode: text("fifa_code").notNull(),
  group: text("group"), // A..L
  flag: text("flag"),
});

export const matches = pgTable("match", {
  id: serial("id").primaryKey(),
  stage: matchStage("stage").notNull(),
  groupLabel: text("group_label"),
  homeTeamId: integer("home_team_id").references(() => teams.id),
  awayTeamId: integer("away_team_id").references(() => teams.id),
  homePlaceholder: text("home_placeholder"),
  awayPlaceholder: text("away_placeholder"),
  kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
  venue: text("venue"),
  status: matchStatus("status").notNull().default("scheduled"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  advancingTeamId: integer("advancing_team_id").references(() => teams.id),
});

export const predictions = pgTable(
  "prediction",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    homeScorePred: integer("home_score_pred").notNull(),
    awayScorePred: integer("away_score_pred").notNull(),
    points: integer("points"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (p) => [uniqueIndex("uq_user_match").on(p.userId, p.matchId)],
);
