import { motion } from "motion/react";

interface AlbumArtProps {
  imageUrl: string | null;
  active: boolean;
}

export function AlbumArt({ imageUrl, active }: AlbumArtProps) {
  return (
    <div className="relative w-64 h-64 mx-auto">
      {active && (
        <motion.div
          className="absolute -inset-3 rounded-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            filter: "blur(20px)",
          }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div
        className="relative w-full h-full rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Album art"
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
