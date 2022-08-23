import { Events } from "./constants"

const config = { 
  password: 'password',
  schedule: [
    {
      event: Events.BAN,
      team: 0
    },
    {
      event: Events.BAN,
      team: 1
    },
    {
      event: Events.PICK,  //events.PICK must be followed by events.PICK_SIDE, the app cannot handle anything else.
      team: 0
    },
    {
      event: Events.PICK_SIDE,
      team: 1
    },
    {
      event: Events.PICK,
      team: 1
    },
    {
      event: Events.PICK_SIDE,
      team: 0
    },
    {
      event: Events.RANDOM,
      team: -1 //for typesafety
    },
  ],
  maps: [
    'Bind',
    'Ascent',
    'Haven',
    'Split',
    'Icebox',
    'Breeze',
    'Fracture',
    'Pearl'
  ],
  graphqlUri: 'http://localhost:3002/api/graphql',
  graphqlWsUri: 'ws://localhost:3002/api/graphql'
}

export { config }