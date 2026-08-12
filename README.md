# Pahadi Radio

A tiny radio station hidden somewhere in the mountains.

## Development

```bash
npm install
npm run dev
```

The active catalog contains only explicitly approved YouTube sources. YouTube's visible IFrame Player remains the runtime authority for playback and embedding availability.

### Add an approved source

```ts
{
  id: "track-id",
  title: "Track title",
  artist: "Artist",
  film: "Film or Indie",
  year: 2026,
  duration: "",
  videoId: "APPROVED_VIDEO_ID",
}
```

Add the shared object to the appropriate playlist arrays. Leave `duration` empty unless a canonical value is known; the player reads the actual runtime duration from YouTube.

`APPROVED_VIDEO_ID` is documentation syntax, not a real source. Only use authorized uploads with embedding enabled.
