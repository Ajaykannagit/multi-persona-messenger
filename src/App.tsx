import { useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Messenger } from './components/Messenger';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return user ? <Messenger /> : <Auth />;
}

export default App;
