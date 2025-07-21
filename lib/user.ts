import { db } from './drizzle';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function getUserById(userId: number) {
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
          provider: true,
          refresh_token: true,
          expires_at: true,
        },
      },
    },
  });

  return user || null;
}

export async function getUserByEmail(email: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: {
      id: true,
      email: true,
      name: true,
    },
    with: {
      accounts: {
        columns: {
          access_token: true,
          provider: true,
          refresh_token: true,
          expires_at: true,
        },
      },
    },
  });

  return user || null;
}