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
  PICK_SIDE_IMPERATIVE: 'Do you want to start on attacker or defender side on this map?',
  BAN_IMPERATIVE: 'Ban a map',
  PICK_IMPERATIVE: 'Pick a map',
  ATTACK: 'ATTACK',
  DEFENSE: 'DEFENSE',
  FOOTER: 'STREAMERCUP CHAPTER III - LULW',
  GREETING: 'Hey there!',
  PASSWORD: 'PASSWORD',
  PASSWORD_INCORRECT: 'Password incorrect',
  TOO_LONG: 'Can\'t be longer than {maxLen} characters!',
  NO_EMPTY: 'Can\'t be empty!',
  CREATE_IMPERATIVE: 'Create a new game',
  NAME: 'NAME',
  TEAM: 'TEAM {number}',
  SPECTATE: 'Spectate'

}

lang_en.statusMsg[Events.WAIT_START] = 'WAITING FOR VOTING TO START'
lang_en.statusMsg[Events.BAN] = '{team} IS BANNING A MAP'
lang_en.statusMsg[Events.PICK] = '{team} IS PICKING A MAP'
lang_en.statusMsg[Events.PICK_SIDE] = '{team} IS PICKING A SIDE'
lang_en.statusMsg[Events.RANDOM] = 'A MAP IS BEING CHOSEN RANDOMLY'
lang_en.statusMsg[Events.OVER] = 'MAP VOTING HAS CONCLUDED'

const lang_de: any = {
  statusMsg: {},
  NO_BANS: 'Es wurden noch keine Maps gebannt.',
  NO_MAPS: 'Es wurden noch keine Maps gewählt.',
  NO_MATCHES: 'Keine matches?',
  RANDOM_CHOICE: 'Zufällig gewählt',
  START_GAME: 'SPIEL STARTEN',
  DELETE: 'LÖSCHEN',
  NEW_GAME: 'NEUES SPIEL',
  CREATE: 'ERSTELLEN',
  NEXT_MAP: 'Map {number} wird {map} sein.',
  PICK_SIDE_IMPERATIVE: 'Willst du auf dieser Map als Angreifer oder Verteidiger starten?',
  BAN_IMPERATIVE: 'Banne eine Map',
  PICK_IMPERATIVE: 'Wähle eine Map',
  ATTACK: 'ANGREIFER',
  DEFENSE: 'VERTEIDIGER',
  FOOTER: 'STREAMERCUP CHAPTER III - LULW',
  GREETING: 'Guten Tag!',
  PASSWORD: 'PASSWORT',
  PASSWORD_INCORRECT: 'Falsches passwort',
  TOO_LONG: 'Darf nicht länger als {maxLen} Zeichen sein!',
  NO_EMPTY: 'Darf nicht leer sein!',
  CREATE_IMPERATIVE: 'Erstelle ein neues Spiel',
  NAME: 'NAME',
  TEAM: 'TEAM {number}',
  SPECTATE: 'Zuschauer'
}

lang_de.statusMsg[Events.WAIT_START] = 'WARTEN BIS DAS VOTING BEGINNT'
lang_de.statusMsg[Events.BAN] = '{team} BANNT JETZT EINE MAP'
lang_de.statusMsg[Events.PICK] = '{team} WÄHLT JETZT EINE MAP'
lang_de.statusMsg[Events.PICK_SIDE] = '{team} WÄHLT JETZT EINE SEITE'
lang_de.statusMsg[Events.RANDOM] = 'EINE MAP WIRD ZUFÄLLIG AUSGEWÄHLT'
lang_de.statusMsg[Events.OVER] = 'MAP VOTING WURDE BEENDET'

function getStatusMsg(game: CGame, lang: any){

  let team = config.schedule[game.state].team === 0 ? game.team0 : game.team1;
  return format(lang.statusMsg[config.schedule[game.state].event], {
    team: team.toUpperCase(),
  });

}

const languages = {
  en: lang_en,
  de: lang_de
}

export {languages, getStatusMsg}