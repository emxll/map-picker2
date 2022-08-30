import React, { ChangeEventHandler } from "react"

const TextInput: React.FunctionComponent<{
  hidden?: boolean, 
  className?: string, 
  children?: React.ReactNode,
  value?: string,
  onChange?: ChangeEventHandler<HTMLInputElement>,
}> = ({className, children, hidden, value, onChange }) => {
  return <input 
    type={hidden ? 'password': ''}
    value={value}
    onChange={onChange}
    className={`border-2 border-gray-200 rounded text-gray-700 leading-tight focus:outline-none transition-colors ease-in-out duration-300 ${!className ? '' : className}`}
  ></input>
}

export { TextInput }