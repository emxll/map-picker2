import { IncomingMessage } from "http";

export function getIncomingMsgCookies(msg: IncomingMessage){
  const cookies: any = {};
  if(msg.headers.cookie){ 
    msg.headers.cookie.split(';').forEach(cookie => {
      let parts = cookie.split('=');
      cookies[parts[0].trim()] = (parts[1] || '').trim()
      return
    })
  }
  return cookies;
}