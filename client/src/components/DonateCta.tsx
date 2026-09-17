const DONATE_URL = (import.meta.env.VITE_DONATE_URL as string | undefined)?.trim();

type Props = {
  compact?: boolean;
};

export function DonateCta({ compact = false }: Props) {
  function openDonate() {
    if (!DONATE_URL) {
      alert("후원 링크가 아직 연결되지 않았어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    window.open(DONATE_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={`donate-cta ${compact ? "compact" : ""}`}>
      {!compact && (
        <p className="donate-copy">
          이 한가위 손맛이 마음에 드셨다면, 개발자에게 송편 하나 어떠세요?
        </p>
      )}
      <button type="button" className="btn donate wide" onClick={openDonate}>
        개발자에게 송편 하나
      </button>
    </div>
  );
}
