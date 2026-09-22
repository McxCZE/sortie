import { findHint } from "./hints";
import type { Save } from "./game";
self.onmessage = (event: MessageEvent<Save>) => {
  try {
    self.postMessage(findHint(event.data));
  } catch {
    self.postMessage({ status: "unavailable" });
  }
};
