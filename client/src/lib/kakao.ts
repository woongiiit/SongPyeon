import { INGREDIENT_META, type GameResult, type Ingredient } from "../types";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (settings: Record<string, unknown>) => void;
      };
    };
  }
}

export function initKakao(): boolean {
  const key = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
  if (!key || !window.Kakao) return false;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }
  return window.Kakao.isInitialized();
}

export function shareResult(result: GameResult, nickname: string) {
  const ready = initKakao();
  if (!ready || !window.Kakao) {
    alert("카카오톡 공유를 준비하지 못했습니다. JavaScript 키와 웹 도메인 등록을 확인해 주세요.");
    return;
  }

  const meta = INGREDIENT_META[result.ingredient as Ingredient];
  const url = window.location.origin;
  const timeSec = (result.timeMs / 1000).toFixed(1);

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: `${nickname}님의 ${meta.label} 송편 — ${result.total.toFixed(2)}점`,
      description: `정확도 ${result.accuracy.toFixed(2)} · 속도 ${result.speed.toFixed(2)} · ${timeSec}초`,
      imageUrl: `${url}/og-songpyeon.png`,
      link: {
        mobileWebUrl: url,
        webUrl: url,
      },
    },
    buttons: [
      {
        title: "나도 빚기",
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
    ],
  });
}
