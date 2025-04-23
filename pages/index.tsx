import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/react'

export default function Index() { return null }

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    redirect: {
      destination: '/dashboard',
      permanent: false,
    },
  }
}
