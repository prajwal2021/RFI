"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { fetchRFI, fetchSubmissions, RFI, Submission } from "@/lib/api";
import { format } from "date-fns";
import { fieldsForContent, buildRows } from "@/lib/submission-fields";
import { buildExportTable } from "@/lib/export";
import ExportMenu from "@/components/export-menu";


export default function SubmissionsPage() {
  const params = useParams();
  const id = params.id as string;

  const [rfi, setRfi] = useState<RFI | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rfiData, subsData] = await Promise.all([
        fetchRFI(id),
        fetchSubmissions(id),
      ]);
      setRfi(rfiData);
      setSubmissions(subsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const formFields = useMemo(() => fieldsForContent(rfi?.content), [rfi?.content]);

  const getFieldRows = (data: Record<string, any>) => buildRows(formFields, data);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 mx-auto" />
          <p className="text-gray-500">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white rounded-xl shadow-sm border p-8 max-w-md">
          <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load submissions
          </h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Submissions: {rfi?.subject || "RFI"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {submissions.length} submission{submissions.length !== 1 ? "s" : ""} received
                {rfi && (
                  <span>
                    {" "}&middot; Created by {rfi.created_by} on{" "}
                    {format(new Date(rfi.created_at), "MMM d, yyyy")}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportMenu
                disabled={submissions.length === 0}
                baseName={rfi?.subject || "responses"}
                getRows={() =>
                  buildExportTable(
                    submissions.map((s) => ({ ...s, rfi_subject: rfi?.subject })),
                    () => formFields,
                    rfi?.subject
                  )
                }
              />
              <button
                onClick={loadData}
                className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {submissions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-16 text-center">
            <div className="text-5xl mb-4">&#x1F4ED;</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No submissions yet
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {rfi?.is_published
                ? "Share the public link with respondents to start collecting submissions."
                : "Publish this RFI first to start collecting submissions."}
            </p>
            {rfi?.is_published && rfi.publish_key && (
              <div className="mt-6 inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-4 py-2">
                <span className="text-sm text-gray-600 font-mono">
                  {typeof window !== "undefined" && window.location.origin}/rfi/public/{rfi.publish_key}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/rfi/public/${rfi.publish_key}`
                    );
                  }}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((sub, idx) => {
              const rows = getFieldRows(sub.data);
              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-xl shadow-sm border overflow-hidden"
                >
                  <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        #{submissions.length - idx}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {sub.submitted_by_name || "Anonymous"}
                        </div>
                        {sub.submitted_by_email && (
                          <div className="text-xs text-gray-500">
                            {sub.submitted_by_email}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(new Date(sub.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  <div className="px-6 py-4">
                    <table className="w-full text-sm">
                      <tbody>
                        {rows.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="py-3 pr-6 font-medium text-gray-600 align-top w-1/3">
                              {row.label}
                            </td>
                            <td className="py-3 text-gray-900 whitespace-pre-wrap">
                              {row.value.startsWith("data:image") ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={row.value} alt="" className="max-h-28 rounded border border-gray-200 bg-white" />
                              ) : (
                                row.value
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
