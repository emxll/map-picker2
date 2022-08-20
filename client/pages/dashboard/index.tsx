import { NextPage } from "next"
import { Button } from "../../components/Button"
import { ChipIcon, DotsVerticalIcon, FireIcon, MailOpenIcon, UserGroupIcon } from '@heroicons/react/solid'
import { Dialog } from "../../components/Dialog"
import { useCallback, useEffect, useState } from "react"
import { config } from "../../config"
import { GameCreationDialog } from "../../components/GameCreationDialog"
import { CGame } from "../../utils/types"
import { gql } from "@apollo/client"
import { useRouter } from "next/router"
import client from "../../apollo-client"

export default () => {

  const router = useRouter();

  let [ games, setGames]  = useState<Array<CGame>>([]);

  const [focusedGameIndex, setFocusedGameIndex] = useState(0);

  const [isGameDialogOpen, setGameDialogOpen] = useState(false);

  const [isCreateGameDialogOpen, setCreateGameDialogOpen] = useState(false);

  useEffect( () => {
    client.query({
      query: gql`
        query Games {
          games {
            id
            name
            state
            team0
            team1
            key0
            key1
            maps {
              position
              map
              attacker
              pickedBy
            }
            bans {
              position
              map
              pickedBy
            }
          }
        }
      `
    }).then(({data}) => setGames(data.games))
    .catch(error => {console.error(error); router.push('/login')})

    const onDeleted = client.subscribe({
      query: gql`
        subscription Subscription {
          gameDeleted
        }
      `,
    }).subscribe( ( {data}: any) => {
      setGames((games) => games.filter(game => game.id !== data.gameDeleted));
    });
    const onCreated = client.subscribe({
      query: gql`
        subscription GameCreated {
          gameCreated {
            id
            name
            state
            team0
            team1
            key0
            key1
            maps {
              position
              map
              attacker
              pickedBy
            }
            bans {
              position
              map
              pickedBy
            }
          }
        }
      `,
    }).subscribe( ( {data}: any) => {
      setGames((games) => [data.gameCreated, ...games]);
    });

    const onUpdated = client.subscribe({
      query: gql`
        subscription GameUpdated {
          gameUpdated {
            id
            name
            state
            team0
            team1
            key0
            key1
            maps {
              position
              map
              attacker
              pickedBy
            }
            bans {
              position
              map
              pickedBy
            }
          }
        }
      `,
    }).subscribe( ( {data}: any) => {
      setGames((games) => games.map((game) => game.id === data.gameUpdated.id ? data.gameUpdated : game));
    });



    return () => {
      onDeleted.unsubscribe();
      onCreated.unsubscribe();
      onUpdated.unsubscribe();
    }

  }, [])

  return (
    <>
      {/* <p>{games.map(game => game.state).join(',')}</p>
      <p>{focusedGameIndex}</p> */}
      <GameCreationDialog
        isOpen={isCreateGameDialogOpen}
        toClose={() => setCreateGameDialogOpen(false)}
      ></GameCreationDialog>
      <Dialog
        isOpen={isGameDialogOpen} toClose={() => setGameDialogOpen(false)}
        className="max-w-[95vw] w-[700px] max-h-[95vh] rounded-lg drop-shadow-xl bg-white border-2 border-gray-200"
      >
        { games && games.length !== 0 &&
          <div className="p-4 flex flex-col w-full h-full">
            <div className="flex-row justify-center">
              <h2 className='text-3xl text-center font-bold text-gray-600 select-none'>{games[focusedGameIndex].name}</h2>
            </div>
            {/* i absolutely love how css is a perfectly consistent thing */}
            <div className="flex flex-row justify-center">
              <span className="text-lg font-medium select-none">{games[focusedGameIndex].team0}
                <span className="text-md font-normal"> vs. </span>
                {games[focusedGameIndex].team1}
              </span>
            </div>
            <div className="flex flex-row justify-center mt-2 mb-4">
              <div className="h-[1px] bg-gray-200 w-[40%]"></div>
            </div>
            <div className="overflow-y-auto">
              <div className="flex-row">
                <h2 className='text-2xl font-bold text-gray-600 select-none'>Bans</h2>
              </div>
              <div className="flex flex-row flex-wrap">
                {
                  games[focusedGameIndex].bans.length === 0 ? (
                    <span className="text-gray-400">No maps have been banned yet.</span>
                  ) : (
                    games[focusedGameIndex].bans.map(ban => {
                      return (
                        <div key={ban.position} className="flex justify-center items-center m-2 px-3 py-5 rounded-lg drop-shadow-lg bg-white border-2 border-gray-200">
                          <div>

                            <div className="flex flex-row font-semibold justify-center drop-shadow">{config.maps[ban.map]}</div>
                            <div className="p-1"></div>
                            <div className="flex flex-row justify-center">
                              <UserGroupIcon className="h-5 w-5 mx-1 text-gray-400"></UserGroupIcon>
                              <span className="text-gray-500">{
                                ban.pickedBy === 0 ? games![focusedGameIndex].team0 : games![focusedGameIndex].team1
                              }</span>
                            </div>

                          </div>
                        </div>
                      )
                    })
                  )
                }
              </div>
              <div className="p-3"></div>
              <div className="flex-row">
                <h2 className='text-2xl font-bold text-gray-600 select-none'>Maps</h2>
              </div>
              <div className="flex flex-row flex-wrap">
                {
                  games[focusedGameIndex].maps.length === 0 ? (
                    <span className="text-gray-400">No maps have been picked yet.</span>
                  ) : (
                    games[focusedGameIndex].maps.map(map => {
                      return (
                        <div key={map.position} className="flex justify-center items-center m-2 px-3 py-5 rounded-lg drop-shadow-lg bg-white border-2 border-gray-200">
                          <div>

                            <div className="flex flex-row font-semibold justify-center drop-shadow">{config.maps[map.map]}</div>
                            <div className="p-1"></div>
                            <div className="flex flex-row justify-center">
                              <FireIcon className="h-5 w-5 mx-2 text-red-400"></FireIcon>
                              <span className="text-gray-500">{
                                map.attacker === 0 ? games![focusedGameIndex].team0 : games![focusedGameIndex].team1
                              }</span>
                            </div>

                            <div className="p-1"></div>
                            <div className="flex flex-row justify-center">
                              {
                                map.pickedBy === -1 ? (
                                  <>
                                                                {/* this sucks but its not my fault the icons are dog */}
                                    <ChipIcon className="h-5 w-5 mt-[0.1rem] mx-2 text-gray-400"></ChipIcon>
                                      <span className="text-gray-500">Random choice</span>
                                  </>
                                ) : (
                                  <>
                                    <UserGroupIcon className="h-5 w-5 mx-2 text-gray-400"></UserGroupIcon>
                                    <span className="text-gray-500">{
                                      map.pickedBy === 0 ? games![focusedGameIndex].team0 : games![focusedGameIndex].team1
                                    }</span>
                                  </>
                                )
                              }
                              
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )
                }
              </div>
              <div className="p-4"></div>
            </div>
            <div className="self-end flex flex-row w-full">
              {
                games[focusedGameIndex].state === -1 &&
                <>
                  <Button 
                    className="w-full mt-2 p-4 border-2 border-emerald-200 bg-emerald-300 active:bg-emerald-400 drop-shadow-md"
                    onClick={(e) => { 
                      client.mutate({
                        mutation: gql`
                          mutation StartGame($gameId: Int!) {
                            startGame(gameId: $gameId)
                          }
                        `,
                        variables: {
                          gameId: games![focusedGameIndex].id
                        }
                      })
                    }}
                  >START GAME</Button>
                  <div className="p-1"></div>
                </>
              }
              <Button 
                  className="w-full mt-2 p-4 border-2 border-red-300 bg-red-500 active:bg-red-400 drop-shadow-md"
                  onClick={(e) => {
                    client.mutate({
                      mutation: gql`
                        mutation DeleteGame($gameId: Int!) {
                          deleteGame(gameId: $gameId)
                        }
                      `,
                      variables:{
                        gameId: games![focusedGameIndex].id
                      }
                    }).then(() => setGameDialogOpen(false)).catch((e) => {console.error(e); router.push('/login')})
                    
                  }}
                >DELETE</Button>
            </div>
          </div>
        }
      </Dialog>
      <div className='flex flex-col items-center justify-center h-screen'>
        <div className='border-2 border-gray-100 bg-white rounded-lg drop-shadow-xl'>

          <div className="p-8 min-w-[400px] w-[600px]">
            <div className="p-2 max-h-[80vh] overflow-y-auto">

              {games && games.length !== 0 ? games.map( (game, index) => (
                <div key={index} className="flex flex-row w-full my-2 p-4 border-2 border-gray-100 bg-white rounded-lg drop-shadow-sm">
                  <div className="flex flex-col flex-grow justify-center">

                    <div className="flex">
                      <span className="text-xl font-semibold select-none">{game.name}</span>
                    </div>

                    <div className="flex">
                      <span className="text-md font-light select-none">{game.team0}
                        <span className="text-sm"> vs. </span>
                        {game.team1}
                      </span>
                    </div>

                  </div>

                  <div className="flex flex-col justify-center">
                    <Button 
                      onClick={() => {
                        setFocusedGameIndex(index);
                        setGameDialogOpen(true);
                      }}
                      className="p-2 border-2 border-gray-200 bg-white active:bg-gray-300 drop-shadow-sm"
                    >
                      <DotsVerticalIcon className="h-5 w-5 text-gray-500"></DotsVerticalIcon>
                    </Button>
                  </div>
                </div>
              )) 
              :
              (
                <div>
                  <span>No matches?</span>
                </div>
              )}

            </div>
            <div className="p-2"></div>
            <Button 
              className="w-full p-4 border-2 border-emerald-200 bg-emerald-300 active:bg-emerald-400 drop-shadow-md"
              onClick={(e) => { setCreateGameDialogOpen(true) }}
            >NEW GAME</Button>
          </div>
        </div>
      </div>
    </>
  )
}