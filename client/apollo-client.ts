import { ApolloClient, HttpLink, InMemoryCache, split } from "@apollo/client";
import { config } from "./config";
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from "@apollo/client/utilities";
import { isClient } from "./utils/global";
import { useContext } from "react";

export function generateClient(auth: any){


  var client = {};

  if(isClient){
    const wsLink = new GraphQLWsLink(createClient({
      url: config.graphqlWsUri,
      connectionParams: () => {
        return {
          auth
        }
      }
    }));

    const httpLink = new HttpLink({
      uri: config.graphqlUri,
    });

    const splitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink,
    );

    client = new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache(),
    });

    //I'm not sorry
    (client as any).auth = auth;
  }
  return client;
}