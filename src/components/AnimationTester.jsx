import { useState } from "react";

export default function AnimationTester({ language, catalog, onTest, status }) {
  const [text,setText]=useState("");
  const [search,setSearch]=useState("");
  const key=language==="hi-IN"?"hi":"en";
  const examples=catalog?.examples||[];
  const vocabulary=(catalog?.vocabulary||[]).filter(word=>[word.gloss,...word.en,...word.hi].some(value=>value.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())));
  return <details className="transcript-tester" open>
    <summary>Try the live ASL avatar</summary>
    <p>Choose a supported example or combine vocabulary words. English and Hindi text use the same ASL motion library.</p>
    <form className="transcript-test-form" onSubmit={(event)=>{event.preventDefault();if(text.trim())onTest(text.trim());}}>
      <label htmlFor="animation-transcript">Transcript
        <input id="animation-transcript" value={text} onChange={(event)=>setText(event.target.value)} maxLength={1200}
          placeholder={key==="hi"?"मुझे पानी चाहिए":"I want water"} autoComplete="off" />
      </label>
      <button className="button primary" disabled={!text.trim()} type="submit">Animate sentence</button>
    </form>
    <div className="animation-examples">
      {examples.slice(0,4).map((example)=><button className="button secondary" key={example.en}
        onClick={()=>{setText(example[key]);onTest(example[key]);}}>{example[key]}</button>)}
    </div>
    <p className="match-status" role="status">{status||"Start the animation server to load the supported vocabulary."}</p>
    {!!catalog?.vocabulary?.length&&<details className="animation-vocabulary"><summary>Available ASL vocabulary ({catalog.vocabulary.length} signs)</summary>
      <label className="vocabulary-search">Find a word in English or Hindi
        <input value={search} onChange={event=>setSearch(event.target.value)} placeholder="water, mother, पानी…" type="search" />
      </label>
      <ul className="video-title-list">{vocabulary.map((word)=><li key={word.gloss}>
        <button onClick={()=>{setText(word[key][0]);onTest(word[key][0]);}}>{word[key][0]}</button>
      </li>)}</ul>
      {!vocabulary.length&&<p>No matching word in this library.</p>}
    </details>}
  </details>;
}
