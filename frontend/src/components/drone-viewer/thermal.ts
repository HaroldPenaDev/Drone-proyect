/**
 * Maps Safety Factor → continuous color (RGB tuple in [0,1] for three.js).
 *
 * Thermal scale (cool = healthy → hot = critical):
 *   SF >= 5    : deep cyan      (#22d3ee)
 *   SF 3..5    : cyan → green   (transition)
 *   SF 2..3    : green → yellow (caution starts)
 *   SF 1.5..2  : yellow → red   (warning to critical)
 *   SF < 1.5   : pure red       (critical)
 */
export function safetyFactorToColor(sf: number): [number, number, number] {
  if (!Number.isFinite(sf) || sf <= 0) {
    return [0.93, 0.27, 0.27]; // crit red
  }

  // Stops in SF space and corresponding RGB (0..1).
  const stops: [number, [number, number, number]][] = [
    [1.5, [0.93, 0.27, 0.27]], // crit red #ef4444
    [2.0, [0.96, 0.62, 0.04]], // amber  #f59e0b
    [3.0, [0.84, 0.78, 0.06]], // yellow #d6c700
    [5.0, [0.06, 0.72, 0.51]], // good   #10b981
    [8.0, [0.13, 0.83, 0.93]], // accent #22d3ee
  ];

  if (sf <= stops[0][0]) return stops[0][1];
  if (sf >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];

  for (let i = 0; i < stops.length - 1; i++) {
    const [s0, c0] = stops[i];
    const [s1, c1] = stops[i + 1];
    if (sf >= s0 && sf <= s1) {
      const t = (sf - s0) / (s1 - s0);
      return [
        c0[0] + (c1[0] - c0[0]) * t,
        c0[1] + (c1[1] - c0[1]) * t,
        c0[2] + (c1[2] - c0[2]) * t,
      ];
    }
  }
  return stops[stops.length - 1][1];
}

export function safetyFactorToHex(sf: number): string {
  const [r, g, b] = safetyFactorToColor(sf);
  const h = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function safetyFactorLabel(sf: number): "critical" | "warn" | "watch" | "healthy" | "optimal" {
  if (sf < 1.5) return "critical";
  if (sf < 2.0) return "warn";
  if (sf < 3.0) return "watch";
  if (sf < 5.0) return "healthy";
  return "optimal";
}
