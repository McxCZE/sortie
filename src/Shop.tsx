import { useState } from "react";
import { buyBottle, buyLook, LOOKS, PRICES, won } from "./game";
import type { Save } from "./game";
import Dialog from "./Dialog";
import { CoinIcon, GameIcon } from "./ui/GameIcon";
export default function Shop({
  game,
  onChange,
  onClose,
  onHint,
}: {
  game: Save;
  onChange: (update: (g: Save) => Save) => void;
  onClose: () => void;
  onHint: () => void;
}) {
  const [tab, setTab] = useState<"tools" | "looks">("tools");
  const extras = game.capacities.slice(new Set(game.board.flat()).size + 2),
    finished = won(game.board, game.capacities);
  return (
    <Dialog title="Obchod" wide onClose={onClose}>
      <div className="shop-wallet">
        <CoinIcon />
        {game.coins.toLocaleString("cs-CZ")} mincí
      </div>
      <div className="shop-tabs">
        <button aria-pressed={tab === "tools"} onClick={() => setTab("tools")}>
          Pomůcky
        </button>
        <button aria-pressed={tab === "looks"} onClick={() => setTab("looks")}>
          Vzhledy
        </button>
      </div>
      {tab === "tools" ? (
        <>
          <p className="shop-note">
            Každá úroveň jde vyřešit bez nákupu. Zpět a restart jsou zdarma.
          </p>
          <div className="shop-card">
            <div className="shop-item-icon">
              <GameIcon name="hint" />
            </div>
            <div>
              <h3>Nápověda</h3>
              <p>
                Ověří další tah. Případný návrat nejdřív vysvětlí. Platíš až za
                zobrazení rady.
              </p>
            </div>
            <button
              className="shop-buy"
              disabled={finished || !!game.hint || game.coins < PRICES.hint}
              onClick={onHint}
            >
              {game.hint ? "Rada je zobrazená" : `Nápověda · ${PRICES.hint} ◈`}
            </button>
          </div>
          {(["small", "large"] as const).map((kind) => {
            const capacity = kind === "small" ? 1 : 4,
              owned = extras.includes(capacity);
            return (
              <div className="shop-card" key={kind}>
                <div
                  className={`shop-item-icon ${kind === "small" ? "mini-icon" : ""}`}
                >
                  <GameIcon name="bottle" />
                </div>
                <div>
                  <h3>
                    {kind === "small" ? "Malá lahvička" : "Prázdná lahvička"}
                  </h3>
                  <p>
                    {kind === "small"
                      ? "Místo pro 1 dílek. Na konci úrovně musí být prázdná."
                      : "Místo pro 4 dílky. Pomůže uvolnit prostor pro třídění."}
                  </p>
                </div>
                <button
                  className="shop-buy"
                  disabled={finished || owned || game.coins < PRICES[kind]}
                  onClick={() => onChange((g) => buyBottle(g, kind))}
                >
                  {owned
                    ? "Už máš"
                    : `Koupit ${kind === "small" ? "malou" : "prázdnou"} · ${PRICES[kind]} ◈`}
                </button>
              </div>
            );
          })}
          <p className="shop-note">
            Jedna od každé velikosti na úroveň. Lahvičky zůstanou i po restartu
            nebo zavření hry, do další úrovně se nepřenášejí.
          </p>
        </>
      ) : (
        <>
          <p className="shop-note">
            Vzhledy ti zůstanou napořád. Každou část můžeš přepínat zvlášť.
          </p>
          {LOOKS.map((item) => {
            const owned = game.owned.includes(item.id),
              active = game.equipment[item.category] === item.id;
            return (
              <div className={`shop-card look-${item.id}`} key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
                <button
                  className="shop-buy"
                  disabled={(!owned && game.coins < item.price) || active}
                  onClick={() => onChange((g) => buyLook(g, item.id))}
                >
                  {active
                    ? "Používá se"
                    : owned
                      ? "Použít"
                      : `Koupit · ${item.price} ◈`}
                </button>
                {active && (
                  <button
                    className="look-reset"
                    onClick={() =>
                      onChange((g) => ({
                        ...g,
                        equipment: {
                          ...g.equipment,
                          [item.category]: "default",
                        },
                      }))
                    }
                  >
                    Vrátit výchozí vzhled
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}
    </Dialog>
  );
}
