export type Track = {
  id: number;
  title: string;
  artist: string;
  film: string;
  year: number | null;
  duration: number | null;
  videoId: string | null;
};

export type Playlist = {
  id: string;
  number: string;
  name: string;
  description: string;
  tracks: Track[];
};
