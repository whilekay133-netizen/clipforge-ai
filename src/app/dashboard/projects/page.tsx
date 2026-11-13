import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { ProjectLibrary } from "@/components/dashboard/project-library";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" description="Every video you've created or started." actions={<Link href="/dashboard/create" className={buttonVariants()}><Plus className="h-4 w-4" /> New video</Link>} />
      <ProjectLibrary />
    </>
  );
}
