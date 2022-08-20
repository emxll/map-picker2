export type Game = {
  id: number,
  name: string,
  state: number,
  team0: string,
  team1: string,
  key0: string,
  key1: string,
}

export type Map = {
  position: number,
  map: number,
  attacker: number,
  pickedBy: number
}

export type Ban = {
  position: number,
  map: number,
  pickedBy: number,
}

export type CGame = Game & {
  bans: Array<Ban>,
  maps: Array<Map>,
}