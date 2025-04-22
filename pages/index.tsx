import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/react'

export default function Index() {
  return null  // never actually renders
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)
  return {
    redirect: {
      destination: session ? '/dashboard' : '/api/auth/signin',
      permanent: false,
    },
  }
}
