import { Suspense } from "react";

import { EditorLoading } from "@/components/editor/EditorLoading";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorWorkspace />
    </Suspense>
  );
}
