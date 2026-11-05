// Vitest setup for component tests. Wires @testing-library/jest-dom matchers
// into Vitest's expect() so component tests can use readable assertions like
// toBeInTheDocument, toHaveAttribute, and toBeDisabled. Runs before each test
// file per vite.config.ts setupFiles.
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/dom';

// Coverage runs keep per-file jsdom isolation, so asynchronous UI assertions need
// enough time for a queued render on a loaded CI worker.
configure({ asyncUtilTimeout: 3_000 });
