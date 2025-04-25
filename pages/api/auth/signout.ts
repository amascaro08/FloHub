import { signOut } from "next-auth/react";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await signOut({ redirect: false });
  res.status(200).json({ message: "Signed out successfully" });
}