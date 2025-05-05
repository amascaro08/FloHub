"use client";

import { useSession } from "next-auth/react";
import { useState, FormEvent, useMemo } from "react"; // Import useMemo
import useSWR from "swr"; // Import useSWR
import CreatableSelect from 'react-select/creatable'; // Import CreatableSelect
import type { UserSettings, Note } from "@/types/app"; // Import UserSettings and Note types
import type { GetNotesResponse } from "@/pages/api/notes"; // Import GetNotesResponse

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function QuickNoteWidget() {
  const { data: session, status } = useSession();
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // Use state for selected tags
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const shouldFetch = status === "authenticated";

  // Fetch user settings to get global tags
  const { data: userSettings, error: settingsError } = useSWR<UserSettings>(
    shouldFetch ? "/api/userSettings" : null,
    fetcher
  );

  // Fetch existing quick notes to get their tags (assuming quick notes are just notes with a source)
  const { data: notesResponse, error: notesError } = useSWR<GetNotesResponse>(
    shouldFetch ? "/api/notes?source=quicknote" : null, // Filter by source if possible, otherwise fetch all notes
    fetcher
  );

  // Combine global tags and quick note tags
  const allAvailableTags = useMemo(() => {
    const globalTags = userSettings?.globalTags || [];
    return Array.from(new Set(globalTags)).sort();
  }, [userSettings]);

  const tagOptions = allAvailableTags.map(tag => ({ value: tag, label: tag }));

  const handleTagChange = (selectedOptions: any) => {
    setSelectedTags(Array.isArray(selectedOptions) ? selectedOptions.map(option => option.value) : []);
  };


  const handleSaveNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSaving) return;

    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const response = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, tags: selectedTags, source: "quicknote" }), // Include source and selectedTags
      });

      if (response.ok) {
        setContent(""); // Clear content on success
        setSelectedTags([]); // Clear selected tags on success
        setSaveStatus("success");
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

  if (status === "loading" || (!userSettings && !settingsError && shouldFetch) || (!notesResponse && !notesError && shouldFetch)) { // Add loading checks for settings and notes
    return <p>Loading...</p>;
  }

  if (!session) {
    return <p>Please sign in to add notes.</p>;
  }

  if (settingsError || notesError) { // Add error checks for settings and notes
    return <p>Error loading data.</p>;
  }


  return (
    <div className="glass p-4 rounded-xl shadow-elevate-sm text-[var(--fg)] flex flex-col h-full">
      <form onSubmit={handleSaveNote} className="flex flex-col flex-1 gap-2">
        <textarea
          className="
            w-full border border-[var(--neutral-300)]
            px-3 py-2 rounded focus:outline-none
            focus:ring-2 focus:ring-[var(--primary)]
            text-[var(--fg)] bg-transparent
            flex-1 placeholder-[var(--fg-muted)]
          "
          placeholder="Write your note here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSaving}
        />
        <CreatableSelect // Use CreatableSelect for tags
          isMulti
          options={tagOptions}
          onChange={handleTagChange}
          placeholder="Select or create tags..."
          isDisabled={isSaving}
          isSearchable
          value={selectedTags.map(tag => ({ value: tag, label: tag }))} // Set value for CreatableSelect
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
          <p className="text-soft-yellow text-sm mt-1">Note saved!</p>
        )}
        {saveStatus === "error" && (
          <p className="text-red-500 text-sm mt-1">Failed to save note.</p>
        )}
      </form>
    </div>
  );
}