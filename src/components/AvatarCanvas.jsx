import { useEffect, useRef, useState } from "react";
import { createAvatarRenderer, neutralPose } from "../lib/avatarRenderer";
import { sampleFrame } from "../lib/animationStream";
import { blendPoses, prepareMotion, viewportTransform } from "../lib/motionSmoothing";

export default function AvatarCanvas({ clip, speed = 0.75, onComplete, onFailure }) {
  const canvasRef=useRef(null);
  const rendererRef=useRef(null);
  const [error,setError]=useState("");
  const lastPose=useRef(null);
  const speedRef=useRef(speed);
  speedRef.current=speed;
  const callbacks=useRef({onComplete,onFailure});
  callbacks.current={onComplete,onFailure};

  useEffect(()=>{
    const canvas=canvasRef.current;
    try { rendererRef.current=createAvatarRenderer(canvas); }
    catch(failure){setError(failure.message);callbacks.current.onFailure(failure.message);return undefined;}
    const lost=(event)=>{event.preventDefault();setError("The avatar display was interrupted. Reload to restore it.");callbacks.current.onFailure("Avatar display interrupted. Captions continue.");};
    canvas.addEventListener("webglcontextlost",lost);
    return ()=>{canvas.removeEventListener("webglcontextlost",lost);rendererRef.current?.dispose();rendererRef.current=null;};
  },[]);

  useEffect(()=>{
    const renderer=rendererRef.current;
    if(!renderer) return undefined;
    const idle=prepareMotion({frames:[neutralPose()],fps:25}).frames[0];
    const motion=clip?prepareMotion(clip):null;
    const first=motion?.frames[0]||idle;
    const from=lastPose.current||first;
    let frameId, previous=null, elapsed=0, transition=0, completed=false;
    const transitionMs=140;
    const duration=motion?motion.frames.length/motion.fps*1000:0;
    const draw=(now)=>{
      // Pause while hidden. Returning to the tab must not skip signs.
      if(!document.hidden) {
        const dt=previous===null?0:Math.min(now-previous,100);
        let pose;
        if(transition<transitionMs) {
          transition+=dt;
          pose=blendPoses(from,first,transition/transitionMs);
        } else {
          if(motion) elapsed+=dt*speedRef.current;
          pose=motion?sampleFrame(motion,Math.min(elapsed,Math.max(0,duration-1))):idle;
        }
        lastPose.current=pose;
        renderer.draw(pose,viewportTransform);
        if(motion&&elapsed>=duration&&!completed) {completed=true;callbacks.current.onComplete(clip.playbackId);return;}
      }
      previous=now;
      frameId=requestAnimationFrame(draw);
    };
    frameId=requestAnimationFrame(draw);
    const visibility=()=>{previous=null;};
    document.addEventListener("visibilitychange",visibility);
    return ()=>{cancelAnimationFrame(frameId);document.removeEventListener("visibilitychange",visibility);};
  },[clip]);

  return <div className="avatar-stage">
    <canvas ref={canvasRef} className="avatar-canvas" role="img" aria-label={clip?`Animated ASL sign: ${clip.gloss}`:"Sign avatar at rest"} />
    <span className="avatar-stage-label">{clip?clip.gloss.replaceAll("-"," "):"Ready to sign"}</span>
    {error&&<p className="avatar-display-error" role="alert">{error}</p>}
  </div>;
}
