import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

window.scrollTo = vi.fn();
// jsdom não implementa scrollIntoView (usado pelo SelectField).
Element.prototype.scrollIntoView = vi.fn();
