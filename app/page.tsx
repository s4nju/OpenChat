import Chat from "./components/chat/chat"
import LayoutApp from "./components/layout/layout-app"

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <LayoutApp>
      <Chat />
    </LayoutApp>
  )
}
