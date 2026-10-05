"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { fetchPublicRFI, submitPublicRFI } from "@/lib/api";

export default function PublicFormPage() {
  const params = useParams();
  const key = params.key as string;
  const containerRef = useRef<HTMLDivElement>(null);

  const [rfi, setRfi] = useState<{ subject: string; content: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchPublicRFI(key)
      .then(setRfi)
      .catch(() => setError("This RFI is not available or has been unpublished."))
      .finally(() => setLoading(false));
  }, [key]);

  const handleSubmit = async () => {
    if (!containerRef.current) return;
    setSubmitting(true);

    const data: Record<string, any> = {};
    const inputs = containerRef.current.querySelectorAll(
      "input, textarea, select"
    );
    let fieldIndex = 0;

    inputs.forEach((el) => {
      const input = el as HTMLInputElement;
      const fieldName =
        input.name || input.id || input.placeholder || `field_${fieldIndex++}`;

      if (input.type === "checkbox") {
        if (!data[fieldName]) data[fieldName] = [];
        if (input.checked) (data[fieldName] as string[]).push(input.value || "on");
      } else if (input.type === "radio") {
        if (input.checked) data[fieldName] = input.value;
      } else if (input.type === "file") {
        if (input.files?.length) {
          data[fieldName] = Array.from(input.files).map((f) => f.name);
        }
      } else if (el.tagName === "SELECT") {
        const select = el as HTMLSelectElement;
        data[fieldName] = select.value;
      } else if (el.tagName === "TEXTAREA") {
        data[fieldName] = (el as HTMLTextAreaElement).value;
      } else {
        data[fieldName] = input.value;
      }
    });

    try {
      await submitPublicRFI(key, {
        data,
        submitted_by_name: name || undefined,
        submitted_by_email: email || undefined,
      });
      setSubmitted(true);
    } catch {
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 mx-auto" />
          <p className="text-gray-500">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-4xl">🔒</div>
          <h1 className="mb-2 text-xl font-semibold text-gray-900">Not Available</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-4xl">✅</div>
          <h1 className="mb-2 text-xl font-semibold text-gray-900">
            Response Submitted
          </h1>
          <p className="text-gray-500">
            Thank you for your response. Your submission has been recorded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">{rfi?.subject}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Please fill out the form below and submit your response.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* RFI rendered content */}
        {rfi?.content?.css && (
          <style dangerouslySetInnerHTML={{ __html: rfi.content.css }} />
        )}
        <div
          ref={containerRef}
          className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 mb-8"
          dangerouslySetInnerHTML={{ __html: rfi?.content?.html || "" }}
        />

        {/* Respondent info */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Your Information (Optional)
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="your@email.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {submitting ? "Submitting..." : "Submit Response"}
          </button>
        </div>
      </div>
    </div>
  );
}
