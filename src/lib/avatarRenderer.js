/** A small WebGL 2D rig: torso, head, arm segments, palms, and finger bones.
 * Coordinates remain in the source image orientation; no mirrored sign playback.
 */
const SKIN = [0.72, 0.43, 0.28, 1];
const EDGE = [0.18, 0.15, 0.13, 1];
const SHIRT = [0.035, 0.40, 0.43, 1];
const LIGHT = [0.62, 0.93, 0.84, 1];
const HAIR = [0.14, 0.11, 0.10, 1];
const WHITE = [0.99, 0.98, 0.93, 1];
export const HAND_CHAINS = [[0,1,2,3,4], [0,5,6,7,8], [0,9,10,11,12], [0,13,14,15,16], [0,17,18,19,20]];

export function neutralPose() {
  const pose = Array.from({ length: 75 }, () => [0.5, 0.5, 0, 0]);
  const points = { 0:[.5,.22], 2:[.52,.2], 5:[.48,.2], 7:[.55,.23], 8:[.45,.23],
    9:[.515,.25],10:[.485,.25],11:[.62,.36],12:[.38,.36],13:[.68,.58],14:[.32,.58],
    15:[.62,.78],16:[.38,.78],23:[.6,.92],24:[.4,.92] };
  for (const [id, xy] of Object.entries(points)) pose[id] = [...xy, 0, 1];
  // An explicitly idle relaxed pose, never used as a substitute for missing sign data.
  const relaxed=[[0,0],[-.018,.012],[-.032,.026],[-.04,.043],[-.039,.055],
    [-.018,.045],[-.02,.07],[-.018,.09],[-.014,.099],
    [0,.048],[0,.078],[.003,.099],[.007,.106],
    [.017,.045],[.019,.073],[.022,.091],[.027,.098],
    [.032,.038],[.036,.061],[.039,.076],[.043,.082]];
  for (const [wrist,offset,side] of [[15,33,1],[16,54,-1]]) {
    relaxed.forEach(([x,y],i)=>{pose[offset+i]=[pose[wrist][0]+x*side,pose[wrist][1]+y,0,1];});
  }
  return pose;
}

export function createRigTransform(frames) {
  const base = frames.find((frame) => frame[11][3] > .2 && frame[12][3] > .2) || neutralPose();
  const cx = (base[11][0] + base[12][0]) * 320;
  const cy = (base[11][1] + base[12][1]) * 240;
  const width = Math.hypot((base[11][0]-base[12][0])*640, (base[11][1]-base[12][1])*480);
  let scale = Math.min(3, 170 / Math.max(50, width));
  // Fit the entire clip, rather than changing scale with each hand movement.
  const ids = [0,7,8,11,12,13,14,15,16,23,24,...Array.from({length:42},(_,i)=>33+i)];
  for (const frame of frames) for (const id of ids) {
    const p = frame[id];
    if (p[3] < .2) continue;
    const dx=p[0]*640-cx, dy=p[1]*480-cy;
    if (dx) scale=Math.min(scale, 350/Math.abs(dx));
    if (dy < 0) scale=Math.min(scale, 175/Math.abs(dy));
    if (dy > 0) scale=Math.min(scale, 350/dy);
  }
  return (p) => [(p[0]*640-cx)*scale+400, (p[1]*480-cy)*scale+230, p[3]];
}

export function avatarGeometry(frame, transform) {
  const vertices = [];
  const points = frame.map(transform);
  const vertex = (p,c) => vertices.push(p[0],p[1],...c);
  const triangle = (a,b,c,color) => { vertex(a,color); vertex(b,color); vertex(c,color); };
  const polygon = (ps,color) => { for(let i=1;i<ps.length-1;i++) triangle(ps[0],ps[i],ps[i+1],color); };
  const ellipse = (p,rx,ry,color) => {
    for(let i=0;i<24;i++) {
      const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
      triangle(p,[p[0]+Math.cos(a)*rx,p[1]+Math.sin(a)*ry],[p[0]+Math.cos(b)*rx,p[1]+Math.sin(b)*ry],color);
    }
  };
  const bone = (a,b,width,color) => {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
    const dx=-(b[1]-a[1])/length*width/2,dy=(b[0]-a[0])/length*width/2;
    polygon([[a[0]+dx,a[1]+dy],[b[0]+dx,b[1]+dy],[b[0]-dx,b[1]-dy],[a[0]-dx,a[1]-dy]],color);
    ellipse(a,width/2,width/2,color); ellipse(b,width/2,width/2,color);
  };
  const left=points[11],right=points[12];
  const shoulderWidth=Math.hypot(left[0]-right[0],left[1]-right[1]);
  const unit=Math.max(.55,shoulderWidth/170);
  const neck=[(left[0]+right[0])/2,(left[1]+right[1])/2-25*unit];
  const nose=points[0];
  const head=[nose[0],nose[1]-10*unit];
  ellipse([head[0],head[1]-7*unit],47*unit,60*unit,HAIR);
  bone(head,neck,28*unit,SKIN);
  const hips=[points[23],points[24]];
  polygon([left,right,hips[1],hips[0]],EDGE);
  polygon([[left[0]-3,left[1]+3],[right[0]+3,right[1]+3],hips[1],hips[0]],SHIRT);
  polygon([left,neck,right,[neck[0],neck[1]+65*unit]],LIGHT);
  bone([neck[0],neck[1]+65*unit],[neck[0],Math.max(hips[0][1],hips[1][1])],3*unit,LIGHT);
  ellipse(head,36*unit,47*unit,SKIN);
  ellipse([head[0]-18*unit,head[1]-35*unit],28*unit,16*unit,HAIR);
  ellipse([head[0]+20*unit,head[1]-36*unit],26*unit,17*unit,HAIR);
  for(const side of [-1,1]) {
    const eye=[head[0]+side*13*unit,head[1]-3*unit];
    ellipse(eye,6*unit,3.8*unit,WHITE); ellipse(eye,2.7*unit,3.3*unit,EDGE);
    bone([eye[0]-5*unit,eye[1]-9*unit],[eye[0]+5*unit,eye[1]-9*unit],2*unit,HAIR);
  }
  bone([head[0]-8*unit,head[1]+23*unit],[head[0]+8*unit,head[1]+23*unit],2*unit,EDGE);
  // Draw arms in depth order so the nearer hand can cross the torso naturally.
  const sides=[{s:11,e:13,w:15,h:33},{s:12,e:14,w:16,h:54}].sort((a,b)=>frame[b.w][2]-frame[a.w][2]);
  for(const side of sides) {
    const a=points[side.s],b=points[side.e],w=points[side.w];
    if(a[2]<.15||b[2]<.15||w[2]<.15) continue;
    bone(a,b,28*unit,EDGE); bone(a,b,25*unit,SHIRT);
    bone(b,w,20*unit,EDGE); bone(b,w,17*unit,SKIN);
    const hand=points.slice(side.h,side.h+21);
    if(hand[0][2]<.2) { ellipse(w,9*unit,9*unit,SKIN); continue; }
    bone(w,hand[0],16*unit,SKIN);
    const palm=[0,1,5,9,13,17].map((id)=>hand[id]);
    if(palm.every(p=>p[2]>=.2)) polygon(palm,SKIN);
    for(const chain of HAND_CHAINS) for(let i=1;i<chain.length;i++) {
      const start=hand[chain[i-1]],end=hand[chain[i]];
      if(start[2]<.2||end[2]<.2) continue;
      bone(start,end,5.2*unit,EDGE); bone(start,end,3.5*unit,SKIN);
    }
  }
  return new Float32Array(vertices);
}

export function createAvatarRenderer(canvas) {
  const gl=canvas.getContext("webgl",{alpha:true,antialias:true});
  if(!gl) throw new Error("WebGL is unavailable. Captions remain available.");
  const shader=(type,source)=>{
    const value=gl.createShader(type); gl.shaderSource(value,source); gl.compileShader(value);
    if(!gl.getShaderParameter(value,gl.COMPILE_STATUS)) { gl.deleteShader(value); throw new Error("Could not initialize the avatar."); }
    return value;
  };
  const vs=shader(gl.VERTEX_SHADER,"attribute vec2 a_position; attribute vec4 a_color; varying vec4 v_color; void main(){gl_Position=vec4(a_position.x/400.0-1.0,1.0-a_position.y/320.0,0,1);v_color=a_color;}");
  const fs=shader(gl.FRAGMENT_SHADER,"precision mediump float; varying vec4 v_color; void main(){gl_FragColor=v_color;}");
  const program=gl.createProgram(); gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) { gl.deleteShader(vs);gl.deleteShader(fs);gl.deleteProgram(program);throw new Error("Could not initialize the avatar."); }
  const buffer=gl.createBuffer();gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  const position=gl.getAttribLocation(program,"a_position"),color=gl.getAttribLocation(program,"a_color");
  gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,24,0);
  gl.enableVertexAttribArray(color);gl.vertexAttribPointer(color,4,gl.FLOAT,false,24,8);
  return {
    draw(frame,transform) {
      const ratio=Math.min(window.devicePixelRatio||1,2);
      const width=Math.max(1,Math.round(canvas.clientWidth*ratio)),height=Math.max(1,Math.round(canvas.clientHeight*ratio));
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      const data=avatarGeometry(frame,transform);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,data.length/6);
    },
    dispose(){gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);}
  };
}
