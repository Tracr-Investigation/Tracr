import { useState } from 'react';
import { Login } from './components/login/Login.tsx';
import { Register } from './components/register/Register.tsx';

function App() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <>
      {showRegister ? (
        <Register onLogin={() => setShowRegister(false)} />
      ) : (
        <Login onRegister={() => setShowRegister(true)} />
      )}
    </>
  );
}

export default App;