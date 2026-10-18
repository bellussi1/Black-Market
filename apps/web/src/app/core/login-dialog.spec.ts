import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { LoginDialog } from './login-dialog';
import { LoginIntentService } from './login-intent.service';

describe('LoginDialog', () => {
  it('uses native modal semantics and cancels Escape without navigation', () => {
    const fixture = TestBed.createComponent(LoginDialog);
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(element.getAttribute('aria-labelledby')).toBe('login-dialog-title');
    const intent = TestBed.inject(LoginIntentService);
    intent.request('/plans');
    const cancel = new Event('cancel', { cancelable: true });
    element.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(intent.opened()).toBe(false);
    expect(intent.returnUrl()).toBeNull();
  });
});
