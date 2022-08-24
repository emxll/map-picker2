import { gql } from "@apollo/client";
import Image from "next/image";
import { useRouter } from "next/router";
import { MouseEventHandler, useCallback, useEffect, useRef, useState, Fragment, useContext } from "react"
import client from "../../../apollo-client";
import { CGame } from "../../../utils/types"
import { config } from "../../../config"
import { Events } from "../../../constants";
import { AuthContext, Auth } from "../../_app";
import { Dialog } from "../../../components/Dialog";

export default () => {

  const [auth, setAuth] = useContext(AuthContext);

  const [game, setGame] = useState<CGame | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const router = useRouter();

  const [team, setTeam] = useState<number | null>(null);
  const [key, setKey] = useState<String | undefined>();

  const [activeMaps, setActiveMaps] = useState<Array<Boolean>>(Array<Boolean>(8).fill(false))

  const hasInitialized = useRef(false);

  function getNewState(){

    let active = Array<Boolean>(8).fill(false);

    if(
      !game 
      || team === null 
      || game.state === -1 
      || game.state >= config.schedule.length
      || config.schedule[game.state].team !== team 
    ){
      setActiveMaps(active); 
      setIsDialogOpen(false);
      return;
    }
    if(config.schedule[game.state].event === Events.PICK_SIDE){
      setActiveMaps(active);
      setIsDialogOpen(true);
      return;
    }

    for(var mapIdx = 0; mapIdx < 8; mapIdx++){

      if(config.schedule[game.state].event === Events.BAN){
        //check if already banned
        if(game.bans.some(ban => ban.map === mapIdx)) continue;
      }

      if(config.schedule[game.state].event === Events.PICK){
        //check if already banned or picked
        if(game.maps.some(map => map.map === mapIdx) || game.bans.some(ban => ban.map === mapIdx)) continue;
      }
      active[mapIdx] = true;
    }
    setActiveMaps(active);
    setIsDialogOpen(true);
  }

  function handleMapClick(mapIdx: number){
    if(!activeMaps[mapIdx]) return;
    if(config.schedule[game!.state].event === Events.BAN){
      client.mutate({
        mutation: gql`
          mutation BanMap($gameId: Int!, $map: Int!) {
            banMap(gameId: $gameId, map: $map)
          }
        `,
        variables: {
          gameId: game!.id,
          map: mapIdx
        },
        context: {
          headers: {
            authorization: `Key ${auth.key}`
          }
        }
      });
      return;
    }
    if(config.schedule[game!.state].event === Events.PICK){
      client.mutate({
        mutation: gql`
          mutation Mutation($gameId: Int!, $map: Int!) {
            pickMap(gameId: $gameId, map: $map)
          }
        `,
        variables: {
          gameId: game!.id,
          map: mapIdx
        },
        context: {
          headers: {
            authorization: `Key ${auth.key}`
          }
        }
      });
      return;
    }
  }

  function handleSidePick(isAttacker: boolean){
    let attacker = isAttacker !== (team === 1) ? 0 : 1;

    client.mutate({
      mutation: gql`
        mutation PickSide($gameId: Int!, $attacker: Int!) {
          pickSide(gameId: $gameId, attacker: $attacker)
        }
      `,
      variables: {
        gameId: game!.id,
        attacker: attacker,
      },
      context: {
        headers: {
          authorization: `Key ${auth.key}`
        }
      }
    });
    return;
  }

  useEffect(() => {
    getNewState();
  }, [game])

  //setup
  useEffect(() => {

    if(!router.isReady) return;
    if(hasInitialized.current) return;
    
    let gameId = parseInt(router.query.gameId as string, 10) //FIXME: catch

    let _key: string | null = null;

    if(router.query.key) {
      _key = typeof router.query.key === 'string' ? router.query.key : router.query.key![0];
      setAuth((auth: Auth) => ({...auth, key: _key}) );
    }

    client.query({
      query: gql`
        query Query($gameId: Int!) {
          getTeam(gameId: $gameId)
          game(gameId: $gameId) {
            id
            name
            state
            team0
            team1
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
      },
      context: {
        ..._key !== null && {
          headers: {
            authorization: `Key ${_key}`
          }
        }
      }
    }).then( ({data}) => {
      setTeam(data.getTeam);
      setGame(data.game);
    }).catch(() => router.push('/') )
    const onGameChange = client.subscribe({
      query: gql`
        subscription Game($gameId: Int!) {
          game(gameId: $gameId) {
            id
            name
            state
            team0
            team1
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
    }).subscribe( ({data}: any) => {
      setGame(data.game);
    });

    hasInitialized.current = true;

    return () => {
      onGameChange.unsubscribe()
    }

  }, [ router.isReady]);

  const MapRow: React.FC<{arr: Array<number>}> = ({arr}) => {
    return <> 
      <div className="flex flex-row flex-wrap">
        {arr.map(mapIdx => 
          <Fragment key={mapIdx}>
            <div 
              onClick={() => {
                handleMapClick(mapIdx);
              }}
              className="flex" style={{
                width: "20vw",
                height: "20vh",
                position: "relative"
            }}>
              <Image
                src={config.mapUrls[mapIdx]}
                alt={config.maps[mapIdx]}
                layout="fill"
                objectFit="contain"
              ></Image>
            </div>
          </Fragment>
        )}
      </div>
    </>
  }

  return <>
    <Dialog isOpen={isDialogOpen} toClose={() => {}}>
      {isDialogOpen && 

        <div className="w-[80vw] h-[80vh] bg-white">
        {
          config.schedule[game!.state].event === Events.PICK_SIDE ? 
          <>
              <p>Map {game!.maps.length } will be {config.maps[game!.maps[game!.maps.length - 1].map]}.</p>
              <p>Do you want to start on attacker or defender side on this map?</p>
              <button onClick={() => {
                handleSidePick(true);
              }}>Attack</button>
              <button onClick={() => {
                handleSidePick(false);
              }}>Defense</button>
          </>
          :
          <>
            { config.schedule[game!.state].event === Events.BAN ? <>
              Ban a map
            </> : <>
              Pick a map
            </> }
            <MapRow arr={[0,1,2,3]}></MapRow>
            <MapRow arr={[4,5,6,7]}></MapRow>
          </>
        }
        </div>
      }
    </Dialog>
    {JSON.stringify(game)}
  </>
}