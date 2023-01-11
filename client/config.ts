import { Events } from "./constants"
import { languages } from "./utils/lang"

const config = {
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
  pickedMapCount: 3,
  bannedMapCount: 2,
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
  mapUrls: [
    'https://static.wikia.nocookie.net/valorant/images/2/23/Loading_Screen_Bind.png/revision/latest?cb=20200620202316',
    'https://static.wikia.nocookie.net/valorant/images/e/e7/Loading_Screen_Ascent.png/revision/latest?cb=20200607180020',
    'https://static.wikia.nocookie.net/valorant/images/7/70/Loading_Screen_Haven.png/revision/latest?cb=20200620202335',
    'https://static.wikia.nocookie.net/valorant/images/d/d6/Loading_Screen_Split.png/revision/latest?cb=20200620202349',
    'https://static.wikia.nocookie.net/valorant/images/1/13/Loading_Screen_Icebox.png/revision/latest?cb=20201015084446',
    'https://static.wikia.nocookie.net/valorant/images/1/10/Loading_Screen_Breeze.png/revision/latest?cb=20210427160616',
    'https://static.wikia.nocookie.net/valorant/images/f/fc/Loading_Screen_Fracture.png/revision/latest?cb=20210908143656',
    'https://static.wikia.nocookie.net/valorant/images/a/af/Loading_Screen_Pearl.png/revision/latest?cb=20220622132842'
  ],
  graphqlUri: 'http://localhost:3002/api/graphql',
  graphqlWsUri: 'ws://localhost:3002/api/graphql',
  language: languages.de
}

export { config }