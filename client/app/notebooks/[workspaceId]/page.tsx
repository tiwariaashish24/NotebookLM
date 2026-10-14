import NotebookWorkspace from "@/components/notebook-workspace";

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <NotebookWorkspace workspaceId={workspaceId} />;
}
