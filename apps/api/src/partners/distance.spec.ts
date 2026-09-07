import { haversineKm, isUsableCoordinate, roadDistanceKm } from '@gridx/shared';

/**
 * Module 4 ranks partners partly on distance. It used to be typed in by hand while the partner's
 * coordinates sat unused on the record — easy to get wrong, and open to being understated so a
 * partner ranks better than they should.
 */

// OSWAR's plant and the pilot partner towns, as used in the seed.
const NAGPUR = { latitude: 21.1458, longitude: 79.0882 };
const BUTIBORI = { latitude: 20.9333, longitude: 78.9833 };
const UMRED = { latitude: 20.85, longitude: 79.3167 };

describe('haversineKm', () => {
  it('is zero for a point against itself', () => {
    expect(haversineKm(NAGPUR, NAGPUR)).toBe(0);
  });

  it('measures a known short hop about right', () => {
    // Nagpur to Butibori is roughly 25 km as the crow flies.
    expect(haversineKm(NAGPUR, BUTIBORI)).toBeGreaterThan(20);
    expect(haversineKm(NAGPUR, BUTIBORI)).toBeLessThan(30);
  });

  it('does not care which way round the two points are given', () => {
    expect(haversineKm(NAGPUR, UMRED)).toBeCloseTo(haversineKm(UMRED, NAGPUR), 6);
  });
});

describe('isUsableCoordinate', () => {
  it('accepts a real location', () => {
    expect(isUsableCoordinate(21.1458, 79.0882)).toBe(true);
  });

  it.each([
    ['a missing latitude', null, 79.0882],
    ['a missing longitude', 21.1458, undefined],
    ['an out-of-range latitude', 91, 79.0882],
    ['an out-of-range longitude', 21.1458, 181],
    // 0,0 is in the Atlantic — it is an unfilled default, not a workshop.
    ['null island', 0, 0],
  ])('rejects %s', (_label, lat, lon) => {
    expect(isUsableCoordinate(lat as number, lon as number)).toBe(false);
  });
});

describe('roadDistanceKm', () => {
  it('allows for roads being longer than the straight line', () => {
    const straight = haversineKm(NAGPUR, BUTIBORI);
    const road = roadDistanceKm(NAGPUR, BUTIBORI);
    expect(road).not.toBeNull();
    expect(road!).toBeGreaterThan(straight);
  });

  it('returns nothing when the plant has no coordinates, so the entered figure stands', () => {
    expect(roadDistanceKm(null, BUTIBORI)).toBeNull();
    expect(roadDistanceKm({ latitude: null, longitude: null }, BUTIBORI)).toBeNull();
  });

  it('returns nothing when the partner has no coordinates', () => {
    expect(roadDistanceKm(NAGPUR, undefined)).toBeNull();
  });

  it('ranks a nearer partner below a further one, which is what allocation reads', () => {
    const butibori = roadDistanceKm(NAGPUR, BUTIBORI)!;
    const umred = roadDistanceKm(NAGPUR, UMRED)!;
    expect(butibori).toBeLessThan(umred);
  });

  it('rounds to two places rather than carrying float noise into the ranking', () => {
    const distance = roadDistanceKm(NAGPUR, UMRED)!;
    expect(distance).toBe(Math.round(distance * 100) / 100);
  });
});
