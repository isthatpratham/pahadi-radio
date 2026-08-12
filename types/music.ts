export type Track = {
  id: string;
  title: string;
  artist: string;
  film: string;
  year: number | null;
  duration: string;
  videoId: string | null;
};

export type Playlist = {
  id: string;
  number: string;
  name: string;
  description: string;
  tracks: Track[];
};
