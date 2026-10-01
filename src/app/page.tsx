import { HomeView } from "@/components/pages/home-view";
import { getBuildCatalog, getPublicImagePaths } from "@/lib/catalog/build-data";

export default async function Home() {
  const catalog = await getBuildCatalog();
  return <HomeView initial={catalog} imagePaths={getPublicImagePaths()} />;
}
