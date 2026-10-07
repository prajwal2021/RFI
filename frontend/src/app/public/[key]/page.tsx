"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchPublicRFI, submitPublicRFI, PublicRFI } from "@/lib/api";

const SurveyRunner = dynamic(() => import("@/components/surveyjs/survey-runner"), { ssr: false });

export default function PublicFormPage() {
  const params = useParams();
  const key = params.key as string;
  const containerRef = useRef<HTMLDivElement>(null);

  const [rfi, setRfi] = useState<PublicRFI | null>(null);
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

  const findLabel = (el: Element): string => {
    const wrapper = el.closest("label");
    if (wrapper) {
      const clone = wrapper.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("input, textarea, select, span").forEach((c) => c.remove());
      const text = clone.textContent?.trim();
      if (text) return text;
    }
    const id = (el as HTMLInputElement).id;
    if (id) {
      const explicit = containerRef.current?.querySelector(`label[for="${id}"]`);
      if (explicit?.textContent?.trim()) return explicit.textContent.trim();
    }
    const parent = el.closest("div, section, fieldset");
    if (parent) {
      const label = parent.querySelector("label");
      if (label && !label.querySelector("input, textarea, select")) {
        const text = label.textContent?.trim().replace(/\s*\*\s*$/, "");
        if (text) return text;
      }
    }
    return "";
  };

  const handleSubmit = async () => {
    if (!containerRef.current) return;
    setSubmitting(true);

    const data: Record<string, any> = {};
    const inputs = containerRef.current.querySelectorAll(
      "input, textarea, select"
    );
    let fieldIndex = 0;

    const seenRadioGroups = new Set<string>();

    inputs.forEach((el) => {
      const input = el as HTMLInputElement;
      const rawName =
        input.name || input.id || input.placeholder || `field_${fieldIndex++}`;
      const label = findLabel(el) || rawName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      if (input.type === "checkbox") {
        if (!data[label]) data[label] = [];
        if (input.checked) (data[label] as string[]).push(input.value || "on");
      } else if (input.type === "radio") {
        if (!seenRadioGroups.has(rawName)) {
          seenRadioGroups.add(rawName);
          data[label] = "";
        }
        if (input.checked) data[label] = input.value;
      } else if (input.type === "file") {
        data[label] = input.files?.length
          ? Array.from(input.files).map((f) => f.name)
          : "";
      } else if (el.tagName === "SELECT") {
        const select = el as HTMLSelectElement;
        data[label] = select.value;
      } else if (el.tagName === "TEXTAREA") {
        data[label] = (el as HTMLTextAreaElement).value;
      } else {
        data[label] = input.value;
      }
    });

    try {
      await submitPublicRFI(key, {
        data,
        submitted_by_name: name || undefined,
        submitted_by_email: email || undefined,
      });
      setSubmitted(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to submit. Please try again.");
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

  if (rfi && rfi.accepting === false && !submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-4xl">⏳</div>
          <h1 className="mb-2 text-xl font-semibold text-gray-900">{rfi.subject}</h1>
          <p className="text-gray-500">{rfi.closed_reason || "This form is not accepting responses right now."}</p>
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
          <p className="text-gray-500 whitespace-pre-wrap">
            {rfi?.thank_you_message || "Thank you for your response. Your submission has been recorded."}
          </p>
        </div>
      </div>
    );
  }

  if (rfi?.content?.surveyDefinition) {
    return (
      <SurveyRunner
        fullPage
        json={rfi.content.surveyDefinition}
        theme={rfi.content.surveyTheme}
        onComplete={async (data) => {
          try {
            await submitPublicRFI(key, { data });
            setSubmitted(true);
          } catch (e) {
            alert(e instanceof Error ? e.message : "Failed to submit. Please try again.");
          }
        }}
      />
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
