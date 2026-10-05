"use client";

import { useRouter } from "next/navigation";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "@/lib/puck-config";
import { createRFI } from "@/lib/api";

const initialData = {
  content: [],
  root: {
    props: {
      title: "Untitled RFI",
      description: "",
      backgroundColor: "#ffffff",
      maxWidth: "768",
    },
  },
  zones: {},
};

export default function NewBuilderPage() {
  const router = useRouter();

  const handlePublish = async (data: any) => {
    try {
      const title = data.root?.props?.title || "Untitled RFI";
      const rfi = await createRFI({
        subject: title,
        question: data.root?.props?.description || "",
        created_by: "current_user",
        content: data,
      });
      router.push(`/rfi/${rfi.id}`);
    } catch (err) {
      console.error("Failed to save RFI:", err);
      alert("Failed to save RFI. Please try again.");
    }
  };

  return (
    <div style={{ height: "100vh" }}>
      <Puck
        config={puckConfig}
        data={initialData as any}
        onPublish={handlePublish}
        headerTitle="Create New RFI"
      />
    </div>
  );
}
