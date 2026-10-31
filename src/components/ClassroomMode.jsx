export default function ClassroomMode({ children }) {
  const enterFullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  };

  return (
    <main className="classroom-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ShikshaSign Live</p>
          <h1>Accessible classroom</h1>
        </div>
        <button className="button secondary" onClick={enterFullscreen}>Classroom mode</button>
      </header>
      {children}
    </main>
  );
}
