// pages/index.tsx
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (ctx) => ({
  redirect: {
    destination: "/dashboard",
    permanent: false,
  },
});

export default function Home() {
  // this component will never actually render
  return null;
}
