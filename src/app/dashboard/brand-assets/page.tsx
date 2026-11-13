import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { BrandAssets } from "@/components/dashboard/brand-assets";

export const metadata: Metadata = { title: "Brand assets" };

export default function BrandAssetsPage() {
  return (
    <>
      <PageHeader title="Brand assets" description="Logos and brand files for your videos." />
      <BrandAssets />
    </>
  );
}
