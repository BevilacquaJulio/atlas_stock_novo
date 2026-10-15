import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

window.scrollTo = vi.fn();
// jsdom não implementa scrollIntoView (usado pelo SelectField).
Element.prototype.scrollIntoView = vi.fn();

Object.defineProperty(navigator, 'locks', {
  configurable: true,
  value: {
    request: (_name: string, _options: unknown, run: () => Promise<unknown>) =>
      run(),
  },
});
