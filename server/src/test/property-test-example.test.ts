import * as fc from 'fast-check';

describe('Property-Based Testing Setup', () => {
  test('fast-check is working correctly', () => {
    // Simple property test to verify fast-check setup
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      }),
      { numRuns: 100 }
    );
  });

  test('string concatenation property', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        const result = a + b;
        return result.length === a.length + b.length;
      }),
      { numRuns: 100 }
    );
  });
});