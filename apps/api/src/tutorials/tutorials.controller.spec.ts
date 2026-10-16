import 'reflect-metadata';

import { NotFoundException, RequestMethod } from '@nestjs/common';
import { HEADERS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import { TutorialsController } from './tutorials.controller';

function controllerHandler(methodName: keyof TutorialsController): object {
  const descriptor = Object.getOwnPropertyDescriptor(TutorialsController.prototype, methodName);
  if (!descriptor?.value) {
    throw new Error(`Missing handler ${String(methodName)}`);
  }
  return descriptor.value as object;
}

describe('TutorialsController', () => {
  it('serves a public registered guide without checking identity and keeps the public cache policy', async () => {
    const response = {
      guide: {
        screenKey: 'market' as const,
        locale: 'pt-BR' as const,
        updatedAt: '2026-10-15T12:00:00.000Z',
        steps: [
          {
            sortOrder: 0,
            anchorKey: 'market.search',
            title: 'Buscar',
            body: 'Pesquise um item.',
          },
        ],
      },
    };
    const tutorials = { getPublished: vi.fn().mockResolvedValue(response) };
    const identity = { roadmapAdmin: vi.fn() };
    const controller = new TutorialsController(tutorials as never, identity as never);

    await expect(controller.getPublic('market', 'pt-BR')).resolves.toEqual(response);
    expect(identity.roadmapAdmin).not.toHaveBeenCalled();
    expect(tutorials.getPublished).toHaveBeenCalledWith('market', 'pt-BR');

    const headers = Reflect.getMetadata(HEADERS_METADATA, controllerHandler('getPublic')) as Array<{
      name: string;
      value: string;
    }>;
    expect(headers).toContainEqual({
      name: 'Cache-Control',
      value: 'public, max-age=60, stale-while-revalidate=300',
    });
  });

  it('returns 404 for an unregistered public screen', async () => {
    const tutorials = {
      getPublished: vi.fn().mockRejectedValue(new NotFoundException('Tela não registrada.')),
    };
    const identity = { roadmapAdmin: vi.fn() };
    const controller = new TutorialsController(tutorials as never, identity as never);

    await expect(controller.getPublic('unknown', 'pt-BR')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(identity.roadmapAdmin).not.toHaveBeenCalled();
  });

  it('checks the roadmap administrator before both management operations', async () => {
    const identity = { roadmapAdmin: vi.fn().mockRejectedValue(new Error('forbidden')) };
    const tutorials = { getManagement: vi.fn(), replace: vi.fn() };
    const controller = new TutorialsController(tutorials as never, identity as never);

    await expect(controller.getForManagement('Bearer user')).rejects.toThrow('forbidden');
    await expect(
      controller.replace('Bearer user', 'market', 'pt-BR', {
        expectedUpdatedAt: null,
        enabled: true,
        steps: [],
      }),
    ).rejects.toThrow('forbidden');

    expect(identity.roadmapAdmin).toHaveBeenCalledTimes(2);
    expect(tutorials.getManagement).not.toHaveBeenCalled();
    expect(tutorials.replace).not.toHaveBeenCalled();
  });

  it('keeps manage routes distinct from the dynamic screen route', () => {
    const methodNames = Object.getOwnPropertyNames(TutorialsController.prototype).filter(
      (name) => name !== 'constructor',
    );
    expect(methodNames.indexOf('getForManagement')).toBeLessThan(methodNames.indexOf('getPublic'));

    expect(Reflect.getMetadata(PATH_METADATA, controllerHandler('getForManagement'))).toBe(
      'manage',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, controllerHandler('getForManagement'))).toBe(
      RequestMethod.GET,
    );

    expect(Reflect.getMetadata(PATH_METADATA, controllerHandler('replace'))).toBe(
      'manage/:screenKey',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, controllerHandler('replace'))).toBe(
      RequestMethod.PUT,
    );

    expect(Reflect.getMetadata(PATH_METADATA, controllerHandler('getPublic'))).toBe(':screenKey');
    expect(Reflect.getMetadata(METHOD_METADATA, controllerHandler('getPublic'))).toBe(
      RequestMethod.GET,
    );

    const manageGetHeaders = Reflect.getMetadata(
      HEADERS_METADATA,
      controllerHandler('getForManagement'),
    ) as Array<{ name: string; value: string }>;
    const managePutHeaders = Reflect.getMetadata(
      HEADERS_METADATA,
      controllerHandler('replace'),
    ) as Array<{ name: string; value: string }>;

    expect(manageGetHeaders).toContainEqual({
      name: 'Cache-Control',
      value: 'private, no-store',
    });
    expect(managePutHeaders).toContainEqual({
      name: 'Cache-Control',
      value: 'private, no-store',
    });
  });
});
