import { useEffect, useState } from "react";
import { Swords } from "lucide-react";
import App from "./App";
import { PlayVsAI } from "./PlayVsAI";

function routeFromHash() {
  return window.location.hash === "#/play" ? "play" : "coach";
}

export default function Root() {
  const [route, setRoute] = useState<"coach" | "play">(routeFromHash);

  useEffect(() => {
    const sync = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function openPlay() {
    window.location.hash = "/play";
    setRoute("play");
  }

  function closePlay() {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    setRoute("coach");
  }

  if (route === "play") return <PlayVsAI onExit={closePlay} />;

  return (
    <>
      <App />
      <button className="global-play-launch" type="button" onClick={openPlay}>
        <Swords size={18} />
        <span>
          <small>CHƠI VÁN THẬT</small>
          Đấu Pikafish
        </span>
      </button>
    </>
  );
}
