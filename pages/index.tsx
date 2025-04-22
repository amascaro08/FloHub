// pages/index.tsx

import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";

export default function Index() {
  // This never actually renders—Next.js will redirect in getServerSideProps
  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  return {
    redirect: {
      destination: session ? "/dashboard" : "/api/auth/signin",
      permanent: false,
    },
  };
};
