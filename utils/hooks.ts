import { ReactNode, RefObject, useEffect } from "react";


// shamelessly zoinked from stackoverflow: 
// https://stackoverflow.com/questions/32553158/detect-click-outside-react-component

function useOutsideAlerter(ref: RefObject<HTMLElement>, callback: Function, dependencies: Array<any>) {

  //this shit gets called whenever a dependency changes which fucking sucks but (it looks like) 
  //react doesnt provide an alternative
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [ref, ...dependencies]);
}

export { useOutsideAlerter }