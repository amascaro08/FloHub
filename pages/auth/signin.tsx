// pages/auth/signin.tsx
import { getProviders, signIn } from "next-auth/react";
import { GetServerSideProps } from "next";

interface Providers {
  [key: string]: {
    id: string;
    name: string;
    type: string;
    signinUrl: string;
    callbackUrl: string;
  };
}

interface SigninProps {
  providers: Providers | null;
}

export default function Signin({ providers }: SigninProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1>Sign In</h1>
      {Object.values(providers || {}).map((provider) => (
        <div key={provider.name}>
          <button onClick={() => signIn(provider.id, { callbackUrl: "/" })}>
            Sign in with {provider.name}
          </button>
        </div>
      ))}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const providers = await getProviders();
  return {
    props: { providers },
  };
};