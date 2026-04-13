export function getSeason(week) {
  if (week <= 8 || week >= 49) return "Winter";
  if (week <= 21)              return "Spring";
  if (week <= 35)              return "Summer";
  return "Fall";
}
