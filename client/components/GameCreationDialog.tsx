import { gql } from "@apollo/client"
import { useRouter } from "next/router"
import { useState } from "react"
import client from "../apollo-client"
import { config } from "../config"
import { Button } from "./Button"
import { Dialog } from "./Dialog"
import { TextInput } from "./TextInput"

const GameCreationDialog: React.FC<{
  isOpen: boolean,
  toClose: Function
}> = ( {isOpen, toClose}) => {

  const router = useRouter();

  const [name, setName] = useState('');
  const [team0, setTeam0] = useState('');
  const [team1, setTeam1] = useState('');

  const [errors, setErrors] = useState<Array<String>>(['','','']);

  function checkTextField(text: String, setText: Function, maxLen: Number, errorIndex: Number){ //returns empty string if failed and sets 
    
    function setError(err: string, idx: Number){

      setErrors((errors) => errors.map( (_err,_idx) => idx === _idx ? err: _err));
    }

    let re = text.match(/(?<=\s*)\S(.*\S)?(?=\s*)/)

    if(re === null){
      setError(`Can't be empty!`, errorIndex);
      return false;
    }

    let newText = re[0];
    if(newText.length > maxLen){
      setError(`Can't be longer than ${maxLen} characters!`, errorIndex);
      return false;
    }

    setError('', errorIndex);
    setText(newText);

    return true;
  }

  return (
    <Dialog
      isOpen={isOpen}
      toClose={toClose}
      className="w-[400px] rounded-lg drop-shadow-xl bg-white border-2 border-gray-200"
    >
      <form
        onSubmit={e => e.preventDefault()} 
        className="flex flex-col p-6 w-full"
      >
        <div className="flex-row justify-center">
          <h2 className='text-3xl text-center font-bold text-gray-600 select-none'>Create a new game</h2>
        </div>

        <div className="p-2"></div>

        <span className='w-full text-sm font-extrabold text-gray-500 select-none'>NAME</span>
        <div className='p-1'></div>
        <TextInput
          className="bg-gray-100 w-full p-3 text-lg focus:border-emerald-300 drop-shadow-md"
          value={name}
          onChange={ e => setName(e.target.value) }
        ></TextInput>
        <span className="text-red-400 text-xs pt-2">{errors[0]}</span>

        <div className="p-2"></div>

        <span className='w-full text-sm font-extrabold text-gray-500 select-none'>TEAM 1</span>
        <div className='p-1'></div>
        <TextInput 
          className="bg-gray-100 w-full p-3 text-lg focus:border-emerald-300 drop-shadow-md"
          value={team0}
          onChange={ e => setTeam0(e.target.value) }
        ></TextInput>
        <span className="text-red-400 text-xs pt-2">{errors[1]}</span>

        <div className="p-2"></div>

        <span className='w-full text-sm font-extrabold text-gray-500 select-none'>TEAM 2</span>
        <div className='p-1'></div>
        <TextInput 
          className="bg-gray-100 w-full p-3 text-lg focus:border-emerald-300 drop-shadow-md"
          value={team1}
          onChange={ e => setTeam1(e.target.value) }
        ></TextInput>
        <span className="text-red-400 text-xs pt-2">{errors[2]}</span>

        <div className="p-4"></div>

        <Button 
          onClick={async () => {
            
            if(!(
              checkTextField(name, setName, 80, 0)
              && checkTextField(team0, setTeam0, 30, 1)
              && checkTextField(team1, setTeam1, 30, 2)
            )){
              return;
            }

            client.mutate({
              mutation: gql`
                mutation NewGame($name: String!, $team0: String!, $team1: String!) {
                  newGame(name: $name, team0: $team0, team1: $team1)
                }
              `,
              variables: {
                name,
                team0,
                team1
              }
            }).then(() => {
              toClose()
              setName('');
              setTeam0('');
              setTeam1('');
            }).catch(e => {console.error(e); router.push('/login')});
            
          }}
          className='w-full p-3 text-md border-2 border-emerald-200 bg-emerald-300 active:bg-emerald-400 drop-shadow-md'
        >{config.language.CREATE}</Button>
      </form>
    </Dialog>
  )
}

export { GameCreationDialog }