# Pahadi Radio

A tiny radio station hidden somewhere in the mountains.

## Development

```bash
npm install
npm run dev
```

The catalog intentionally ships without YouTube sources. Provide a valid YouTube `videoId` from a source you are authorized to use, with embedding enabled, before expecting playback.

### Test playback locally

Copy `.env.example` to `.env.local` and set:

```dotenv
NEXT_PUBLIC_YOUTUBE_TEST_VIDEO_ID=
```

In development only, this value is assigned to catalog track 1. Leave it empty until you have an authorized, embeddable test video. Restart the development server after changing it.

### Add an approved source permanently

In `data/playlists.ts`, update only the corresponding track line by supplying its seventh argument:

```ts
track(2, "Hafiz Hafiz", "Mohit Chauhan", "Laila Majnu", null, null, "APPROVED_VIDEO_ID")
```

`APPROVED_VIDEO_ID` above is documentation syntax, not a real or bundled video ID. Do not use unofficial uploads or videos without embedding permission.
