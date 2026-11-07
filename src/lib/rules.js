// The rule engine: turns live PSI + rain forecast into an indoor/outdoor
// decision, then ranks places. Pure functions only, so the same file can
// move into the Express backend later without changes.

// NEA's 24-hour PSI bands.
export function psiBand(psi) {
  if (psi == null) return 'Unknown';
  if (psi <= 50) return 'Good';
  if (psi <= 100) return 'Moderate';
  if (psi <= 200) return 'Unhealthy';
  if (psi <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

export function isWet(forecast) {
  return /rain|shower|thunder/i.test(forecast || '');
}

// mode: 'indoor' | 'outdoor' | 'either'
// tone: 'bad' | 'warn' | 'good' (drives the banner colour)
export function decide({ psi, forecast, area }) {
  if (psi != null && psi > 100) {
    return {
      mode: 'indoor',
      cause: 'haze',
      tone: psi > 200 ? 'bad' : 'warn',
      headline: 'HAZE TODAY.\nSTAY IN.',
      detail: `PSI is ${psiBand(psi).toLowerCase()} around you. Skip the outdoor run today.`,
    };
  }
  if (isWet(forecast)) {
    const thunder = /thunder/i.test(forecast);
    return {
      mode: 'indoor',
      cause: 'rain',
      tone: thunder ? 'bad' : 'warn',
      headline: thunder ? 'STORMS NEARBY.\nSTAY IN.' : 'RAIN NEARBY.\nSTAY IN.',
      detail: `${forecast} expected in ${area} over the next 2 hours.`,
    };
  }
  if (psi != null && psi > 50) {
    return {
      mode: 'either',
      cause: 'moderate',
      tone: 'warn',
      headline: 'OK TO\nGO OUT.',
      detail: 'Air is moderate and no rain is expected. Fine for a walk.',
    };
  }
  return {
    mode: 'outdoor',
    cause: 'clear',
    tone: 'good',
    headline: 'GREAT DAY\nTO BE OUT.',
    detail: 'Good air and no rain expected for the next 2 hours.',
  };
}

const REASONS = {
  haze: { indoor: 'Indoors, so the haze won’t matter.' },
  rain: { indoor: 'Indoors, so you stay dry.' },
  moderate: {
    outdoor: 'Air is moderate, fine for an easy walk.',
    indoor: 'Indoors, if you’d rather skip the moderate air.',
  },
  clear: { outdoor: 'Good air and no rain. A good time to go.' },
};

export function distanceKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearest(point, items) {
  let best = null;
  let bestD = Infinity;
  for (const it of items) {
    const d = distanceKm(point, it);
    if (d < bestD) {
      best = it;
      bestD = d;
    }
  }
  return best;
}

// Keep places that suit the decision, closest first.
// For 'either', outdoor places win ties because the weather allows it.
export function rank(places, decision, here, count = 3) {
  const fits = (p) => decision.mode === 'either' || p.setting === decision.mode;
  return places
    .filter(fits)
    .map((p) => ({ ...p, km: distanceKm(here, p) }))
    .sort((a, b) => {
      if (decision.mode === 'either' && a.setting !== b.setting) {
        return a.setting === 'outdoor' ? -1 : 1;
      }
      return a.km - b.km;
    })
    .slice(0, count)
    .map((p) => ({ ...p, reason: REASONS[decision.cause][p.setting] }));
}
