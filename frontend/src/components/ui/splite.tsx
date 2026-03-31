import { Suspense, lazy } from "react";
import type { Application } from "@splinetool/runtime";
import { cn } from "@/lib/utils";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  scene: string;
  className?: string;
  onLoad?: (app: Application) => void;
}

export function SplineScene({ scene, className, onLoad }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-white/30 animate-spin" />
        </div>
      }
    >
      <Spline scene={scene} className={cn("w-full h-full", className)} onLoad={onLoad} />
    </Suspense>
  );
}
