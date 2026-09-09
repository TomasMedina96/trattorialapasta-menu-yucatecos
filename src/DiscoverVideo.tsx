const videoUrl = "https://www.facebook.com/reel/1736208514354143/";
const embedUrl = `https://www.facebook.com/plugins/video.php?height=476&href=${encodeURIComponent(videoUrl)}&show_text=false&width=267&t=0`;

export function DiscoverVideo({ active, onNext }: { active: boolean; onNext: () => void }) {
  return (
    <article className="discover-video" aria-label="Video de Trattoria La Pasta" aria-hidden={!active} inert={!active}>
      <div className="discover-video-player">
        {active && (
          <iframe src={embedUrl} title="Video de Trattoria La Pasta en Facebook"
            width="267" height="476" scrolling="no" allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; web-share" />
        )}
      </div>
      <div className="discover-video-actions">
        <a href={videoUrl} target="_blank" rel="noreferrer">Ver en Facebook</a>
        <button type="button" onClick={onNext}>Ver platillos ↓</button>
      </div>
    </article>
  );
}
