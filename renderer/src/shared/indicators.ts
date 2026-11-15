/** One-line, plain-language definitions shown next to each indicator. */
const BLURBS: Record<string, string> = {
  air_temp_2m: "The air temperature at head height: what a thermometer in your garden would say.",
  precipitation: "All the rain (and snow) the sky drops on a city, in millimetres per day.",
  surface_temp_day: "How hot the ground itself gets in the afternoon: think of the pavement under your shoes.",
  surface_temp_night: "How warm the ground still is in the dead of night, when a city should be cooling off.",
  ndvi: "A satellite's greenness score for plants: near 0 is bare ground, near 1 is a lush jungle.",
};

export const blurb = (indicator: string): string => BLURBS[indicator] ?? '';
