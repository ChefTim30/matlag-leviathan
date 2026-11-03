
import Viewer from './Viewer'
import Results from './Results'
import Admin from './Admin'

function App() {
  const path = window.location.pathname

  if (path === '/results') {
    return <Results />
  }

  if (path === '/admin') {
    return <Admin />
  }

  return <Viewer />
}

export default App
