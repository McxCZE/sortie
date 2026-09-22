import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  complete,
  pour,
  restore,
  won,
  commitMove,
  restartLevel,
  nextLevel,
  DIFFICULTIES,
  PRICES,
} from "./game";
import type { Save, Move } from "./game";
import type { HintResult } from "./hints";
import Shop from "./Shop";
import Dialog from "./Dialog";
import "./App.css";
import Board3D from "./graphics/Board3D";
import type { PourAnimation } from "./graphics/Board3D";
import type { Board } from "./game";

export default function App() {
  const [game, setGame] = useState(restore);
  const [selected, select] = useState<number | null>(null);
  const [message, setMessage] = useState("Trocha soustředění. Trocha kouzel.");
  const [restart, setRestart] = useState(false);
  const [shop, setShop] = useState(false);
  const [hintDialog, setHintDialog] = useState(false);
  const [hintResult, setHintResult] = useState<HintResult | null>(null);
  const hintMove = game.hint;
  const worker = useRef<Worker | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintSnapshot = useRef<Save | null>(null);
  const [animation, animate] = useState<PourAnimation | null>(null);
  const [invalid, setInvalid] = useState<number | null>(null);
  const pending = useRef<{
    id: number;
    board: Board;
    before: Board;
    move: Move;
  } | null>(null);
  const sequence = useRef(0);
  const audio = useRef<AudioContext | null>(null);
  const busy = useRef(false);
  const finished = won(game.board, game.capacities);
  const sorted = game.board.filter(complete).length;
  useLayoutEffect(() => {
    try {
      localStorage.setItem("sortie-save-v1", JSON.stringify(game));
    } catch {
      /* Continue without persistence. */
    }
  }, [game]);
  useEffect(
    () => () => {
      void audio.current?.close();
      worker.current?.terminate();
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );
  function sound() {
    if (!game.sound) return;
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
      const osc = audio.current.createOscillator(),
        gain = audio.current.createGain(),
        now = audio.current.currentTime;
      osc.connect(gain);
      gain.connect(audio.current.destination);
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.18);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start();
      osc.stop(now + 0.3);
    } catch {
      /* Sound is optional. */
    }
  }
  function tap(index: number) {
    if (busy.current || finished) return;
    if (selected === index) {
      setInvalid(null);
      select(null);
      return;
    }
    if (selected === null) {
      if (game.board[index].length) {
        select(index);
        setInvalid(null);
        setMessage("Teď vyber lahvičku, do které chceš přelít.");
      }
      return;
    }
    const next = pour(game.board, selected, index, game.capacities);
    if (!next) {
      setInvalid(index);
      setMessage("Přelévej na stejnou barvu nebo do prázdné lahvičky.");
      if (game.board[index].length) select(index);
      return;
    }
    const id = ++sequence.current;
    pending.current = {
      id,
      board: next,
      before: game.board,
      move: { from: selected, to: index },
    };
    busy.current = true;
    sound();
    const motion = {
      id,
      from: selected,
      to: index,
      color: game.board[selected].at(-1)!,
      amount: next[index].length - game.board[index].length,
    };
    select(null);
    setInvalid(null);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      finish(id);
    else animate(motion);
  }
  const finish = useCallback((id: number) => {
    const move = pending.current;
    if (!move || move.id !== id) return;
    pending.current = null;
    setGame((g) => commitMove(g, move.move));
    animate(null);
    busy.current = false;
    setMessage(
      won(move.board)
        ? "Každá barva už má své místo."
        : "Krásně. Pokračuj v přelévání.",
    );
  }, []);

  function reset() {
    setGame(restartLevel);
    select(null);
    setRestart(false);
    setInvalid(null);
    setMessage("Znovu od začátku. To zvládneš.");
  }
  function closeHint() {
    worker.current?.terminate();
    worker.current = null;
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHintDialog(false);
    setHintResult(null);
  }
  function requestHint() {
    if (game.coins < PRICES.hint || finished || busy.current || game.hint)
      return;
    setShop(false);
    setHintDialog(true);
    setHintResult(null);
    hintSnapshot.current = game;
    worker.current?.terminate();
    const fallback = () => {
      worker.current?.terminate();
      worker.current = null;
      setHintResult({ status: "unavailable" });
    };
    try {
      const task = new Worker(new URL("./hints.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current = task;
      task.onmessage = (event: MessageEvent<HintResult>) => {
        if (hintTimer.current) clearTimeout(hintTimer.current);
        setHintResult(event.data);
        task.terminate();
        worker.current = null;
      };
      task.onerror = fallback;
      task.postMessage(game);
      hintTimer.current = setTimeout(fallback, 15000);
    } catch {
      fallback();
    }
  }
  function useHint() {
    if (
      hintResult?.status !== "ready" ||
      hintSnapshot.current !== game ||
      game.coins < PRICES.hint
    )
      return;
    const result = hintResult;
    setGame((g) =>
      g !== hintSnapshot.current
        ? g
        : {
            ...g,
            coins: g.coins - PRICES.hint,
            board: result.board,
            history: g.history.slice(0, result.historyLength),
            solution: result.path,
            hint: result.path[0],
          },
    );
    select(null);
    setInvalid(null);
    setMessage(
      `Přelij lahvičku ${result.path[0].from + 1} do lahvičky ${result.path[0].to + 1}.`,
    );
    closeHint();
  }
  function changeFromShop(update: (g: Save) => Save) {
    setGame(update);
    select(null);
    setInvalid(null);
  }
  return (
    <main className="app" data-background={game.equipment.background}>
      <section className="game-panel" aria-label="Hra na třídění barev">
        <div className="game-top">
          <div className="level-info">
            <h1>Úroveň {String(game.level).padStart(2, "0")}</h1>
            <span className={`difficulty-tag ${game.difficulty}`}>
              {DIFFICULTIES[game.difficulty].name} · {game.reward} ◈
            </span>
          </div>
          <div className="game-hud-right">
            <div
              className="coin-balance"
              aria-label={`Mince: ${game.coins}`}
              title="Mince"
            >
              <span className="coin-symbol" aria-hidden="true">
                ◈
              </span>
              <strong>
                {new Intl.NumberFormat("cs-CZ", {
                  notation: game.coins >= 10000 ? "compact" : "standard",
                  maximumFractionDigits: 1,
                }).format(game.coins)}
              </strong>
            </div>
            <div className="moves">
              <strong>{game.history.length}</strong>
              <span>TAHY</span>
            </div>
            <button
              className="icon-button"
              onClick={() => setGame((g) => ({ ...g, sound: !g.sound }))}
              aria-label={game.sound ? "Vypnout zvuk" : "Zapnout zvuk"}
              aria-pressed={game.sound}
            >
              {game.sound ? "♫" : "♪"}
              <span className={!game.sound ? "mute-mark" : ""} />
            </button>
          </div>
        </div>
        <div className="progress-line">
          <span
            style={{
              width: `${(sorted / new Set(game.board.flat()).size) * 100}%`,
            }}
          />
        </div>
        <Board3D
          board={game.board}
          capacities={game.capacities}
          equipment={game.equipment}
          hint={hintMove}
          selected={selected}
          invalid={invalid}
          animation={animation}
          finished={finished}
          onPick={tap}
          onComplete={finish}
        />
        <div
          className={`status ${invalid !== null || hintMove ? "status-error" : ""}`}
          role="status"
        >
          {finished ? "✦ " : "✧ "}
          {hintMove && invalid === null
            ? `Přelij lahvičku ${hintMove.from + 1} do lahvičky ${hintMove.to + 1}.`
            : message}
        </div>
        <div className="controls">
          <button
            disabled={!game.history.length || !!animation}
            onClick={() => {
              setGame((g) => ({
                ...g,
                board: g.history.at(-1)!,
                history: g.history.slice(0, -1),
                solution: null,
                hint: null,
              }));
              select(null);
              setMessage("Krok zpět, nová možnost.");
            }}
          >
            <span>↶</span> Zpět
          </button>
          <div className="control-divider" />
          <button disabled={!!animation} onClick={() => setRestart(true)}>
            <span>↻</span> Znovu
          </button>
          <div className="control-divider" />
          <button disabled={!!animation} onClick={() => setShop(true)}>
            <span>◈</span> Obchod
          </button>
        </div>
        {finished && (
          <div className="win">
            <span>✦ KRÁSNĚ ROZTŘÍDĚNO ✦</span>
            <h3>Kouzlo se povedlo.</h3>
            <p>
              Úroveň {game.level} dokončena. Počet tahů: {game.history.length}.
            </p>
            <div className="win-reward">
              <span className="coin-symbol" aria-hidden="true">
                ◈
              </span>
              <strong>Odměna za úroveň: {game.reward} mincí</strong>
            </div>
            <button
              className="primary"
              onClick={() => {
                setGame(nextLevel);
                select(null);
                setMessage("Nové barvy. Nová hádanka.");
              }}
            >
              Další úroveň <span>→</span>
            </button>
          </div>
        )}
      </section>
      {shop && (
        <Shop
          game={game}
          onChange={changeFromShop}
          onClose={() => setShop(false)}
          onHint={requestHint}
        />
      )}
      {hintDialog && (
        <Dialog title="Nápověda" onClose={closeHint}>
          {!hintResult ? (
            <p role="status">Hledám ověřenou cestu k řešení…</p>
          ) : hintResult.status === "unavailable" ? (
            <p>
              Teď se nepodařilo ověřit řešení. Žádné mince se nestrhly. Můžeš
              použít Zpět nebo Restart.
            </p>
          ) : (
            <>
              <p>
                {hintResult.rewind || hintResult.reset
                  ? hintResult.reason === "dead-end"
                    ? "Tato pozice už nemá řešení."
                    : "Z této pozice se nepodařilo rychle ověřit řešení."
                  : "Další tah je ověřený a vede k řešení."}
              </p>
              {(hintResult.rewind > 0 || hintResult.reset) && (
                <p>
                  {hintResult.reset
                    ? "Vrátíme úroveň do výchozího rozložení a ukážeme další tah."
                    : `Vrátíme se do ověřeného dřívějšího stavu, o ${hintResult.rewind} ${hintResult.rewind === 1 ? "tah" : hintResult.rewind < 5 ? "tahy" : "tahů"} zpět, a ukážeme další tah.`}{" "}
                  Koupené lahvičky zůstanou.
                </p>
              )}
              <button className="primary" onClick={useHint}>
                {hintResult.rewind || hintResult.reset
                  ? "Vrátit a poradit"
                  : "Ukázat tah"}{" "}
                · {PRICES.hint} ◈
              </button>
              <button className="text-button" onClick={closeHint}>
                Zrušit bez placení
              </button>
            </>
          )}
        </Dialog>
      )}
      {restart && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setRestart(false);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Začít úroveň znovu"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setRestart(false);
              }
              if (e.key === "Tab") {
                const buttons =
                  e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
                const first = buttons[0],
                  last = buttons[buttons.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                }
                if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <span className="modal-star">✧</span>
            <h2>Znovu od začátku?</h2>
            <p>
              Tahle úroveň se vrátí do výchozího stavu a počet tahů se vynuluje.
            </p>
            <button autoFocus className="primary" onClick={reset}>
              Začít úroveň znovu
            </button>
            <button className="text-button" onClick={() => setRestart(false)}>
              Pokračovat ve hře
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
