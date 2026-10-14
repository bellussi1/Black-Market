import { describe, expect, it, vi } from 'vitest';

import { RoadmapController } from './roadmap.controller';

describe('RoadmapController', () => {
  it('keeps the public page readable without an admin session', async () => {
    const response = { entries: [], updatedAt: null };
    const roadmap = { list: vi.fn().mockResolvedValue(response) };
    const identity = { roadmapAdmin: vi.fn() };
    const controller = new RoadmapController(roadmap as never, identity as never);
    await expect(controller.getPublic()).resolves.toEqual(response);
    expect(identity.roadmapAdmin).not.toHaveBeenCalled();
  });

  it('verifies admin access before reading or replacing the managed content', async () => {
    const identity = { roadmapAdmin: vi.fn().mockRejectedValue(new Error('forbidden')) };
    const roadmap = { list: vi.fn(), replace: vi.fn() };
    const controller = new RoadmapController(roadmap as never, identity as never);
    await expect(controller.getForManagement('Bearer user')).rejects.toThrow('forbidden');
    await expect(controller.replace('Bearer user', { entries: [] })).rejects.toThrow('forbidden');
    expect(identity.roadmapAdmin).toHaveBeenCalledTimes(2);
    expect(roadmap.list).not.toHaveBeenCalled();
    expect(roadmap.replace).not.toHaveBeenCalled();
  });
});
