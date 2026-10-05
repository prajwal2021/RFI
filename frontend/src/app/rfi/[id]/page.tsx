"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Render } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "@/lib/puck-config";
import { fetchRFI, RFI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Download } from "lucide-react";
import { format } from "date-fns";

const STATUS_VARIANT: Record<string, "draft" | "open" | "answered" | "closed"> = {
  draft: "draft",
  open: "open",
  answered: "answered",
  closed: "closed",
};

export default function ViewRFIPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [rfi, setRfi] = useState<RFI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchRFI(id);
        setRfi(data);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading RFI...
      </div>
    );
  }

  if (!rfi) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">{rfi.subject}</h1>
                  <Badge variant={STATUS_VARIANT[rfi.status]}>{rfi.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Created by {rfi.created_by} on{" "}
                  {format(new Date(rfi.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/builder/${rfi.id}`)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Rendered Content */}
      <main className="py-8">
        {rfi.content ? (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <Render config={puckConfig} data={rfi.content as any} />
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <h2 className="text-xl font-semibold mb-4">{rfi.subject}</h2>
              {rfi.question && (
                <p className="text-muted-foreground whitespace-pre-wrap">{rfi.question}</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
