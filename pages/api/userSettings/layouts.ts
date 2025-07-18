import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { userSettings, users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Move getUserById function here to avoid shared import issues
async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
    },
    with: {
      accounts: {
        columns: {
          access_token: true,
        },
      },
    },
  });

  return user || null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const user_email = user.email;

  if (req.method === "GET") {
    try {
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_email, user_email),
      });
      return res.status(200).json({ layouts: settings?.layouts || null });
    } catch (error: any) {
      console.error("Error fetching user layouts:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  } else if (req.method === "POST") {
    const { layouts } = req.body;
    if (!layouts) {
      return res.status(400).json({ error: "Layouts data is required" });
    }

    try {
      await db
        .insert(userSettings)
        .values({
          user_email: user_email,
          layouts: layouts,
        })
        .onConflictDoUpdate({
          target: userSettings.user_email,
          set: {
            layouts: layouts,
          },
        });

      return res.status(204).end();
    } catch (error: any) {
      console.error("Error saving user layouts:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}