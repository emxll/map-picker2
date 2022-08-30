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
import Head from "next/head";

import styles from '../../../styles/Game.module.css'
import { getStatusMsg } from "../../../utils/lang";

export default () => {

  const [auth, setAuth] = useContext(AuthContext);

  const [game, setGame] = useState<CGame | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const router = useRouter();

  const [team, setTeam] = useState<number | null>(null);
  const [key, setKey] = useState<String | undefined>();
  const [statusText, setStatusText] = useState('');

  const [activeMaps, setActiveMaps] = useState<Array<Boolean>>(Array<Boolean>(8).fill(false))

  const hasInitialized = useRef(false);

  function getNewState(){

    let active = Array<Boolean>(8).fill(false);

    if(
      !game 
      || team === null 
      || config.schedule[game.state].team !== team 
      || [Events.WAIT_START, Events.RANDOM, Events.OVER].includes(config.schedule[game.state].event)
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

  function getNewStatusMsg(){
    if(!game) return;
    setStatusText(getStatusMsg(game, config.language));
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
    getNewStatusMsg();
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

  const SmallMapFrame: React.FC<{src: string, alt: string, onClick: MouseEventHandler<HTMLDivElement>}> = ({src, alt, onClick}) => {
    return <div 
      className="flex" 
      style={{
        width: "15vw",
        aspectRatio: "16/9",
        position: 'relative'
      }}
      onClick={onClick}
    >
      <Image
        layout="fill"
        objectFit="contain"
        src={src}
        alt={alt}
      ></Image>
    </div>
  }

  const MapFrame: React.FC<{src: string, alt: string, empty: boolean, width: string}> = ({src, alt, empty, width}) => {
    return <div className={`relative ${styles['map-frame']}`}>
      <div 
        className={`absolute ${styles['inset-shadows']}`}
        style={{
          width: width,
          aspectRatio: "16/9"
        }}
      ></div>
      <div 
        className="flex"
        style={{
          width: width,
          aspectRatio: "16/9"
        }}
      >
        { !empty &&
          <Image
            layout="fill"
            objectFit="contain"
            src={src}
            alt={alt}
          ></Image>
        }
      </div>
      <div className={`absolute w-[1px] h-20 bottom-2 left-[-0.25rem] ${styles['details']}`}></div>
      <div className={`absolute w-[1px] h-20 top-2 right-[-0.25rem] ${styles['details']}`}></div>
    </div>
  }

  const MapRow: React.FC<{arr: Array<number>}> = ({arr}) => {
    return <> 
      <div className="flex flex-row flex-wrap justify-around">
        {arr.map(mapIdx => 
          <SmallMapFrame 
            key={mapIdx}
            src={config.mapUrls[mapIdx]}
            alt={config.maps[mapIdx]}
            onClick={() => {
              handleMapClick(mapIdx);
            }}
          />
        )}
      </div>
    </>
  }

  const PickedMapRow: React.FC = () => {
    return <>{game &&
        <div className="flex flex-row flex-wrap justify-center">
          {Array.from(Array(config.pickedMapCount).keys()).map(mapIdx => 
            {
              let map = game.maps[mapIdx] ? game.maps[mapIdx].map: 0;


              return <MapFrame 
                key={mapIdx}
                src={config.mapUrls[map]}
                alt={config.maps[map]}
                empty={mapIdx >= game.maps.length}
                width="30vw"
              />
            }
          )}
        </div>
      }</>
  }
  const BannedMapRow: React.FC = () => {
    return <>{game &&
        <div className="flex flex-row flex-wrap justify-center">
          {Array.from(Array(config.bannedMapCount).keys()).map(banIdx => 
            {
              let map = game.bans[banIdx] ? game.bans[banIdx].map: 0;

              return <MapFrame 
                key={banIdx}
                src={config.mapUrls[map]}
                alt={config.maps[map]}
                empty={banIdx >= game.bans.length}
                width="20vw"
              />
            }
          )}
        </div>
      }</>
  }

  return <>
    <Head>
      <style>{`
        body {
          background-color: #0d2842;
          //background-image: url(/img/bg.png);
          //background-size: 100% auto;

        }
        `}</style>
    </Head>
    <Dialog isOpen={isDialogOpen} toClose={() => {}}>
      {isDialogOpen && 

        <div className={`w-[80vw] h-[80vh] ${styles['dialog']}`}>
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
              <span>{ config.schedule[game!.state].event === Events.BAN ? <>
                Ban a map
              </> : <>
                Pick a map
              </> }</span>
              <MapRow arr={[0,1,2,3]}></MapRow>
              <MapRow arr={[4,5,6,7]}></MapRow>
            </>
          }
          <div className={`w-[10px] h-[4px] bottom-0 left-0 ${styles['details']}`}></div>
        </div>
      }
    </Dialog>
    <div className="flex flex-col h-screen">
      <div className={`relative w-full border-b-[1px] border-gray-300 ${styles['top-bar']}`}>
        <div className="absolute w-full h-[60px] flex justify-center">
          <div className={`relative h-full flex flex-row ${styles['top-sign']}`}>
            <div className="bg-gray-300 w-[20rem] h-full mx-[20px]">
            </div>
          </div>
        </div>
        <div className="absolute w-full h-full flex justify-center">
          <div className="flex flex-col justify-center">
            <span className="text-lg font-semibold select-none">
              MAP PICKER
            </span>
          </div>
        </div>
        <div className="absolute h-full flex flex-col justify-center">
          <span className="ml-[10px] text-md font-medium select-none text-gray-300">
            {statusText}
          </span>
        </div>
      </div>
      <div className="flex-grow flex flex-col justify-around">
        <div>
          <PickedMapRow></PickedMapRow>
        </div>
        <div>
          <BannedMapRow></BannedMapRow>
        </div>
      </div>
      <div className=" bottom-0 w-full h-[50px]"></div>
    </div>
    <div className="fixed bottom-0 w-full h-[50px] bg-red-400 flex justify-center items-center">
      <span className="text-md select-none">
        STREAMERCUP CHAPTER III - ONETAP
      </span>
    </div>
  </>
}