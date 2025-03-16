import { UserProvider } from "./context/user.context"
import AppRoutes from "./routes/AppRoutes"


function App() {

  return (
    <>
      <UserProvider>
        <AppRoutes/>
      </UserProvider>
    </>
  )
}

export default App
