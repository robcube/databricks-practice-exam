import * as fc from 'fast-check';

describe('Client Property-Based Testing Setup', () => {
  test('fast-check is working correctly on client', () => {
    // Simple property test to verify fast-check setup
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return Math.abs(n) >= 0;
      }),
      { numRuns: 100 }
    );
  });

  test('array operations property', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const reversed = [...arr].reverse();
        return reversed.reverse().every((val, idx) => val === arr[idx]);
      }),
      { numRuns: 100 }
    );
  });
});