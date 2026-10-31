import test from "node:test";
import assert from "node:assert/strict";
import { AnimationAssembler, LANDMARK_SCHEMA, animationSocketUrl, sampleFrame } from "../src/lib/animationStream.js";
import { avatarGeometry, createRigTransform, neutralPose } from "../src/lib/avatarRenderer.js";
import { blendPoses, prepareMotion, smoothLandmarks } from "../src/lib/motionSmoothing.js";

const frame = (x) => Array.from({length:75},()=>[x,.4,0,1]);
const message = (type, extra={}) => ({type,version:1,request_id:"one",clip_index:0,...extra});
function started() {
  const parser=new AnimationAssembler(); parser.begin("one");
  parser.accept(message("translation",{sign_language:"asl",glosses:["WATER"],clip_count:1}));
  parser.accept(message("clip_start",{id:"water",gloss:"WATER",schema:LANDMARK_SCHEMA,frame_count:2,fps:25}));
  return parser;
}

test("only complete ordered clips are released for playback",()=>{
  const parser=started();
  assert.equal(parser.accept(message("frames",{offset:0,frames:[frame(.2)]})),null);
  parser.accept(message("frames",{offset:1,frames:[frame(.4)]}));
  const result=parser.accept(message("clip_end"));
  assert.equal(result.clip.frames.length,2);
  assert.equal(result.clip.playbackId,"one:0");
  assert.equal(parser.accept(message("complete")).type,"complete");
  assert.equal(parser.requests.size,0);
});
test("out-of-order chunks, incomplete clips and nonfinite data are rejected",()=>{
  assert.throws(()=>started().accept(message("frames",{offset:1,frames:[frame(.2)]})),/order/);
  assert.throws(()=>started().accept(message("clip_end")),/Incomplete/);
  assert.throws(()=>started().accept(message("complete")),/Incomplete/);
  assert.throws(()=>started().accept(message("frames",{offset:0,frames:[frame(NaN)]})),/frames/);
});
test("cancelled requests and previous sessions cannot replay stale frames",()=>{
  const parser=started();parser.clear();parser.begin("two");
  assert.equal(parser.accept(message("frames",{offset:0,frames:[frame(.2)]})),null);
  assert.equal(parser.requests.size,1);
});
test("ASL target and finite request limits are enforced",()=>{
  const parser=new AnimationAssembler();parser.begin("one");
  assert.throws(()=>parser.accept(message("translation",{sign_language:"pk-sl",glosses:["WATER"],clip_count:1})),/ASL/);
  for(let i=0;i<7;i++) parser.begin(String(i));
  assert.throws(()=>parser.begin("overflow"),/full/);
});
test("secure pages use secure websocket transport",()=>{
  assert.equal(animationSocketUrl({href:"https://school.example/class"}),"wss://school.example/ws/animation");
  assert.equal(animationSocketUrl({href:"http://localhost:5173/"}),"ws://localhost:5173/ws/animation");
});
test("sampling respects clip frame rate and does not interpolate past its end",()=>{
  const clip={fps:25,frames:[frame(.2),frame(.4)]};
  assert.ok(Math.abs(sampleFrame(clip,20)[0][0]-.3)<1e-10);
  assert.equal(sampleFrame(clip,900)[0][0],.4);
});
test("avatar rig produces finite WebGL geometry from landmarks",()=>{
  const pose=neutralPose();const transform=createRigTransform([pose]);
  const vertices=avatarGeometry(pose,transform);
  assert.ok(vertices.length>1000);
  assert.equal(vertices.length%18,0);
  assert.ok([...vertices].every(Number.isFinite));
});

test("adaptive smoothing reduces stationary jitter without changing endpoints or confidence",()=>{
  const frames=Array.from({length:30},(_,i)=>frame(.5+(i%2?.006:-.006)));
  const filtered=smoothLandmarks(frames,25);
  assert.deepEqual(filtered[0],frames[0]);assert.deepEqual(filtered.at(-1),frames.at(-1));
  const variation=(data)=>data.slice(4,-4).reduce((sum,f,i,all)=>i?sum+Math.abs(f[0][0]-all[i-1][0][0]):sum,0);
  assert.ok(variation(filtered)<variation(frames)*.7);
  assert.ok(filtered.every(f=>f.every(p=>p[3]===1)));
});
test("motion filtering does not fabricate missing hands or mutate source data",()=>{
  const frames=Array.from({length:6},()=>neutralPose().map((point,i)=>i>=33?[0,0,0,0]:point));
  const before=JSON.stringify(frames);
  const output=prepareMotion({frames,fps:25});
  assert.equal(JSON.stringify(frames),before);
  assert.ok(output.frames.every(f=>f.slice(33).every(p=>p[3]===0)));
  assert.ok(output.frames.flat(2).every(Number.isFinite));
});
test("clip transitions have exact endpoints and a smooth midpoint",()=>{
  const a=frame(.2),b=frame(.6);
  assert.deepEqual(blendPoses(a,b,0),a);
  assert.ok(Math.abs(blendPoses(a,b,1)[0][0]-.6)<1e-10);
  assert.ok(Math.abs(blendPoses(a,b,.5)[0][0]-.4)<1e-10);
});
