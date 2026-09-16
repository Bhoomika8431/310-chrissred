/**
 * Data access helpers for publisher records used by the static storefront.
 * These queries read from the Drizzle-backed SQLite database at build time.
 */
import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';

/**
 * Fetches all publishers sorted alphabetically by name.
 *
 * @param db - The database instance used to query publisher records.
 * @returns A list of publishers ordered by display name.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}
