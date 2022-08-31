import { gql, useApolloClient } from '@apollo/client'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useContext, useState } from 'react'
import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { config } from '../../config'
import { setCookie } from '../../utils/cookie'
import { Auth, AuthContext } from '../_app'

const Login: NextPage = () => {

  const client = useApolloClient();

  const router = useRouter();

  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  const [auth, setAuth] = useContext(AuthContext);

  return (
    <div className='flex flex-col items-center justify-center h-screen'>
      <h2 className='text-3xl font-bold text-gray-600 drop-shadow select-none'>{config.language.GREETING}</h2>
      <div className='p-3'></div>
      <div className='border-2 border-gray-100 bg-white rounded-lg drop-shadow-xl'>
        <form
          onSubmit={e => e.preventDefault()}
          className='p-8 flex flex-col justify-center items-center h-full min-w-[400px] w-[500px]'>

            <span className='w-full text-sm font-extrabold text-gray-500 select-none'>{config.language.PASSWORD}</span>

            <div className='p-2'></div>

            <TextInput 
              value={password}
              onChange={ e => setPassword(e.target.value) }
              hidden
              className='bg-gray-100 w-full p-3 text-lg focus:border-emerald-300 drop-shadow-md'
            ></TextInput>
            {
              error !== '' && <div>
                <div className='p-2'></div>
                <span className='text-red-500'>{error}</span>
              </div>
            }
            
            <div className='p-4'></div>
            
            <Button 
              onClick={async () => {
                const res = await client.query({
                  query: gql`
                    query login($password: String!) {
                      login(password: $password)
                    }
                  `,
                  variables: {
                    password: password
                  }
                });
                if(res.data.login){
                  setAuth((auth: Auth) => ({...auth, password}) );
                  setCookie('password', password, 7);
                  router.push('/dashboard');
                }
                else {
                  setError(config.language.PASSWORD_INCORRECT);
                }
              }}
              className='w-full p-3 text-md border-2 border-emerald-200 bg-emerald-300 active:bg-emerald-400 drop-shadow-md'
            >LOGIN</Button>
            
        </form>
      </div>
    </div>
  )
}

export default Login
