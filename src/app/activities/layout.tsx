import { CategoryBar } from "@/components/layout/category-bar";

export default function ActivitiesLayout({ children }: LayoutProps<"/activities">) {
  return (
    <>
      <CategoryBar />
      {children}
    </>
  );
}
