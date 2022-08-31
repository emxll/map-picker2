import { ApolloError } from "apollo-server-core";
import { config } from "../../config";
import { Auth, CGame, Context, Game } from '../utils/types'
import crypto from 'crypto'
import { prisma } from "../utils/prisma";
import { pubsub } from "./pubsub";
import { withFilter } from "graphql-subscriptions";
import { Events } from "../../constants";

function adminAuth(auth: Auth){

  function die(msg: string, code: string){
    throw new ApolloError(msg, code);
  }

  if (!auth.password) die('No password supplied.', 'UNAUTHENTICATED');
  if (auth.password !== config.password) die('Password incorrect', 'UNAUTHORIZED');
}

function teamAuth(game: Game, auth: Auth){
  if (!auth.key) throw new ApolloError('No key supplied', 'UNAUTHENTICATED');

  if(auth.key === game.key0)return 0;
  else if(auth.key === game.key1) return 1;
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

export const resolvers = {
  Game: {
    key0: (parent: Game, __: any, { auth }: Context) => {
      adminAuth(auth);
      return parent.key0;
    },
    key1: (parent: Game, __: any, { auth }: Context) => {
      adminAuth(auth);
      return parent.key1;
    }
  },
  Query: {
    async login(_: any, {password}: {password: string}){
      return password === config.password;
    },
    async getTeam(_: any, {gameId}: {gameId: number}, {auth}: Context){
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
    async games(_: any, __ : any, {auth}: Context){

      adminAuth(auth);
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
    async newGame(_: any, { name, team0, team1 }: {name: string, team0:string, team1: string}, { auth}: Context){

      adminAuth(auth);

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
    async startGame(_: any, { gameId }: {gameId: number}, { auth }: Context){

      adminAuth(auth);

      let game = await prisma.game.findFirst({
        where: {
          id: gameId
        }
      });


      if(game === null) throw new ApolloError('Not found.','NOT_FOUND');
      if(game.state >= config.schedule.length) throw new ApolloError('This game is over.', 'BAD_REQUEST');

      if(config.schedule[game.state].event !== Events.WAIT_START) throw new ApolloError('This game has already started.', 'BAD_REQUEST');

      game.state += 1;

      const updatedGame = await prisma.game.update({
        where: {
          id: gameId
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

    async banMap(_: any, { gameId, map }: {gameId: number, map: number}, { auth }: Context){
      
      if(map < 0 || map >= config.maps.length) throw new ApolloError('Invalid map.', 'BAD_REQUEST');
      
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
      if(game.state >= config.schedule.length) throw new ApolloError('This game is over.', 'BAD_REQUEST');

      let team = teamAuth(game, auth);

      if(
        config.schedule[game.state].event !== Events.BAN 
        || config.schedule[game.state].team !== team
      ) throw new ApolloError('This team can\'t ban a map right now.', 'BAD_REQUEST');

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

    async pickMap(_: any, {gameId, map}: { gameId: number, map: number }, { auth }: Context){

      if(map < 0 || map >= config.maps.length) throw new ApolloError('Invalid map.', 'BAD_REQUEST');

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
      if(game.state >= config.schedule.length) throw new ApolloError('This game is over.', 'BAD_REQUEST');


      let team = teamAuth(game, auth);

      if(
        config.schedule[game.state].event !== Events.PICK 
        || config.schedule[game.state].team !== team
      ) throw new ApolloError('This team can\'t pick a map right now.', 'BAD_REQUEST');

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

    async pickSide(_: any, { gameId, attacker }: {gameId: number, attacker: number}, { auth }: Context){

      if(![0,1].includes(attacker)) throw new ApolloError('Attacker must be 0 or 1.', 'BAD_REQUEST');

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
    async deleteGame(_: any, { gameId }: {gameId: number}, { auth }: Context){

      adminAuth(auth);
      
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
            async return(value?: any){
              return await iterator.return!(value);
            },
            async throw(e?: any){
              return await iterator.throw!(e);
            }
          }
        },
        ({game}: {game: CGame}, {gameId}: {gameId: number}) => {
          return game.id === gameId;
        }
      )
    },
    gameCreated: {
      subscribe: (_: any, __: any, { auth }: Context) => {

        adminAuth(auth);

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
              },
              async return(value?: any){
                return await iterator.return!(value);
              },
              async throw(e?: any){
                return await iterator.throw!(e);
              }
            }
          }
        }
      },
    },
    gameUpdated: {
      subscribe: (_: any, __: any, { auth }: Context) => {

        adminAuth(auth);

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
              },
              async return(value?: any){
                return await iterator.return!(value);
              },
              async throw(e?: any){
                return await iterator.throw!(e);
              }
            }
          }
        }
      },
    },
    gameDeleted: {
      subscribe: (_: any, __: any, { auth }: Context) => {

        adminAuth(auth);

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
              },
              async return(value?: any){
                return await iterator.return!(value);
              },
              async throw(e?: any){
                return await iterator.throw!(e);
              }
            }
          }
        }
      },
    },
  }
}