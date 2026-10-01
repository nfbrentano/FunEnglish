import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActivityPlayer } from "@/components/player/activity-player";
import { PlayerMessage } from "@/components/player/player-message";
import { getBuildActivities } from "@/lib/catalog/build-data";
import { strings } from "@/lib/strings";

// Static export: one page per activity published at build time. Activities published later are
// served by /play-shell through a Firebase Hosting rewrite (see firebase.json).
export const dynamicParams = false;

/** Static export needs at least one path; this one renders as 404. */
const NO_ACTIVITIES = "_";

export async function generateStaticParams() {
  const activities = await getBuildActivities();
  return activities.length > 0
    ? activities.map(({ slug }) => ({ slug }))
    : [{ slug: NO_ACTIVITIES }];
}

async function find(slug: string) {
  return (await getBuildActivities()).find((entry) => entry.slug === slug);
}

export async function generateMetadata({ params }: PageProps<"/play/[slug]">): Promise<Metadata> {
  const activity = (await find((await params).slug))?.activity;
  return activity ? { title: activity.title, description: activity.description } : {};
}

export default async function PlayPage({ params }: PageProps<"/play/[slug]">) {
  const entry = await find((await params).slug);
  if (!entry) notFound();

  if (!entry.activity) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
        <PlayerMessage title={strings.player.loadError}>
          {strings.player.loadErrorHint}
        </PlayerMessage>
      </div>
    );
  }
  return <ActivityPlayer activity={entry.activity} />;
}
