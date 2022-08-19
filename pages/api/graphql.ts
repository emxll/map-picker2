import {
  ApolloServerPluginDrainHttpServer,
  ApolloServerPluginLandingPageLocalDefault,
  gql,
} from 'apollo-server-core';
import express from 'express';
import http, { IncomingMessage, OutgoingMessage, ServerResponse } from 'http';
import { DocumentNode } from 'graphql'
import fastify, { FastifyInstance } from 'fastify';
import { ApolloServer } from 'apollo-server-fastify';


const books = [
  {
    title: 'The Awakening',
    author: 'Kate Chopin',
  },
  {
    title: 'City of Glass',
    author: 'Paul Auster',
  },
];

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    books: () => books,
  },
};

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.
  type Book {
    title: String
    author: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    books: [Book]
  }
`;


function fastifyAppClosePlugin(app: FastifyInstance) {
  return {
    async serverWillStart() {
      return {
        async drainServer() {
          await app.close();
        },
      };
    },
  };
}

const app = fastify();
const server = new ApolloServer({
  typeDefs,
  resolvers,
  csrfPrevention: true,
  cache: 'bounded',
  plugins: [
    fastifyAppClosePlugin(app),
    ApolloServerPluginDrainHttpServer({ httpServer: app.server }),
    ApolloServerPluginLandingPageLocalDefault({ embed: true }),
  ],
});

async function startApolloServer(typeDefs: DocumentNode, resolvers: any) {

  await server.start();
  app.register(server.createHandler({
    path: '/api/graphql'
  }));
}


export default async function handler(req: IncomingMessage, res: ServerResponse){
  app.server.emit('request', req, res);
}

