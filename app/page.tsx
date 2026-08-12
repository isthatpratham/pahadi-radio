import { RadioStation } from "@/components/radio-station";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-between overflow-hidden">
      <div className="hero-bg fixed inset-0 -z-20 bg-cover bg-center" aria-hidden="true" />
      <div
        className="fixed inset-0 -z-20 bg-gradient-to-b from-black/35 via-transparent to-black/80"
        aria-hidden="true"
      />
      <div className="grain fixed inset-0 -z-10" aria-hidden="true" />
      <RadioStation />
    </main>
  );
}
