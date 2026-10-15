import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { expectTutorialAnchors, useTutorialGuideStub } from '../../testing/tutorial-test-setup';
import { AutomaticScanPage } from './automatic-scan-page';
import { ProfileScreenImportComponent } from './profile-screen-import';
import { ScansPage } from './scans-page';

@Component({ selector: 'app-scans-page', template: '<p>Revisão de itens</p>' })
class ItemsReviewStub {}

@Component({ selector: 'app-profile-screen-import', template: '<p>Revisão de perfil</p>' })
class ProfileReviewStub {}

describe('Automatic scan tutorial integration', () => {
  useMemoryStorage();
  useTutorialGuideStub();

  it('exposes capture and review anchors only in their visible states', async () => {
    TestBed.overrideComponent(AutomaticScanPage, {
      remove: { imports: [ScansPage, ProfileScreenImportComponent] },
      add: { imports: [ItemsReviewStub, ProfileReviewStub] },
    });
    const fixture = await renderComponent(AutomaticScanPage);
    expectTutorialAnchors(fixture, 'scans', ['scans.capture']);
    for (const profile of [false, true]) {
      fixture.componentInstance.profile.set(profile);
      fixture.componentInstance.kind.set(profile ? 'mastery' : 'storage');
      fixture.detectChanges();
      expectTutorialAnchors(fixture, 'scans', ['scans.review']);
    }
    fixture.componentInstance.kind.set(null);
    fixture.detectChanges();
    expectTutorialAnchors(fixture, 'scans', ['scans.capture']);
  });
});
