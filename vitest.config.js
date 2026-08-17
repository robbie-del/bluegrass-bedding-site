import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
    globals: false,
    restoreMocks: true,
    // No coverage provider is configured on purpose. assets/events.js is a browser
    // IIFE that the tests evaluate with new Function(), so V8 cannot attribute the
    // executed code back to the source file and always reports 0% — a misleading
    // number rather than a useful one. Coverage of that file is enforced by review
    // and by the export-shim rule in AGENTS.md instead.
  },
});
