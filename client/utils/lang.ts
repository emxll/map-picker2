import { config } from "../config";
import { Events } from "../constants";
import { CGame } from "./types";
import format from 'string-template';

const lang_en: any = {
  statusMsg: {},
  NO_BANS: 'No maps have been banned yet.',
  NO_MAPS: 'No maps have been picked yet.',
  NO_MATCHES: 'No matches?',
  RANDOM_CHOICE: 'Random choice',
  START_GAME: 'START GAME',
  DELETE: 'DELETE',
  NEW_GAME: 'NEW GAME',
  CREATE: 'CREATE',
  NEXT_MAP: 'Map {number} will be {map}.',
  BAN_IMPERATIVE: 'Ban a map',
  PICk_IMPERATIVE: 'Pick a map',
  PICK_SIDE_IMPERATIVE: 'Do you want to start on attacker or defender side on this map?',
  ATTACK: 'ATTACK',
  DEFENSE: 'DEFENSE',
  FOOTER: 'STREAMERCUP CHAPTER III - ONETAP'
}

lang_en.statusMsg[Events.WAIT_START] = 'WAITING FOR GAME TO START'
lang_en.statusMsg[Events.BAN] = '{team} IS BANNING A MAP'
lang_en.statusMsg[Events.PICK] = '{team} IS PICKING A MAP'
lang_en.statusMsg[Events.PICK_SIDE] = '{team} IS PICKING A SIDE'
lang_en.statusMsg[Events.RANDOM] = 'A MAP IS BEING CHOSEN RANDOMLY'
lang_en.statusMsg[Events.OVER] = 'MAP SELECTION IS OVER'

function getStatusMsg(game: CGame, lang: any){

  let team = config.schedule[game.state].team === 0 ? game.team0 : game.team1;
  return format(lang.statusMsg[config.schedule[game.state].event], {
    team
  });

}

export {lang_en, getStatusMsg}