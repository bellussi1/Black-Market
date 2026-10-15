import { NotFoundException, RequestMethod } from '@nestjs/common';
import { HEADERS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import { TutorialsController } from './tutorials.controller';
import { TutorialsService } from './tutorials.service';

function getHandlerMetadata(metadataKey: string, methodName: string): unknown {
  const handler = Object.getOwnPropertyDescriptor(TutorialsController.prototype, methodName)
    ?.value as object | undefined;
  return handler ? Reflect.getMetadata(metadataKey, handler) : undefined;
}

describe('TutorialsController', () => {
  it('serves a public registered guide without checking identity and keeps the public cache policy', async () => {
    const response = {
      guide: {
        screenKey: 'market',
        locale: 'pt-BR',
        updatedAt: '2026-10-15T12:00:00.000Z',
        steps: [
          { sortOrder: 0, anchorKey: 'market.search', title: 'Buscar', body: 'Filtre itens.' },
        ],
      },
    };
    const tutorials = { getPublished: vi.fn().mockResolvedValue(response) };
    const identity = { roadmapAdmin: vi.fn() };
    const controller = new TutorialsController(tutorials as never, identity as never);

    await expect(controller.getPublic('market')).resolves.toEqual(response);

    expect(tutorials.getPublished).toHaveBeenCalledWith('market', 'pt-BR');
    expect(identity.roadmapAdmin).not.toHaveBeenCalled();
    expect(getHandlerMetadata(HEADERS_METADATA, 'getPublic')).toEqual([
      { name: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=300' },
    ]);
  });

  it('returns 404 for an unregistered public screen', async () => {
    const identity = { roadmapAdmin: vi.fn() };
    const controller = new TutorialsController(
      new TutorialsService({} as never),
      identity as never,
    );

    await expect(controller.getPublic('unknown-screen')).rejects.toBeInstanceOf(NotFoundException);
    expect(identity.roadmapAdmin).not.toHaveBeenCalled();
  });

  it('checks the roadmap administrator before both management operations and stops after denial', async () => {
    const identity = { roadmapAdmin: vi.fn().mockRejectedValue(new Error('forbidden')) };
    const tutorials = { getManagement: vi.fn(), replace: vi.fn() };
    const controller = new TutorialsController(tutorials as never, identity as never);
    const input = { expectedUpdatedAt: null, enabled: false, steps: [] };

    await expect(controller.getForManagement('Bearer user')).rejects.toThrow('forbidden');
    await expect(controller.replace('Bearer user', 'market', 'pt-BR', input)).rejects.toThrow(
      'forbidden',
    );

    expect(identity.roadmapAdmin).toHaveBeenCalledTimes(2);
    expect(identity.roadmapAdmin).toHaveBeenNthCalledWith(1, 'Bearer user');
    expect(identity.roadmapAdmin).toHaveBeenNthCalledWith(2, 'Bearer user');
    expect(tutorials.getManagement).not.toHaveBeenCalled();
    expect(tutorials.replace).not.toHaveBeenCalled();
    expect(getHandlerMetadata(HEADERS_METADATA, 'getForManagement')).toEqual([
      { name: 'Cache-Control', value: 'private, no-store' },
    ]);
    expect(getHandlerMetadata(HEADERS_METADATA, 'replace')).toEqual([
      { name: 'Cache-Control', value: 'private, no-store' },
    ]);
  });

  it('checks the roadmap administrator before passing management requests to the service', async () => {
    const identity = { roadmapAdmin: vi.fn().mockResolvedValue('admin-owner') };
    const management = {
      screens: [],
      locales: ['pt-BR'],
      guides: [{ id: 'disabled-guide', screenKey: 'market', locale: 'pt-BR', enabled: false }],
    };
    const saved = { id: 'guide-id', screenKey: 'market', locale: 'pt-BR' };
    const tutorials = {
      getManagement: vi.fn().mockResolvedValue(management),
      replace: vi.fn().mockResolvedValue(saved),
    };
    const controller = new TutorialsController(tutorials as never, identity as never);
    const input = { expectedUpdatedAt: null, enabled: false, steps: [] };

    await expect(controller.getForManagement('Bearer admin')).resolves.toEqual(management);
    await expect(controller.replace('Bearer admin', 'market', 'pt-BR', input)).resolves.toEqual(
      saved,
    );

    expect(identity.roadmapAdmin).toHaveBeenCalledTimes(2);
    expect(identity.roadmapAdmin.mock.invocationCallOrder[0]).toBeLessThan(
      tutorials.getManagement.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(identity.roadmapAdmin.mock.invocationCallOrder[1]).toBeLessThan(
      tutorials.replace.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(tutorials.getManagement).toHaveBeenCalledOnce();
    expect(tutorials.replace).toHaveBeenCalledWith('market', 'pt-BR', input);
  });

  it('keeps manage routes distinct and declared before the dynamic screen route', () => {
    const prototype = TutorialsController.prototype;
    const routeMetadata = Object.getOwnPropertyNames(prototype)
      .filter((methodName) => methodName !== 'constructor')
      .map((methodName) => {
        return {
          methodName,
          path: getHandlerMetadata(PATH_METADATA, methodName),
          method: getHandlerMetadata(METHOD_METADATA, methodName),
        };
      });

    expect(Reflect.getMetadata(PATH_METADATA, TutorialsController)).toBe('tutorials');
    expect(routeMetadata).toEqual([
      { methodName: 'getForManagement', path: 'manage', method: RequestMethod.GET },
      { methodName: 'replace', path: 'manage/:screenKey', method: RequestMethod.PUT },
      { methodName: 'getPublic', path: ':screenKey', method: RequestMethod.GET },
    ]);
  });
});
