import { Injectable, signal } from '@angular/core';

/** Minimal toast for prototype actions that are acknowledged but not executed. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _message = signal<string | null>(null);
  readonly message = this._message.asReadonly();
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(message: string): void {
    this._message.set(message);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this._message.set(null), 3200);
  }
}
