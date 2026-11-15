/** Concise indicator definitions shown on hover and on the About page. */
const BLURBS: Record<string, string> = {
  air_temp_2m: "Average air temperature measured 2 metres above the ground.",
  precipitation: "Average daily rainfall and other precipitation, reported for each month.",
  surface_temp_day: "Average temperature of the land surface during daytime satellite observations.",
  surface_temp_night: "Average temperature of the land surface during nighttime satellite observations.",
  ndvi: "A satellite measure of how green the land is. Higher values generally indicate more green vegetation.",
};

export const blurb = (indicator: string): string => BLURBS[indicator] ?? '';
