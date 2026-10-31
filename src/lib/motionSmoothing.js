import { createRigTransform } from "./avatarRenderer.js";

const alpha = (cutoff, dt) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));

/** Adaptive low-pass filtering. Fast intentional motion gets a higher cutoff;
 * finger joints use a lighter filter than the torso. Forward/backward passes
 * reduce temporal lag. The recorded first and last poses stay exact.
 */
export function smoothLandmarks(frames, fps) {
  if (frames.length < 3) return frames.map(frame => frame.map(point => [...point]));
  const dt=1/fps;
  const pass=(input)=>{
    const output=[input[0].map(p=>[...p])];
    const velocity=Array.from({length:75},()=>[0,0,0]);
    for(let i=1;i<input.length;i++) {
      output.push(input[i].map((point,joint)=>point.map((value,axis)=>{
        if(axis===3) return value;
        if(point[3]<.2||input[i-1][joint][3]<.2) {velocity[joint][axis]=0;return value;}
        const derivative=(value-input[i-1][joint][axis])/dt;
        velocity[joint][axis]+=alpha(1,dt)*(derivative-velocity[joint][axis]);
        const cutoff=(joint>=33?8:3.5)+6*Math.abs(velocity[joint][axis]);
        const previous=output[i-1][joint][axis];
        return previous+alpha(cutoff,dt)*(value-previous);
      })));
    }
    return output;
  };
  const forward=pass(frames);
  const backward=pass([...forward].reverse()).reverse();
  backward[0]=frames[0].map(p=>[...p]);
  backward[backward.length-1]=frames.at(-1).map(p=>[...p]);
  return backward;
}

/** Convert every recorded signer to one stable avatar viewport before blending. */
export function prepareMotion(clip) {
  const transform=createRigTransform(clip.frames);
  const frames=clip.frames.map(frame=>frame.map(point=>{
    const [x,y]=transform(point);
    return [x/800,y/640,point[2],point[3]];
  }));
  return {...clip,frames:smoothLandmarks(frames,clip.fps)};
}

export const viewportTransform = ([x,y,,confidence]) => [x*800,y*640,confidence];

export function blendPoses(from,to,progress) {
  const t=Math.min(1,Math.max(0,progress));
  const eased=t*t*(3-2*t);
  return to.map((point,joint)=>point.map((value,axis)=>{
    if(axis===3) return Math.min(from[joint][3],value);
    // Do not animate a missing hand from the image origin.
    if(from[joint][3]<.2) return value;
    if(point[3]<.2) return from[joint][axis];
    return from[joint][axis]+(value-from[joint][axis])*eased;
  }));
}
