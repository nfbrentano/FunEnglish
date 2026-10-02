import type { Metadata } from "next";
import { HomeView } from "@/components/pages/home-view";
import { getBuildCatalog, getPublicImagePaths } from "@/lib/catalog/build-data";
import { SITE_NAME } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `${SITE_NAME} – Interactive ESL Activities`,
  absoluteTitle: true,
  description: "Interactive English activities, games and quizzes for ESL teachers.",
  path: "/",
});

export default async function Home() {
  const catalog = await getBuildCatalog();
  return <HomeView initial={catalog} imagePaths={getPublicImagePaths()} />;
}
