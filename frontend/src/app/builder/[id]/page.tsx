"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "@/lib/puck-config";
import { fetchRFI, updateRFI } from "@/lib/api";

export default function EditBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const rfi = await fetchRFI(id);
        if (rfi.content) {
          setData(rfi.content);
        } else {
          setData({
            content: [],
            root: {
              props: {
                title: rfi.subject,
                description: rfi.question,
                backgroundColor: "#ffffff",
                maxWidth: "768",
              },
            },
            zones: {},
          });
        }
      } catch (err) {
        console.error(err);
        alert("Failed to load RFI");
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  const handlePublish = async (updatedData: any) => {
    try {
      const title = updatedData.root?.props?.title || "Untitled RFI";
      await updateRFI(id, {
        subject: title,
        question: updatedData.root?.props?.description || "",
        content: updatedData,
      });
      router.push(`/rfi/${id}`);
    } catch (err) {
      console.error("Failed to save RFI:", err);
      alert("Failed to save RFI. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <div style={{ height: "100vh" }}>
      <Puck
        config={puckConfig}
        data={data}
        onPublish={handlePublish}
        headerTitle="Edit RFI"
      />
    </div>
  );
}
