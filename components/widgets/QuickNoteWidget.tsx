"use client";

import { useSession } from "next-auth/react";
import { useState, FormEvent } from "react";

export default function QuickNoteWidget() {
  const { data: session, status } = useSession();
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState(""); // Input for comma-separated tags
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSaveNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSaving) return;

    setIsSaving(true);
    setSaveStatus("idle");

    // Split tags input by comma and trim whitespace
    const tags = tagsInput.split(",").map(tag => tag.trim()).filter(tag => tag !== "");

    try {
      const response = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, tags }),
      });

      if (response.ok) {
        setContent(""); // Clear content on success
        setTagsInput(""); // Clear tags on success
        setSaveStatus("success");
        console.log("Note saved successfully!");
        // Optionally, trigger a re-fetch of notes in the Notes list if it were visible
      } else {
        const errorData = await response.json();
        setSaveStatus("error");
        console.error("Failed to save note:", errorData.error);
      }
    } catch (error) {
      setSaveStatus("error");
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
      // Reset status after a few seconds
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (!session) {
    return <p>Please sign in to add notes.</p>;
  }

  return (
    <div className="glass p-4 rounded-xl shadow-elevate-sm text-[var(--fg)]">
      <form onSubmit={handleSaveNote} className="flex flex-col gap-2">
        <textarea
          className="
            w-full border border-[var(--neutral-300)]
            px-3 py-2 rounded focus:outline-none
            focus:ring-2 focus:ring-[var(--primary)]
            text-[var(--fg)] bg-transparent
            flex-1
          "
          placeholder="Write your note here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSaving}
        />
        <input
           type="text"
           className="
             w-full border border-[var(--neutral-300)]
             px-3 py-2 rounded focus:outline-none
             focus:ring-2 focus:ring-[var(--primary)]
             text-[var(--fg)] bg-transparent
           "
           placeholder="Tags (comma-separated)"
           value={tagsInput}
           onChange={(e) => setTagsInput(e.target.value)}
           disabled={isSaving}
        />
        <button
          type="submit"
          className={`
            self-end bg-primary-500 text-white
            px-4 py-2 rounded hover:bg-primary-600
            ${isSaving ? "opacity-50 cursor-not-allowed" : ""}
          `}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Note"}
        </button>
        {saveStatus === "success" && (
          <p className="text-green-500 text-sm mt-1">Note saved!</p>
        )}
        {saveStatus === "error" && (
          <p className="text-red-500 text-sm mt-1">Failed to save note.</p>
        )}
      </form>
    </div>
  );
}