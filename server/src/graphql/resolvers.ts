import { ApolloError } from "apollo-server-core";
import { config } from "../../config";
import { Auth, CGame, Context, Game } from '../utils/types'
import crypto from 'crypto'
import { prisma } from "../utils/prisma";
import express from 'express';
import { pubsub } from "./pubsub";
import { withFilter } from "graphql-subscriptions";
import { getNamedType, subscribe, valueFromAST } from "graphql";
import { nextTick } from "process";
import { Events } from "../../constants";
import { isJsxFragment } from "typescript";

function adminAuth(auth: Auth, res: express.Response){

  function die(msg: string, code: string, res: express.Response){
    res.setHeader('Set-Cookie', `password=; HttpOnly`);
    throw new ApolloError(msg, code);
  }

  if (!auth.password) die('No password supplied.', 'UNAUTHENTICATED', res);
  if (auth.password !== config.password) die('Password incorrect', 'UNAUTHORIZED', res);
}

function teamAuth(game: Game, auth: Auth){
  if (!auth.authKey) throw new ApolloError('No key supplied', 'UNAUTHENTICATED');

  if(auth.authKey === game.key0)return 0;
  else if(auth.authKey === game.key1) return 1;
  else throw new ApolloError('Key incorrect', 'UNAUTHORIZED');
}

function scheduleRandomMapSelection(game: CGame){
  if(
    game.state >= config.schedule.length
    || config.schedule[game.state].event !== Events.RANDOM
  ) return;

  setTimeout( async () => {

    let maps = [];

    //saving myself the sort at the cost of O(n^2) vs O(n*log(n))
    for(let i = 0; i < config.maps.length; i++){
      if(game.maps.some(map => map.map === i)) continue;
      maps.push(i);
    }
    
    let newMap = {
      map: maps[Math.floor(Math.random() * maps.length)],
      position: game.maps.length,
      gameId: game.id,
      attacker: Math.floor(Math.random() * 2),
      pickedBy: -1,
    }

    game.state += 1;

    await prisma.map.create({data: newMap});
    
    let updatedGame = await prisma.game.update({
      where: {
        id: game.id
      },
      data: {
        state: game.state
      },
      include: {
        bans: {
          orderBy: {
            position: 'asc'
          }
        },
        maps: {
          orderBy: {
            position: 'asc'
          }
        }
      }
    });

    pubsub.publish('GAME_UPDATED', updatedGame);

    scheduleRandomMapSelection(updatedGame);

  }, config.randomMapTimeout);

}

//FIXME: add field resolver for keys
export const resolvers = {
  Query: {
    async login(_: any, {password}: {password: string}, {res}: Context){
      if(password === config.password){
        res.header('Set-Cookie', `password=${password}; HttpOnly`);
        return true;
      }
      return false;
    },
    async getTeam(_: any, {gameId}: {gameId: number}, {auth, res}: Context){
      let game = await prisma.game.findUnique({
        where: {
          id: gameId,
        }
      });

      if(game === null) throw new ApolloError('Not found.','NOT_FOUND');

      try{ 
        return teamAuth(game, auth);
      }catch(e){
        return null;
      }

    },
    async games(_: any, __ : any, {auth, res}: Context){
      adminAuth(auth, res);
      return await prisma.game.findMany({
        orderBy: {
          id: 'desc'
        },
        include: {
          bans: {
            orderBy: {
              position: 'asc'
            }
          },
          maps: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      })
    },
    async game(_: any, {gameId} : {gameId: number}){
      return await prisma.game.findUnique({
        where:{
          id: gameId
        },
        include: {
          bans: {
            orderBy: {
              position: 'asc'
            }
          },
          maps: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      });
    }
  },
  Mutation: {
    async newGame(_: any, { name, team0, team1 }: {name: string, team0:string, team1: string}, { auth, res}: Context){

      adminAuth(auth, res);

      let key0 = crypto.randomBytes(16).toString('hex');
      let key1 = '';

      do{
        key1 = crypto.randomBytes(16).toString('hex');
      }while(key0 === key1)

      let newGame = await prisma.game.create({
        data: {
          name: name,
          team0: team0,
          team1: team1,
          key0,
          key1,
        },
        include: {
          bans: {
            orderBy: {
              position: 'asc'
            }
          },
          maps: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      });
      pubsub.publish('GAME_CREATED', newGame);
    },
    async startGame(_: any, { gameId }: {gameId: number}, { auth, res}: Context){

      adminAuth(auth, res);

      let game = await prisma.game.findFirst({
        where: {
          id: gameId
        }
      });


      if(game === null) throw new ApolloError('Not found.','NOT_FOUND');
      if(game.state !== -1) throw new ApolloError('This game has already started.', 'BAD_REQUEST');


      const updatedGame = await prisma.game.update({
        where: {
          id: gameId
        },
        data: {
          state: 0
        },
        include: {
          bans: {
            orderBy: {
              position: 'asc'
            }
          },
          maps: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      });

      pubsub.publish('GAME_UPDATED', updatedGame);
      scheduleRandomMapSelection(updatedGame);

      return true;

    },

    //FIXME: validate map parameter input range
    async banMap(_: any, { gameId, map }: {gameId: number, map: number}, { auth }: Context){
      
      let game = await prisma.game.findUnique({
        where: {
          id: gameId,
        },
        include: {
          bans: {
            orderBy: {
              position: 'asc'
            }
          },
          maps: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      });

      if(game === null) throw new ApolloError('Not found.','NOT_FOUND');
      if(game.state === -1) throw new ApolloError('This game hasn\'t started.', 'BAD_REQUEST');
      if(game.state >= config.schedule.length) throw new ApolloError('This game is over.', 'BAD_REQUEST');

      let team = teamAuth(game, auth);

      if(
        config.schedule[game.state].event !== Events.BAN 
        || config.schedule[game.state].team !== team
      ) throw new ApolloError('This team can\'t ban a map right now.', 'BAD_REQUEST');

      if(map < 0 || map >= config.maps.length) throw new ApolloError('Invalid map.', 'BAD_REQUEST');

      if (
        game.bans.some( (ban) => ban.map === map )
      ) throw new ApolloError('This map has already been banned.', 'BAD_REQUEST');

      let ban = {
        map: map,
        position: game.bans.length,
        gameId: game.id,
        pickedBy: team,
      }

      game.state += 1;

      await prisma.ban.create({
        data: ban
      });

      let updatedGame = await prisma.game.update({
        where: {
          id: game.id
        },
        data: {
          state: game.state
        },
        include: {
          bans: {
            orderBy: {
              position: 'asc'
            }
          },
          maps: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      });

      pubsub.publish('GAME_UPDATED', updatedGame);

      scheduleRandomMapSelection(updatedGame);

      return true;
      
    },

    //FIXME: validate map parameter input range
    async pickMap(_: any, {gameId, map}: { gameId: number, map: number }, { auth, res }: Context){

      let game = await prisma.game.findUnique({
        where: {
          id: gameId,
        },
        include: {
          bans: {
            orderBy: {
              position: 'asc'
            }
          },
          maps: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      });

      if(game === null) throw new ApolloError('Not found.','NOT_FOUND');
      if(game.state === -1) throw new ApolloError('This game hasn\'t started.', 'BAD_REQUEST');
      if(game.state >= config.schedule.length) throw new ApolloError('This game is over.', 'BAD_REQUEST');


      let team = teamAuth(game, auth);

      if(
        config.schedule[game.state].event !== Events.PICK 
        || config.schedule[game.state].team !== team
      ) throw new ApolloError('This team can\'t pick a map right now.', 'BAD_REQUEST');

      if(map < 0 || map >= config.maps.length) throw new ApolloError('Invalid map.', 'BAD_REQUEST');

      if (
        game.maps.some( (_map) => _map.map === map )
      ) throw new ApolloError('This map has already been picked.', 'BAD_REQUEST');

      if (
        game.bans.some( (ban) => ban.map === map )
      ) throw new ApolloError('This map has been banned.', 'BAD_REQUEST');

      let newMap = {
        map: map,
        position: game.maps.length,
        gameId: game.id,
        attacker: null,
        pickedBy: team
      }

      game.state += 1;

      await prisma.map.create({
        data: newMap
      });

      let updatedGame = await prisma.game.update({
        where: {
          id: game.id
        },
        data: {
          state: game.state
        },
        include: {
          bans: {
            orderBy: {
              position: 'asc'
            }
          },
          maps: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      });

      pubsub.publish('GAME_UPDATED', updatedGame);
      scheduleRandomMapSelection(updatedGame);

      return true;

    },

    //FIXME: validate attacker!!! parameter input range
    async pickSide(_: any, { gameId, attacker }: {gameId: number, attacker: number}, { auth, res }: Context){

      let game = await prisma.game.findUnique({
        where: {
          id: gameId,
        },
        include: {
          bans: {
            orderBy: {
              position: 'asc'
            }
          },
          maps: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      });

      if(game === null) throw new ApolloError('Not found.','NOT_FOUND');
      if(game.state === -1) throw new ApolloError('This game hasn\'t started.', 'BAD_REQUEST');
      if(game.state >= config.schedule.length) throw new ApolloError('This game is over.', 'BAD_REQUEST');

      let team = teamAuth(game, auth);

      if(
        config.schedule[game.state].event !== Events.PICK_SIDE 
        || config.schedule[game.state].team !== team
      ) throw new ApolloError('This team can\'t pick a side right now.', 'BAD_REQUEST');
      
      game.state += 1;

      await prisma.map.update({
        where: {
          position_gameId: {
            gameId: game.id,
            position: game.maps.length - 1,
          }
        },
        data:{
          attacker: attacker
        }
      });
      let updatedGame = await prisma.game.update({
        where: {
          id: game.id
        },
        data: {
          state: game.state
        },
        include: {
          bans: {
            orderBy: {
              position: 'asc'
            }
          },
          maps: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      });

      pubsub.publish('GAME_UPDATED', updatedGame);
      scheduleRandomMapSelection(updatedGame);

      return true;

    },
    async deleteGame(_: any, { gameId }: {gameId: number}, { auth, res}: Context){

      adminAuth(auth, res);
      
      try{
        await prisma.game.delete({
          where: {
            id: gameId
          }
        });
        pubsub.publish('GAME_DELETED', gameId);
        return true;
      }catch(e){
        return false;
      }
    }
  },
  Subscription: {
    game: {
      subscribe: withFilter(
        //This (resolveFn) has to return an ITERATOR, the other subscriptions return an ITERABLE!
        () => {
          const iterator = pubsub.asyncIterator(['GAME_UPDATED']);
          return {
            async next(){
              let payload = await iterator.next();
              return {
                done: payload.done,
                value: {
                  game: payload.value,
                }
              };
            },
            async return(){
              return await iterator.return!();
            }
          }
        },
        ({game}: {game: CGame}, {gameId}: {gameId: number}) => {
          return game.id === gameId;
        }
      )
    },
    gameCreated: {
      subscribe: () => {
        const iterator = pubsub.asyncIterator(['GAME_CREATED']);
        return {
          [Symbol.asyncIterator](){
            return {
              async next(){
                let game = await (await iterator.next()).value;
                return {
                  done: false,
                  value: {
                    gameCreated: game
                  }
                };
              }
            }
          }
        }
      },
    },
    gameUpdated: {
      subscribe: () => {
        const iterator = pubsub.asyncIterator(['GAME_UPDATED']);
        return {
          [Symbol.asyncIterator](){
            return {
              async next(){
                let game = await (await iterator.next()).value;
                return {
                  done: false,
                  value: {
                    gameUpdated: game
                  }
                };
              }
            }
          }
        }
      },
    },
    gameDeleted: {
      subscribe: () => {
        const iterator = pubsub.asyncIterator(['GAME_DELETED']);
        return {
          [Symbol.asyncIterator](){
            return {
              async next(){
                let gameId = await (await iterator.next()).value;
                return {
                  done: false,
                  value: {
                    gameDeleted: gameId
                  }
                };
              }
            }
          }
        }
      },
    },
  }
}



/*
import * as trpc from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import crypto from 'crypto';
import { config } from '../../../config';
import { Context } from '../../utils/context';
import { prisma } from '../../utils/prisma';
import { ee } from '../../utils/event-emitter';
import { CGame } from '../../utils/types';

export const appRouter = trpc
  .router<Context>()
  .mutation('login', {
    input: z.object({
      password: z.string(),
    }),
    resolve({ input, ctx }) {

      let res = { success: false, password: input.password};

      if(input.password === config.password){
        if(ctx.res){
          //                                shut up it doesnt matter okay
          ctx.res.setHeader('Set-Cookie', `password=${input.password}; HttpOnly`);
        }
        res.success = true;
      }

      return res;
      
    },
  })
  .subscription('onGamesChange', {
    resolve() {

      console.log('1');

      // `resolve()` is triggered for each client when they start subscribing `onAdd`

      // return a `Subscription` with a callback which is triggered immediately
      return new trpc.Subscription<CGame>((emit) => {

        console.log('2');
        const onGamesChange = (data: CGame) => {
          console.log('7');
          // emit data to client
          //emit.data(data);
        };
        console.log('3');

        ee.on('onGamesChange', onGamesChange);

        console.log(ee.listeners('onGamesChange'));

        console.log('4');


        return () => {
          ee.off('onGamesChange', onGamesChange);
        };
      });
    },
  })
  .subscription('onGamesAdd', {
    resolve() {
      // `resolve()` is triggered for each client when they start subscribing `onAdd`

      // return a `Subscription` with a callback which is triggered immediately
      return new trpc.Subscription<CGame>((emit) => {
        const onGamesAdd = (data: CGame) => {
          // emit data to client
          console.log('pong');
          emit.data(data);
        };

        ee.on('onGamesAdd', onGamesAdd);

        return () => {
          ee.off('onGamesAdd', onGamesAdd);
        };
      });
    },
  })
  .subscription('onGamesDelete', {
    resolve() {
      // `resolve()` is triggered for each client when they start subscribing `onAdd`

      // return a `Subscription` with a callback which is triggered immediately
      return new trpc.Subscription<Number>((emit) => {
        const onGamesDelete = (data: Number) => {
          // emit data to client
          emit.data(data);
        };

        ee.on('onGamesDelete', onGamesDelete);

        return () => {
          ee.off('onGamesDelete', onGamesDelete);
        };
      });
    },
  })
  .merge(
    trpc.router<Context>()
    .middleware(async ( {ctx, next} ) => {
      if(ctx.password !== config.password){resolvers
        if(ctx.res){
          ctx.res.setHeader('Set-Cookie', `password=; HttpOnly`);
          throw new TRPCError({
            code: 'UNAUTHORIZED'
          });
        }
      }
      return next();
    })
    .query('games', {
      async resolve(): Promise<Array<CGame>>{
        return await prisma.game.findMany({
          orderBy: {
            id: 'desc',
          },
          include: {
            bans: {
              orderBy: {
                position: 'asc'
              }
            },
            maps: {
              orderBy: {
                position: 'asc'
              }
            }
          }
        });
      }
    })
    .mutation('addGame', {
      input: z.object({
        name: z.string(),
        team0: z.string(),
        team1: z.string()
      }),
      async resolve( { input } ){

        let key0 = crypto.randomBytes(16).toString('hex');
        let key1 = '';

        do{
          key1 = crypto.randomBytes(16).toString('hex');
        }while(key0 === key1)

        let newGame = await prisma.game.create({
          data: {
            name: input.name,
            team0: input.team0,
            team1: input.team1,
            key0,
            key1,
          },
          include: {
            bans: {
              orderBy: {
                position: 'asc'
              }
            },
            maps: {
              orderBy: {
                position: 'asc'
              }
            }
          }
        });
        ee.emit('onGamesAdd', newGame)
      }
    })
    .mutation('startGame', {
      input: z.object({
        gameID: z.number()
      }),
      async resolve( { input } ){
        let game = await prisma.game.findFirst({
          where: {
            id: input.gameID
          }
        });
        if(game === null){
          throw new TRPCError({
            code: 'NOT_FOUND',
          })
        }
        if(game.state !== -1){
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This game has already started.'
          })
        }
        const updatedGame = await prisma.game.update({
          where: {
            id: input.gameID
          },
          data: {
            state: 0
          },
          include: {
            bans: {
              orderBy: {
                position: 'asc'
              }
            },
            maps: {
              orderBy: {
                position: 'asc'
              }
            }
          }
        });
        console.log('5');
        ee.emit('onGamesChange', updatedGame);
        console.log('6');
      }
    })
    .mutation('deleteGame', {
      input: z.object({
        gameID: z.number()
      }),
      async resolve( { input } ){
        let del = prisma.game.delete({
          where: {
            id: input.gameID
          }
        });
        ee.emit('onGamesDelete', input.gameID)
        return del;
      }
    })
  );
*/