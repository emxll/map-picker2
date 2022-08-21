import { gql } from "@apollo/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react"
import client from "../../../apollo-client";
import { CGame } from "../../../utils/types"

export default () => {

  const [game, setGame] = useState<CGame | null>(null);

  const router = useRouter();

  //setup
  useEffect( () => {
    if(!router.isReady) return;
    
    let gameId = parseInt(router.query.gameId as string, 10) //FIXME: catch

    client.query({
      query: gql`
        query Game($gameId: Int!) {
          game(gameId: $gameId) {
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
      variables: {
        gameId: gameId
      }
    }).then( ({data}) => setGame(data.game))//FIXME: catch
  }, [router.isReady])

  return <>
    {JSON.stringify(game)}
  </>
}