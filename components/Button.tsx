import React, { MouseEventHandler } from "react"

const Button: React.FunctionComponent<{
  className?: string, 
  children?: React.ReactNode,
  onClick?: MouseEventHandler<HTMLButtonElement>
}> = ({className, children, onClick }) => {
  return <button 
    onClick={onClick} 
    className={`font-bold text-white rounded-md ${className}`}
  >{children}</button>
}

export { Button }