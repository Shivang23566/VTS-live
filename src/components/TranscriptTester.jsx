import { useState } from "react";

export default function TranscriptTester({ videos, onTest, status }) {
  const [text, setText] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (text.trim()) onTest(text.trim());
  };

  return (
    <details className="transcript-tester">
      <summary>Video library and text test ({videos.length} titles)</summary>
      <p>Use English to match these titles. Capitals and punctuation do not matter. Hindi speech currently produces captions only.</p>
      <form className="transcript-test-form" onSubmit={submit}>
        <label htmlFor="test-transcript">
          Test a transcript without a microphone
          <input
            id="test-transcript"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Good morning. Sit down."
            autoComplete="off"
          />
        </label>
        <button className="button primary" type="submit" disabled={!text.trim()}>Match and play</button>
      </form>
      <p className="match-status" role="status">{status || "Choose a title below to test the same parser used by live speech."}</p>
      <ul className="video-title-list">
        {videos.map((video) => (
          <li key={video.id}>
            <button
              type="button"
              onClick={() => { setText(video.phrase); onTest(video.phrase); }}
            >
              {video.phrase}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
