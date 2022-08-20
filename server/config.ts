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
      event: Events.PICK,
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
      team: 0
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
  ]
}

export { config }