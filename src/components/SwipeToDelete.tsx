import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Swipe-left to reveal/trigger delete. Works with touch + mouse.
 * Threshold: -80px reveals; -160px commits delete on release.
 */
export function SwipeToDelete({
  onDelete,
  children,
  className,
}: {
  onDelete: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);

  const start = (x: number) => {
    startX.current = x;
    dragging.current = true;
  };
  const move = (x: number) => {
    if (!dragging.current || startX.current === null) return;
    const delta = Math.min(0, x - startX.current);
    setDx(Math.max(delta, -220));
  };
  const end = () => {
    dragging.current = false;
    startX.current = null;
    if (dx <= -160) {
      onDelete();
      setDx(0);
    } else if (dx <= -80) {
      setDx(-90);
    } else {
      setDx(0);
    }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete"
        className="absolute inset-y-0 right-0 flex w-[90px] items-center justify-center bg-destructive text-destructive-foreground"
      >
        <Trash2 className="h-5 w-5" />
      </button>
      <div
        className="relative touch-pan-y bg-card transition-transform"
        style={{ transform: `translateX(${dx}px)`, transitionDuration: dragging.current ? "0ms" : "200ms" }}
        onTouchStart={(e) => start(e.touches[0].clientX)}
        onTouchMove={(e) => move(e.touches[0].clientX)}
        onTouchEnd={end}
        onMouseDown={(e) => start(e.clientX)}
        onMouseMove={(e) => e.buttons === 1 && move(e.clientX)}
        onMouseUp={end}
        onMouseLeave={() => dragging.current && end()}
      >
        {children}
      </div>
    </div>
  );
}
