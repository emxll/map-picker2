import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ApolloClient, ApolloProvider, NormalizedCacheObject } from '@apollo/client'
import { createContext, useEffect, useRef, useState } from 'react';
import { generateClient } from '../apollo-client';
import useDeepCompareEffect from 'use-deep-compare-effect';
import Head from 'next/head';
import Link from 'next/link';


export type Auth = {password: string | null, key: string | null};

//using one context is fine because only one of these is ever used at a time
export const AuthContext = createContext<any>({
  password: null,
  key: null
});



function MyApp({ Component, pageProps }: AppProps) {

  const hasInitialized = useRef(false);

  const [auth, setAuth] = useState({
    password: null,
    key: null
  });

  let client = {};

  if(!hasInitialized.current){
    client = generateClient(auth);
    hasInitialized.current = true;
  }

  const [ apolloClient, setApolloClient] = useState<ApolloClient<NormalizedCacheObject> | {}>(client);

  useDeepCompareEffect( () => {
    setApolloClient(generateClient(auth));
  }, [auth]);

  return <AuthContext.Provider value={[auth, setAuth]}>
    <ApolloProvider client={apolloClient as ApolloClient<NormalizedCacheObject>}>
      <Component {...pageProps} />
    </ApolloProvider>
  </AuthContext.Provider>
}

export default MyApp
