import { config as dotenvConfig }  from 'dotenv'
dotenvConfig()


import { ApolloServerPluginDrainHttpServer, ApolloServerPluginLandingPageLocalDefault } from "apollo-server-core";
import { ApolloServer, gql } from "apollo-server-express";
import http from 'http';
import { DocumentNode } from "graphql";
import express from 'express';
import { resolvers } from "./graphql/resolvers";
import { getIncomingMsgCookies } from './utils/cookie';



const typeDefs = gql`
  type Game {
    id: ID!
    name: String!
    state: Int!
    team0: String!
    team1: String!
    key0: String!
    key1: String!
 
    maps: [Map!]
    bans: [Ban!]
  }
 
  type Map {
    position: Int!
    map: Int!
    attacker: Int
    pickedBy: Int!
  }
 
  type Ban {
    position: Int!
    map: Int!
    pickedBy: Int!
  }
 
  type Query {
    login(password: String!): Boolean
    games: [Game]
  }

  type Mutation {
    newGame(name: String!, team0: String!, team1: String!): Boolean
    startGame(gameId: Int!): Boolean
    deleteGame(gameId: Int!): Boolean
  }
`;


// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.

async function startApolloServer(typeDefs: DocumentNode, resolvers: any) {

  const port = parseInt(process.env.PORT || '3000', 10);
  // Required logic for integrating with Express
  const app = express();
  // Our httpServer handles incoming requests to our Express app.
  // Below, we tell Apollo Server to "drain" this httpServer,
  // enabling our servers to shut down gracefully.
  const httpServer = http.createServer(app);

  // Same ApolloServer initialization as before, plus the drain plugin
  // for our httpServer.
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
    context: ({req, res}) => {
      const cookies = getIncomingMsgCookies(req);
      return {
        auth: {
          password: cookies.password,
          authKey: cookies.authKey,
        },
        res: res
      }
    }
  });

  // More required logic for integrating with Express
  await server.start();
  server.applyMiddleware({
    app,

    // By default, apollo-server hosts its GraphQL endpoint at the
    // server root. However, *other* Apollo Server packages host it at
    // /graphql. Optionally provide this to match apollo-server.
    path: '/api/graphql'
  });

  // Modified server startup
  await new Promise<void>(resolve => httpServer.listen({ port: port }, resolve));
  console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`);
}

startApolloServer(typeDefs, resolvers);