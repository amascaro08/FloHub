import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { firestore } from "../../lib/firebaseAdmin";
import { UserSettings } from "../../types/app"; // Import UserSettings from types

type ErrorRes = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserSettings | ErrorRes>
) {
  // Disable caching to always return freshest data
  res.setHeader('Cache-Control', 'no-store');
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userEmail = token.email;
  // Use a more general settings document instead of just "calendar"
  const settingsDocRef = firestore.collection("users").doc(userEmail).collection("settings").doc("userSettings");

  if (req.method === "GET") {
    try {
      const docSnap = await settingsDocRef.get();
      if (!docSnap.exists) {
        // Return default settings if none exist
        const defaultSettings: UserSettings = {
          selectedCals: ["primary"],
          defaultView: "month",
          customRange: { start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
          powerAutomateUrl: "",
          globalTags: [], // Default empty array for globalTags
          activeWidgets: ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"], // Default active widgets
          floCatStyle: "default", // Default FloCat communication style
          floCatPersonality: [], // Default empty array for FloCat personality keywords
          preferredName: "", // Default empty string for preferred name
          tags: [],
          widgets: [],
          calendarSettings: {
            calendars: [],
          },
          notificationSettings: {
            subscribed: false,
          },
        };
        console.log("User settings not found for", userEmail, "- returning default settings");
        return res.status(200).json(defaultSettings);
      }
      const data = docSnap.data() as UserSettings;
      console.log("User settings loaded for", userEmail, data);
      return res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching user settings for", userEmail, error);
      return res.status(500).json({ error: "Failed to fetch user settings" });
    }
  } else if (req.method === "POST") {
    try {
      const settings: UserSettings = req.body;
      console.log("Saving user settings:", settings);
      await settingsDocRef.set(settings, { merge: true });
      return res.status(200).json(settings);
    } catch (error) {
      console.error("Error saving user settings:", error);
      return res.status(500).json({ error: "Failed to save user settings" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}