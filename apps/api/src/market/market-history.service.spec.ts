import { describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../database/database.service';
import { MarketHistoryService } from './market-history.service';

describe('MarketHistoryService', () => {
  it('returns the stored transaction counter without inventing daily volume', async () => {
    const fetchedAt = new Date('2026-10-08T12:00:00.000Z');
    const rowsQuery = {
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn().mockResolvedValue([
        {
          fetchedAt,
          payload: { price: '250000', stock: 12, totalTrades: '1400' },
        },
      ]),
    };
    rowsQuery.from.mockReturnValue(rowsQuery);
    rowsQuery.where.mockReturnValue(rowsQuery);
    rowsQuery.orderBy.mockReturnValue(rowsQuery);
    const database = {
      db: { select: vi.fn().mockReturnValue(rowsQuery) },
    } as unknown as DatabaseService;
    const service = new MarketHistoryService(database);

    const response = await service.history('sa', 676, 0, 'pt');

    expect(rowsQuery.limit).toHaveBeenCalledWith(1500);
    expect(response.points).toEqual([
      {
        fetchedAt,
        price: '250000',
        stock: 12,
        totalTrades: '1400',
      },
    ]);
  });
});
