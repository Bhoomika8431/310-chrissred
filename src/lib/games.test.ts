import { eq } from 'drizzle-orm';
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesByCategory,
    getGamesByPublisher,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [strategyCategory] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [roleplayingCategory] = await db
        .insert(categories)
        .values({ name: 'Roleplaying', description: 'cat-two' })
        .returning({ id: categories.id });
    const [firstPublisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });
    const [secondPublisher] = await db
        .insert(publishers)
        .values({ name: 'Pub Two', description: 'pub-two' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        const category = i % 2 === 0 ? roleplayingCategory : strategyCategory;
        const publisher = i % 3 === 0 ? secondPublisher : firstPublisher;

        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('filters games by category and publisher together', async () => {
        await seedGames(db, 6);

        const match = await db
            .select({ categoryId: games.categoryId, publisherId: games.publisherId })
            .from(games)
            .limit(1)
            .get();

        const filteredGames = await getAllGames(db, {
            categoryId: [match!.categoryId, match!.categoryId === 1 ? 2 : 1],
            publisherId: match!.publisherId,
        });

        expect(filteredGames.length).toBeGreaterThan(0);
        const categoryIds = [match!.categoryId, match!.categoryId === 1 ? 2 : 1];
        expect(filteredGames.every((game) => categoryIds.includes(game.category?.id ?? -1))).toBe(true);
        expect(filteredGames.every((game) => game.publisher?.id === match!.publisherId)).toBe(true);
    });

    it('returns games for a specific category and publisher helper', async () => {
        await seedGames(db, 4);
        const strategyCategory = await db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.name, 'Strategy'))
            .get();
        const publisher = await db
            .select({ id: publishers.id })
            .from(publishers)
            .where(eq(publishers.name, 'Pub One'))
            .get();

        const byCategory = await getGamesByCategory(db, strategyCategory!.id);
        const byPublisher = await getGamesByPublisher(db, publisher!.id);

        expect(byCategory.every((game) => game.category?.name === 'Strategy')).toBe(true);
        expect(byPublisher.every((game) => game.publisher?.name === 'Pub One')).toBe(true);
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});
