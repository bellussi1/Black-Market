import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HlmButton } from '@bdo/ui/button';

import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { ProfileScreenImportComponent } from './profile-screen-import';
import { ScansPage } from './scans-page';
import { detectScreenPanes, type ScreenKind } from './screen-recognition';
import { ScreenTextReader } from './screen-text-reader';

@Component({
  selector: 'app-automatic-scan-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TutorialSurfaceDirective, ScansPage, ProfileScreenImportComponent, HlmButton],
  templateUrl: './automatic-scan-page.html',
  styleUrl: './automatic-scan-page.scss',
})
export class AutomaticScanPage {
  readonly kind = signal<ScreenKind | null>(null);
  readonly reading = signal(false);
  readonly message = signal('');
  readonly profile = signal(false);
  readonly tutorialSurface = computed(() => {
    if (!this.kind()) return 'scans';
    return this.profile() ? 'scans-profile' : 'scans-review';
  });
  private readonly reader = inject(ScreenTextReader);
  private readonly scans = viewChild(ScansPage);
  private readonly profileImport = viewChild(ProfileScreenImportComponent);
  readonly tutorialReady = computed(() => {
    if (!this.kind()) return true;
    if (this.profile()) return !!this.profileImport()?.imageUrl();
    return (this.scans()?.cells().length ?? 0) > 0;
  });

  async choose(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || this.reading()) return;
    if (file.size > 10 * 1024 * 1024 || !/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      this.message.set('Escolha PNG, JPG ou WebP de até 10 MB.');
      return;
    }
    this.reading.set(true);
    this.message.set('Identificando a tela…');
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 12_000_000) throw new Error('Imagem muito grande.');
      const lines = await this.reader.read(bitmap, () => {});
      const panes = detectScreenPanes(lines, bitmap.width, bitmap.height);
      const kind = panes[0]?.kind ?? 'unknown';
      this.profile.set(['mastery', 'character-roster', 'character-status'].includes(kind));
      this.kind.set(kind);
      // Mount the detected review component before forwarding the selected file.
      setTimeout(() => {
        const forwarded = { target: { files: [file], value: '' } } as unknown as Event;
        if (this.profile()) void this.profileImport()?.chooseFile(forwarded, lines);
        else {
          const scans = this.scans();
          if (!scans) return;
          scans.detectedScreenPanes = panes;
          scans.captureMode =
            kind === 'inventory' ? 'inventory' : kind === 'equipment' ? 'gear' : 'storage';
          scans.autoRead.set(true);
          void scans.file(forwarded);
        }
      }, 0);
    } catch {
      this.message.set('Não foi possível identificar a imagem. Tente uma captura mais nítida.');
    } finally {
      bitmap?.close();
      this.reading.set(false);
    }
  }
}
