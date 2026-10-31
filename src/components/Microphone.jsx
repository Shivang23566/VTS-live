export default function Microphone({ isSupported, isRecording, onStart, onStop, error }) {
  return (
    <div className="microphone-control">
      <button className={isRecording ? "button danger" : "button primary"} onClick={isRecording ? onStop : onStart} disabled={!isSupported}>
        {isRecording ? "Stop lecture" : "Start lecture"}
      </button>
      <span className={isRecording ? "recording-status live" : "recording-status"}>
        {isRecording ? "Listening" : "Ready"}
      </span>
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
}
