import { getHeroContent } from "@/lib/api";
import { Hero } from "@/components/home/hero";
import { MinistriesPreview } from "@/components/home/ministries-preview";
import { LatestMessage } from "@/components/home/latest-message";
import { EventsTeaser } from "@/components/home/events-teaser";
import { GiveBand } from "@/components/home/give-band";

export default async function HomePage() {
  const heroContent = await getHeroContent();

  return (
    <>
      <Hero content={heroContent} />
      <MinistriesPreview />
      <LatestMessage />
      <EventsTeaser />
      <GiveBand />
    </>
  );
}
