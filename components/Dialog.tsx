import { MouseEventHandler, useRef } from "react"
import { useOutsideAlerter } from "../utils/hooks"

const Dialog: React.FunctionComponent<{
  children?: React.ReactNode,
  isOpen: boolean,
  toClose: Function,
  className?: string, 
}> = ({ children, isOpen, toClose, className }) => {

  const dialogRef = useRef(null);
  useOutsideAlerter(dialogRef, () => {
    if(isOpen){
      toClose();  
    }
  }, [isOpen]);
  
  return (
    <>
      <div 
        className={"transition-opacity ease-in-out duration-300 pointer-events-none fixed w-screen h-screen bg-black z-10 "
        + (isOpen ? 'opacity-30' : 'opacity-0')}
      ></div>
      <div 
        className={"transition-transform ease-in-out duration-300 pointer-events-none fixed flex flex-col items-center justify-center w-screen h-screen z-10 "
        + ( isOpen ? '' : 'scale-0' )
      }
      >
        <div ref={dialogRef} className={`pointer-events-auto flex ${className}`}>
          {children}
        </div>
      </div>
    </>
  )
}

export { Dialog }