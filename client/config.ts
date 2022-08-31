import { Events } from "./constants"
import { lang_de, lang_en } from "./utils/lang"

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
    'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt8538036a309525ae/5ebc470bfd85ad7411ce6b50/bind-featured.png',
    'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blta9b912e1a1b59aa4/5ebc471cfa550001f72bcb13/ascent-featured.png',
    'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt8afb5b8145f5e9b2/5ebc46f7b8c49976b71c0bc5/haven-featured.png',
    'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/bltd188c023f88f7d91/5ebc46db20f7727335261fcd/split-featured.png',
    'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/bltde02911a015d7ef9/5f80d2851f5f6d4173b4e49d/Icebox_transparentbg_for_Web.png',
    'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/bltb03d2e4867f2e324/607f995892f0063e5c0711bd/breeze-featured_v1.png',
    'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/bltf4485163c8c5873c/6131b23e9db95e7ff74b6393/Valorant_FRACTURE_Minimap_Alpha_web.png',
    'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/bltd0a2437fb09ebde4/62a2805b58931557ed9f7c9e/PearlLoadingScreen_MapFeaturedImage_930x522.png'
  ],
  graphqlUri: 'http://localhost:3002/api/graphql',
  graphqlWsUri: 'ws://localhost:3002/api/graphql',
  language: lang_de
}

export { config }