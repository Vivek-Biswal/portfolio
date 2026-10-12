import { useEffect, useState } from "react";
import "./styles/Loading.css";
import { useLoading } from "../context/LoadingProvider";

import Marquee from "react-fast-marquee";

const Loading = ({ percent }: { percent: number }) => {
  const { setIsLoading } = useLoading();
  const [loaded, setLoaded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [clicked, setClicked] = useState(false);

  const complete = percent >= 100;

  useEffect(() => {
    if (!complete) return;
    const loadedTimer = window.setTimeout(() => setLoaded(true), 600);
    const revealTimer = window.setTimeout(() => setIsLoaded(true), 1600);
    return () => {
      window.clearTimeout(loadedTimer);
      window.clearTimeout(revealTimer);
    };
  }, [complete]);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    setClicked(true);
    const exitTimer = window.setTimeout(() => {
      void import("./utils/initialFX").then((module) => {
        if (cancelled) return;
        try {
          module.initialFX();
        } finally {
          setIsLoading(false);
        }
      }).catch((error: unknown) => {
        if (cancelled) return;
        console.warn("Portfolio entrance effects were unavailable:", error);
        document.body.style.overflowY = "auto";
        document.querySelector("main")?.classList.add("main-active");
        setIsLoading(false);
      });
    }, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(exitTimer);
    };
  }, [isLoaded, setIsLoading]);

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const { currentTarget: target } = e;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty("--mouse-x", `${x}px`);
    target.style.setProperty("--mouse-y", `${y}px`);
  }

  return (
    <>
      <div className="loading-header">
        <a href="/3d/" className="loader-title" data-cursor="disable">
          Vivek.
        </a>
        <div className={`loaderGame ${clicked && "loader-out"}`}>
          <div className="loaderGame-container">
            <div className="loaderGame-in">
              {[...Array(27)].map((_, index) => (
                <div className="loaderGame-line" key={index}></div>
              ))}
            </div>
            <div className="loaderGame-ball"></div>
          </div>
        </div>
      </div>
      <div className="loading-screen">
        <div className="loading-marquee">
          <Marquee>
            <span> A Creative Developer</span> <span>A Creative Designer</span>
            <span> A Creative Developer</span> <span>A Creative Designer</span>
          </Marquee>
        </div>
        <div
          className={`loading-wrap ${clicked && "loading-clicked"}`}
          onMouseMove={(e) => handleMouseMove(e)}
        >
          <div className="loading-hover"></div>
          <div className={`loading-button ${loaded && "loading-complete"}`}>
            <div className="loading-container">
              <div className="loading-content">
                <div className="loading-content-in">
                  Loading <span>{percent}%</span>
                </div>
              </div>
              <div className="loading-box"></div>
            </div>
            <div className="loading-content2">
              <span>Welcome</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Loading;

export const setProgress = (setLoading: (value: number) => void) => {
  let percent = 0;
  let timer: number | undefined;
  let stopped = false;
  let completion: Promise<number> | undefined;
  let resolveCompletion: ((value: number) => void) | undefined;

  function stopTimer() {
    window.clearTimeout(timer);
    timer = undefined;
  }

  function settleCompletion() {
    resolveCompletion?.(percent);
    resolveCompletion = undefined;
  }

  function advance() {
    if (stopped || completion) return;
    const step = percent <= 50
      ? Math.round(Math.random() * 5)
      : Math.round(Math.random());
    percent = Math.min(percent + step, 91);
    setLoading(percent);
    if (percent < 91) {
      timer = window.setTimeout(advance, percent <= 50 ? 100 : 2000);
    }
  }

  function clear() {
    if (stopped) return;
    stopped = true;
    stopTimer();
    percent = 100;
    setLoading(percent);
    settleCompletion();
  }

  // Cancelling an unmounted scene must not complete another scene's loader.
  function dispose() {
    if (stopped) return;
    stopped = true;
    stopTimer();
    settleCompletion();
  }

  function loaded(): Promise<number> {
    if (stopped) return Promise.resolve(percent);
    if (completion) return completion;
    stopTimer();
    completion = new Promise<number>((resolve) => {
      resolveCompletion = resolve;
    });
    const finish = () => {
      if (stopped) return;
      percent = Math.min(percent + 1, 100);
      setLoading(percent);
      if (percent === 100) {
        stopped = true;
        stopTimer();
        settleCompletion();
      } else {
        timer = window.setTimeout(finish, 2);
      }
    };
    timer = window.setTimeout(finish, 2);
    return completion;
  }

  setLoading(percent);
  timer = window.setTimeout(advance, 100);
  return { loaded, get percent() { return percent; }, clear, dispose };
};
