interface TrackInfoProps {
  title: string;
  artist: string;
}

export function TrackInfo({ title, artist }: TrackInfoProps) {
  return (
    <div className="text-center">
      <h1
        className="text-xl font-medium tracking-wide"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h1>
      <p
        className="text-sm mt-1"
        style={{ color: "var(--text-secondary)" }}
      >
        {artist}
      </p>
    </div>
  );
}
