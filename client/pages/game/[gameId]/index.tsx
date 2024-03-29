import { gql, useApolloClient } from "@apollo/client";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { MouseEventHandler, useCallback, useEffect, useRef, useState, Fragment, useContext } from "react"
import { CGame } from "../../../utils/types"
import { config } from "../../../config"
import { Events } from "../../../constants";
import { Dialog } from "../../../components/Dialog";
import Head from "next/head";

import styles from '../../../styles/Game.module.css'
import { getStatusMsg, languages } from "../../../utils/lang";
import format from "string-template";
import { Auth, AuthContext } from "../../_app";

//FIXME: implement language query param
export default () => {

  const client = useApolloClient();

  const [auth, setAuth] = useContext(AuthContext);
  const [game, setGame] = useState<CGame | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lang, setLang] = useState(config.language);

  const router = useRouter();

  const [team, setTeam] = useState<number | null>(null);
  const [key, setKey] = useState<String | undefined>();
  const [statusText, setStatusText] = useState('');

  const [activeMaps, setActiveMaps] = useState<Array<boolean>>(Array<boolean>(8).fill(false))

  const hasInitialized = useRef(false);

  function getNewState(){

    let active = Array<boolean>(8).fill(false);

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
    setStatusText(getStatusMsg(game, lang));
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
      setIsDialogOpen(false);
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
      setIsDialogOpen(false);
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
    setIsDialogOpen(false);
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

    if( router.query.lang){
      let _lang = router.query.lang?.toString();
      if(Object.keys(languages).includes(_lang)){
        setLang((languages as any)[_lang]);
      }
    }
    
    let gameId = parseInt(router.query.gameId as string, 10);
    if (isNaN(gameId)) {router.push('/'); return;}

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

  const ValorantButton: React.FC<{
    children: React.ReactNode,
    onClick: MouseEventHandler,
    className?: string
  }> = ({children, onClick, className}) => {
    return <div 
      className={`cursor-pointer ${styles['button-container']}`}
      onClick={onClick}
    >
      <div className={`bg-clip-content relative ${!className ? '' : className}`}>
        <div
          className="absolute w-full h-full flex justify-center items-center"
        >
          <div className="text-white text-2xl">{children}</div>
        </div>
        <div className={`absolute w-full h-full flex justify-center items-center ${styles['button-overlay']}`}>
          <div className={`absolute w-full h-full flex flex-col justify-between ${styles['button-corners-container']}`}>
            <div className="flex justify-between">
              <div className={`${styles['button-corners']}`}></div>
              <div className={`${styles['button-corners']}`}></div>
            </div>
            <div className="flex justify-between">
              <div className={`${styles['button-corners']}`}></div>
              <div className={`${styles['button-corners']}`}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  }

  const SmallMapFrame: React.FC<{src: string, alt: string, width: string, active: boolean, onClick: MouseEventHandler<HTMLDivElement>}> = ({src, alt, onClick, width, active}) => {
    return <div className="flex flex-col">
      <span className={`text-sm ${styles['small-map-frame-label']}`}>// {alt}</span>
      <div className={`${active ? 'cursor-pointer' : 'grayscale'} relative ${styles['small-map-frame']}`}>
        <div 
          className="flex relative"
          style={{
            width: width,
            aspectRatio: "16/9"
          }}
        >
          <Image
            layout="fill"
            src={src}
            alt={alt}
          ></Image>
        </div>
        { active && 
          <div 
            className={`top-0 left-0 absolute ${styles['small-map-frame-glow']}`}
            style={{
              width: width,
              aspectRatio: "16/9"
            }}
            onClick={onClick}
          ></div>
        }
      </div>
    </div>
  }

  const MapFrame: React.FC<{src?: string, alt?: string, empty: boolean, width: string, pickedBy?: number, attacker?: number}> = ({src, alt, empty, width, attacker, pickedBy}) => {
    let [attTeam, defTeam] = ['', ''];
    let pickTeam = '';

    if(typeof attacker !== 'undefined'){
      [attTeam, defTeam] = attacker === 0 ? [game!.team0, game!.team1] : [game!.team1, game!.team0];
    }

    if(typeof pickedBy !== 'undefined'){
      if(pickedBy === -1) pickTeam = lang.RANDOM_CHOICE
      else pickTeam = pickedBy === 0 ? game!.team0 : game!.team1 ;
    }
    
    return <div className="flex flex-col">
      <div className={`relative bg-vblack ${styles['map-frame']}`}>
        <div className="absolute -z-10 w-full h-full shadow-[0_0_50px_20px_var(--vblack)]"></div>
        <div className="absolute w-full top-[-1.5rem] text-gray-300">
          <div className="relative w-full h-full flex flex-row items-center z-10">
            <div className="h-[0.4rem] bg-vwhite shadow-[0_0_50px_1px_var(--vwhite)] flex-grow z-10"></div>
            <div className="
              flex flex-row justify-center items-center mx-[0.5rem] min-w-[5rem] h-[2rem] bg-vblack select-none relative
              after:content-[''] after:w-full after:absolute after:h-[30%] after:border-vwhite after:border-[1px] after:border-b-0 after:border-opacity-50 after:top-0 after:z-10
              before:content-[''] before:w-full before:absolute before:h-[30%] before:border-vwhite before:border-[1px] before:border-t-0 before:border-opacity-50 before:bottom-0 before:z-10
            ">
              <span className="">{alt}</span>
            </div>
            <div className="h-[0.4rem] bg-vwhite shadow-[0_0_50px_1px_var(--vwhite)] flex-grow z-10"></div>
          </div>
        </div>
        <div 
          className="flex relative"
          style={{
            width: width,
            aspectRatio: "16/9"
          }}
        >
          { !empty &&
            <Image
              layout="fill"
              src={src!}
              alt={alt}
            ></Image>
          }
        </div>
        <div 
          className={`absolute top-0 left-0 ${styles['inset-shadows']}`}
          style={{
            width: width,
            aspectRatio: "16/9"
          }}
        ></div>
        {typeof attacker !== 'undefined' && 
          <div 
            className={`absolute top-0 left-0 ${styles['attack-glow']}`}
            style={{
              width: width,
              aspectRatio: "16/9"
            }}
          ></div>
        }
        {/* <div className="absolute w-full h-[0.4rem] top-[-0.6rem] left-0 bg-vwhite shadow-[0_0_50px_1px_var(--vwhite)]"></div> */}
        <div className={`absolute w-[1px] h-20 bottom-2 right-[-0.25rem] ${styles['details']}`}></div>
        {typeof attacker !== 'undefined' && 
          <div 
            className={`absolute top-0 left-0 flex flex-col justify-between items-start`}
            style={{
              width: width,
              aspectRatio: "16/9"
            }}
          >
            <div className="relative mt-[10px] opacity-90 bg-vblack left-[-1rem] flex justify-center items-center">
              <span className="select-none m-2 text-xl font-semibold text-vred">
                {attTeam}
              </span>
              <div className="absolute flex h-full w-full">
                <div className="bg-vred h-[100%] w-[2px] shadow-[0_0_20px_5px_var(--vred)]"></div>
              </div>
            </div>
            <div className="relative mb-[10px] opacity-90 bg-vblack left-[-1rem] flex justify-start items-center">
              <span className="select-none m-2 text-xl font-semibold text-vgreen">
                {defTeam}
              </span>
              <div className="absolute flex h-full w-full">
                <div className="bg-vgreen h-[100%] w-[2px] shadow-[0_0_20px_5px_var(--vgreen)]"></div>
              </div>
            </div>
          </div>
        }
      </div>
      {empty ? 
        <div>
          <br/>
        </div>
        :
        <div className="bg-gray-300 bg-opacity-10 flex justify-center items-center">
          <span className="text-gray-300 select-none">{pickTeam}</span>
        </div>
      }
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
            width="18vw"
            active={activeMaps[mapIdx]}
          />
        )}
      </div>
    </>
  }

  const PickedMapRow: React.FC = () => {
    return <>{game &&
        <div className="flex flex-row flex-wrap justify-evenly">
          {Array.from(Array(config.pickedMapCount).keys()).map(mapIdx => 
            {
              let empty = mapIdx >= game.maps.length;

              let hasAttacker = !empty && game.maps[mapIdx].attacker !== null;

              let map = empty ? undefined: game.maps[mapIdx].map;

              return <MapFrame 
                key={mapIdx}
                src={empty ? undefined : config.mapUrls[map!] }
                alt={empty ? undefined : config.maps[map!] }
                empty={empty}
                width="30vw"
                attacker={ hasAttacker ? game.maps[mapIdx].attacker : undefined }
                pickedBy={empty ? undefined : game.maps[mapIdx].pickedBy}
              />
            }
          )}
        </div>
      }</>
  }
  const BannedMapRow: React.FC = () => {
    return <>{game &&
        <div className="flex flex-row flex-wrap justify-evenly">
          {Array.from(Array(config.bannedMapCount).keys()).map(banIdx => 
            {
              let empty = banIdx >= game.bans.length;

              let map = empty ? undefined: game.bans[banIdx].map;

              return <MapFrame 
                key={banIdx}
                src={empty ? undefined : config.mapUrls[map!] }
                alt={empty ? undefined : config.maps[map!] }
                empty={empty}
                width="20vw"
                pickedBy={empty ? undefined : game.bans[banIdx].pickedBy}
              />
            }
          )}
        </div>
      }</>
  }

  return <>
    <Head>
      <title>Voting</title>
      <style>{`
        body {
          background-color: #101723;
          //background-image: url(/img/bg.png);
          //background-size: 100% auto;

        }
        `}</style>
    </Head>
    <div className="z-20 fixed">
      <Dialog isOpen={isDialogOpen} toClose={() => {}}>
        {isDialogOpen && 

          <div className={`relative w-[80vw] ${styles['dialog']}`}>
            {
              config.schedule[game!.state].event === Events.PICK_SIDE ? 
              <>  
                <div className="mt-4 mb-8 text-gray-300 text-xl flex flex-col items-center">
                  <p>{format(lang.NEXT_MAP, {
                    number: game!.maps.length,
                    map: config.maps[game!.maps[game!.maps.length - 1].map]
                  })}</p>
                  <p>{lang.PICK_SIDE_IMPERATIVE}</p>
                </div>
                <div className="mb-4 flex justify-evenly">
                  <ValorantButton className="bg-vred w-[200px] h-[80px]" onClick={() => {
                    handleSidePick(true);
                  }}>{lang.ATTACK}</ValorantButton>
                  <ValorantButton className="bg-vgreen w-[200px] h-[80px]" onClick={() => {
                    handleSidePick(false);
                  }}>{lang.DEFENSE}</ValorantButton>
                </div>
              </>
              :
              <>
                <div className="mt-6 mb-8 flex justify-center">
                  <span className="text-3xl text-gray-300">{ config.schedule[game!.state].event === Events.BAN ? <>
                    {lang.BAN_IMPERATIVE}
                  </> : <>
                    {lang.PICK_IMPERATIVE}
                  </> }</span>
                </div>
                <div className="mb-6">
                  <MapRow arr={[0,1,2,3]}></MapRow>
                </div>
                <div>
                  <MapRow arr={[4,5,6,7]}></MapRow>
                </div>
                <div className="h-12"></div>
              </>
            }
            <div className={`absolute w-[10px] h-[4px] bottom-0 left-0 ${styles['details']}`}></div>
            <div className={`absolute w-[10px] h-[4px] bottom-0 right-0 ${styles['details']}`}></div>
            <div className={`absolute h-[5px] top-[-3px] ${styles['top-details']}`}></div>
          </div>
        }
      </Dialog>
    </div>
    <div className="relative flex flex-col h-screen w-screen overflow-x-hidden">
      <div className={`fixed w-full border-b-[1px] border-gray-300 ${styles['top-bar']}`}>
        <div className="absolute w-full h-[5vh] flex justify-center">
          <div className={`relative h-full flex flex-row ${styles['top-sign']}`}>
            <div className="bg-gray-300 w-[20rem] h-full mx-[20px]">
            </div>
          </div>
        </div>
        <div className="absolute w-full h-full flex justify-center">
          <div className="flex flex-col justify-center">
            <span className={`text-2xl select-none ${styles['v-anton']}`}>
              MAP VOTING
            </span>
          </div>
        </div>
        <div className="absolute h-full flex flex-col justify-center">
          <span className={`ml-[10px] text-md font-medium select-none text-gray-300 ${styles['v-anton']}`}>
            {statusText}
          </span>
        </div>
      </div>
      <div className="flex flex-col h-screen">
        <div className="bottom-0 w-full h-[5vh]"></div>
        <div className="flex-grow flex-shrink flex flex-col justify-evenly">
          <div className="flex justify-center">
          <span className={`text-gray-300 text-3xl font-bold ${styles['v-anton']}`}>MAPS</span>
          </div>
          <div className="mb-2">
            <PickedMapRow></PickedMapRow>
          </div>
          <div className="flex justify-center">
            <span className={`text-gray-300 text-3xl font-bold ${styles['v-anton']}`}>BANS</span>
          </div>
          <div className="mb-2">
            <BannedMapRow></BannedMapRow>
          </div>
        </div>
        <div className="bottom-0 w-full h-[5vh]  mt-6"></div>
      </div>
      <div className="right-[10px] bottom-[70px] h-[10px] w-[10px] bg-vred fixed -z-10"></div>
      <div className="right-[10px] bottom-[85px] h-[4px] w-[4px] bg-vred fixed -z-10"></div>
      <div className="right-[10px] bottom-[95px] h-[4px] w-[4px] bg-vred fixed -z-10"></div>

      <div className="left-[20vw] h-screen w-[1px] bg-gray-300 opacity-20 fixed -z-10"></div>
      <div className="top-[10vh] w-screen h-[1px] bg-gray-300 opacity-20 fixed -z-10"></div>

      <div className="top-[52vh] left-[62vw] h-[4px] w-[4px] bg-vred fixed -z-10"></div>
      <div className="top-[52vh] left-[calc(62vw+10px)] h-[4px] w-[4px] bg-vred fixed -z-10"></div>

      <div className="bottom-[36vh] left-[32.5vw] h-[6px] w-[30px] bg-vred fixed -z-10"></div>

      <div className="bottom-[36vh] right-[28vw] h-[4px] w-[30px] bg-vred fixed -z-10"></div>
      <div className="bottom-[36vh] right-[calc(28vw-10px)] h-[4px] w-[4px] bg-vred fixed -z-10"></div>
      <div className="bottom-[36vh] right-[calc(28vw-20px)] h-[4px] w-[4px] bg-vred fixed -z-10"></div>
      
      <div className="top-[37vh] left-[33vw] h-[4px] w-[4px] bg-vred fixed -z-10"></div>
      <div className="top-[calc(37vh+10px)] left-[33vw] h-[40px] w-[4px] bg-vred fixed -z-10"></div>

      <div className="top-[27vh] left-[10px] h-[40px] w-[4px] bg-vred fixed -z-10"></div>

      <div className="top-[10vh] right-[5vw] w-[60px] h-[4px] bg-vred fixed -z-10"></div>

      <div className="top-[52vh] right-[3vw] h-[4px] w-[4px] bg-vred fixed -z-10"></div>
      <div className="top-[52vh] right-[calc(3vw+10px)] h-[4px] w-[4px] bg-vred fixed -z-10"></div>
      <div className="top-[52vh] right-[calc(3vw+20px)] h-[4px] w-[4px] bg-vred fixed -z-10"></div>
      <div className="top-[52vh] right-[calc(3vw+30px)] h-[4px] w-[4px] bg-vred fixed -z-10"></div>

      <div className="left-[calc(20vw-10px)] top-[55vh] w-[10px] h-[60px] bg-vred fixed -z-10"></div>

      <div className="top-[10vh] left-[40vw] w-[4px] h-[4px] bg-vred fixed -z-10"></div>
      <div className="top-[10vh] left-[calc(40vw+10px)] w-[4px] h-[4px] bg-vred fixed -z-10"></div>

      <div className="left-[10px] bottom-[28vh] h-[60px] w-[4px] bg-vred fixed -z-10"></div>
      <div className="left-[10px] bottom-[calc(28vh-10px)] h-[4px] w-[4px] bg-vred fixed -z-10"></div>
      <div className="left-[10px] bottom-[calc(28vh-20px)] h-[4px] w-[4px] bg-vred fixed -z-10"></div>

      <div className={`h-1/2 fixed -z-20 flex flex-nowrap justify-around ${styles['bg-text-upper']}`}>
        <span className={`text-[45vh] leading-tight mx-[8vh] ${styles['bg-text']} ${styles['v-anton']}`}>STREAMERCUP</span>
        <span className={`text-[45vh] leading-tight mx-[8vh] ${styles['bg-text']} ${styles['v-anton']}`}>STREAMERCUP</span>
        <span className={`text-[45vh] leading-tight mx-[8vh] ${styles['bg-text']} ${styles['v-anton']}`}>STREAMERCUP</span>
      </div>
      <div className={`h-1/2 fixed bottom-0 -z-20 flex flex-nowrap justify-around ${styles['bg-text-lower']}`}>
        <span className={`text-[45vh] leading-tight mx-[8vh] ${styles['bg-text']} ${styles['v-anton']}`}>STREAMERCUP</span>
        <span className={`text-[45vh] leading-tight mx-[8vh] ${styles['bg-text']} ${styles['v-anton']}`}>STREAMERCUP</span>
        <span className={`text-[45vh] leading-tight mx-[8vh] ${styles['bg-text']} ${styles['v-anton']}`}>STREAMERCUP</span>
      </div>
    </div>
    <div className="fixed bottom-0 w-full h-[5vh] flex justify-end items-center">
      <span className={`text-2xl text-vred select-none p-[10px] ${styles['v-anton']}`}>
        {lang.FOOTER}
      </span>
    </div>
    <div className="fixed w-[100vw] bottom-0 left-0 z-10 shadow-[0_0_100vh_1vh_var(--vsky)]"></div>
  </>
}