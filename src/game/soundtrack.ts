const soundtrackModules = import.meta.glob<string>("../../soundtrack/*.mp3", {
  eager: true,
  import: "default",
  query: "?url"
});

const trackName = (path: string) => path.split("/").pop()?.replace(/\.mp3$/i, "") ?? path;
const trackSorter = new Intl.Collator("pl", { numeric: true, sensitivity: "base" });

export const SOUNDTRACK_URLS = Object.entries(soundtrackModules)
  .sort(([left], [right]) => trackSorter.compare(trackName(left), trackName(right)))
  .map(([, url]) => url);
