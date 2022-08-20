import { IncomingMessage } from "http";

export function setCookie(cname: string, cvalue: string , exdays: number) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

export function getCookie(cname: string) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

export function getAuthCookie(){
  return getCookie('auth');
}

export function setAuthCookie(authStr: string){
  return setCookie('auth', authStr, 9999999);
}

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