/**
 * Data access helpers for category records used by the static storefront.
 * These queries read from the Drizzle-backed SQLite database at build time.
 */
import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { categories } from '../../db/schema';
import type { Category } from '../types/game';

/**
 * Fetches all categories sorted alphabetically by name.
 *
 * @param db - The database instance used to query category records.
 * @returns A list of categories ordered by display name.
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
    const rows = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}
