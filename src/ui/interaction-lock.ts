const MIN_DURATION = 200;
const MAX_DURATION = 400;
const DEFAULT_DURATION = 300;

export interface InteractionLockOptions {
  duration?: number;
  onLock?: () => void;
  onUnlock?: () => void;
}

export const clampInteractionLockDuration = (value?: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_DURATION;
  }
  const rounded = Math.round(value);
  if (rounded < MIN_DURATION) {
    return MIN_DURATION;
  }
  if (rounded > MAX_DURATION) {
    return MAX_DURATION;
  }
  return rounded;
};

export class InteractionLock {
  private locked = false;
  private timerId?: number;
  private defaultDuration: number;
  private readonly onLock?: () => void;
  private readonly onUnlock?: () => void;

  constructor(options?: InteractionLockOptions) {
    this.defaultDuration = clampInteractionLockDuration(options?.duration);
    this.onLock = options?.onLock;
    this.onUnlock = options?.onUnlock;
  }

  get isLocked(): boolean {
    return this.locked;
  }

  get duration(): number {
    return this.defaultDuration;
  }

  set duration(value: number) {
    this.defaultDuration = clampInteractionLockDuration(value);
  }

  lock(duration?: number): void {
    const actualDuration = clampInteractionLockDuration(duration ?? this.defaultDuration);
    if (this.timerId !== undefined) {
      window.clearTimeout(this.timerId);
    }

    const wasLocked = this.locked;
    this.locked = true;
    if (!wasLocked) {
      this.onLock?.();
    }

    this.timerId = window.setTimeout(() => this.unlock(), actualDuration);
  }

  unlock(): void {
    if (this.timerId !== undefined) {
      window.clearTimeout(this.timerId);
      this.timerId = undefined;
    }

    if (!this.locked) {
      return;
    }

    this.locked = false;
    this.onUnlock?.();
  }

  run<T>(callback: () => T, duration?: number): T | undefined {
    if (this.locked) {
      return undefined;
    }
    this.lock(duration);
    return callback();
  }

  wrap<E extends Event>(handler: (event: E) => void, duration?: number): (event: E) => void {
    return (event: E) => {
      if (this.locked) {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
        return;
      }

      this.lock(duration);
      handler(event);
    };
  }
}

export const withInteractionLock = <E extends Event>(
  handler: (event: E) => void,
  options?: InteractionLockOptions,
): ((event: E) => void) => {
  const lock = new InteractionLock(options);
  return lock.wrap(handler);
};
