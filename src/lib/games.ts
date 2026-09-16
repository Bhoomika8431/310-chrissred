import { eq, asc, inArray, and } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

export interface GameFilters {
    categoryId?: number | number[];
    publisherId?: number | number[];
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/**
 * Normalizes a single value or list of values to an array of numeric ids.
 *
 * @param value - A filter value or collection of ids.
 * @returns The normalized list of ids, or undefined when no values are provided.
 */
function normalizeFilterIds(value: number | number[] | undefined): number[] | undefined {
    if (value === undefined) {
        return undefined;
    }

    const values = Array.isArray(value) ? value : [value];
    return values.length > 0 ? values : undefined;
}

/**
 * Lists games matching the supplied filter values, ordered by title.
 *
 * @param db - The database instance used to query games.
 * @param filters - Optional category and publisher filters.
 * @returns Games that match all provided filters.
 */
export async function getGamesByFilters(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    const clauses = [];

    const categoryIds = normalizeFilterIds(filters.categoryId);
    if (categoryIds) {
        clauses.push(inArray(games.categoryId, categoryIds));
    }

    const publisherIds = normalizeFilterIds(filters.publisherId);
    if (publisherIds) {
        clauses.push(inArray(games.publisherId, publisherIds));
    }

    const query = clauses.length > 0 ? baseGamesQuery(db).where(and(...clauses)) : baseGamesQuery(db);
    const rows = await query.orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** All games ordered by title, optionally filtered by category and/or publisher. */
export async function getAllGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    return getGamesByFilters(db, filters);
}

/** All games for a specific category, ordered by title. */
export async function getGamesByCategory(db: Database, categoryId: number): Promise<Game[]> {
    return getGamesByFilters(db, { categoryId });
}

/** All games for a specific publisher, ordered by title. */
export async function getGamesByPublisher(db: Database, publisherId: number): Promise<Game[]> {
    return getGamesByFilters(db, { publisherId });
}

/** All game ids ordered by title, optionally filtered by category and/or publisher. */
export async function getAllGameIds(db: Database, filters: GameFilters = {}): Promise<number[]> {
    const clauses = [];

    const categoryIds = normalizeFilterIds(filters.categoryId);
    if (categoryIds) {
        clauses.push(inArray(games.categoryId, categoryIds));
    }

    const publisherIds = normalizeFilterIds(filters.publisherId);
    if (publisherIds) {
        clauses.push(inArray(games.publisherId, publisherIds));
    }

    const query = clauses.length > 0 ? db.select({ id: games.id }).from(games).where(and(...clauses)) : db.select({ id: games.id }).from(games);
    const rows = await query.orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
