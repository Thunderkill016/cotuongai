import { useEffect, useState } from "react";
import { CalendarClock, Swords } from "lucide-react";
import App from "./App";
import { PlayVsAI } from "./PlayVsAI";
import { TodayPractice } from "./TodayPractice";
import {
  duePracticeCount,
  GAME_PRACTICE_STORAGE_KEY,
  parsePracticeCards,
} from "./practiceMemory";
import "./play.css";
import "./today.css";

type Route = "coach" | "play" | "today";

function routeFromHash(): Route {
  if (window.location.hash === "#/play") return "play";
  if (window.location.hash === "#/today") return "today";
  return "coach";
}

function currentDueCount() {
  try {
    return duePracticeCount(
      parsePracticeCards(localStorage.getItem(GAME_PRACTICE_STORAGE_KEY)),
    );
  } catch {
    return 0;
  }
}

export default function Root() {
  const [route, setRoute] = useState<Route>(routeFromHash);

  useEffect(() => {
    const sync = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function open(route: Exclude<Route, "coach">) {
    window.location.hash = `/${route}`;
    setRoute(route);
  }

  function closeRoute() {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    setRoute("coach");
  }

  if (route === "play")
    return <PlayVsAI onExit={closeRoute} />;
  if (route === "today")
    return <TodayPractice onExit={closeRoute} onPlay={() => open("play")} />;

  const due = currentDueCount();
  return (
    <>
      <App />
      <button
        className="global-practice-launch"
        type="button"
        onClick={() => open("today")}
      >
        <CalendarClock size={18} />
        <span>
          <small>ÔN TỪ VÁN THẬT</small>
          Hôm nay luyện gì
        </span>
        {due > 0 && <b className="due-badge">{due}</b>}
      </button>
      <button
        className="global-play-launch"
        type="button"
        onClick={() => open("play")}
      >
        <Swords size={18} />
        <span>
          <small>CHƠI VÁN THẬT</small>
          Đấu Pikafish
        </span>
      </button>
    </>
  );
}
