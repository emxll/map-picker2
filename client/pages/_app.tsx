import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ApolloProvider } from '@apollo/client'
import client from '../apollo-client'
import { createContext, Dispatch, SetStateAction, useState } from 'react';

export type Auth = {password: string | null, key: string | null};

//using one context is fine because only one of these is ever used at a time
export const AuthContext = createContext<any>([{
  password: null,
  key: null
}, null]);


function MyApp({ Component, pageProps }: AppProps) {

  const [auth, setAuth] = useState({
    password: null,
    key: null
  });

  return <AuthContext.Provider value={[auth, setAuth]}>
    <ApolloProvider client={client}>
      <Component {...pageProps} />
    </ApolloProvider>
  </AuthContext.Provider>
}

export default MyApp
