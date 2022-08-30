import { Events } from "./constants"

const config = {
  password: 'password',
  randomMapTimeout: 3000,
  schedule: [
    {
      event: Events.WAIT_START,
      team: -1//for typesafety
    },
    {
      event: Events.BAN,
      team: 0
    },
    {
      event: Events.BAN,
      team: 1
    },
    {
      event: Events.PICK,  //Events.PICK must be followed by Events.PICK_SIDE, the app cannot handle anything else.
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
    {
      event: Events.OVER,
      team: -1
    }
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
  ]
}

export { config }