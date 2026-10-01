import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Knight's Descent: Into the Inferno" },
      { name: "description", content: "A retro pixel-art knight adventure into the inferno. Play free in your browser." },
      { property: "og:title", content: "Knight's Descent: Into the Inferno" },
      { property: "og:description", content: "A retro pixel-art knight adventure into the inferno. Play free in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/game.html"
      title="Knight's Descent: Into the Inferno"
      className="fixed inset-0 h-screen w-screen border-0"
      allow="autoplay; fullscreen"
    />
  );
}
