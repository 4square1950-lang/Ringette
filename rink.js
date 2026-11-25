import * as THREE from '/vendor/three.module.js';
import {RINK} from './engine.js';
import {buildCrowd} from './crowd.js';
import {worldLand} from './world-land.js';
import {limits,rooms,roomWalls,furniture,stations,blocksPoint} from './campus.js';
const material=(color,roughness=.72)=>new THREE.MeshStandardMaterial({color,roughness});
const boxShape=new THREE.BoxGeometry(1,1,1);
const capsule=new THREE.CapsuleGeometry(.5,1,3,8);
const yAxis=new THREE.Vector3(0,1,0);
const dimensions = {white:0xeef5f7,blue:0x2c64b6,red:0x9d3946};
function mesh(parent,shape,mat,pos,scale){
  const part=new THREE.Mesh(shape,mat);
  part.position.set(...pos);part.scale.set(...scale);
  parent.add(part);
  return part;
}
const block=(parent,mat,x,y,z,w,h,d)=>mesh(parent,boxShape,mat,[x,y,z],[w,h,d]);
function tube(parent,mat,r,a,b){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
  const delta=end.clone().sub(start);
  const part=mesh(parent,capsule,mat,start.lerp(end,.5).toArray(),[r,delta.length()*.77,r]);
  part.quaternion.setFromUnitVectors(yAxis,delta.normalize());
  return part;
}
function paintIce(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=460;
  const g=canvas.getContext('2d'),sx=canvas.width/58,sz=canvas.height/26;
  const point=(x,z)=>[(x+29)*sx,(z+13)*sz];
  const edge=g.createLinearGradient(0,0,0,460);
  edge.addColorStop(0,'#bed2da');edge.addColorStop(.5,'#eef6f8');edge.addColorStop(1,'#cadce3');
  g.fillStyle=edge;g.fillRect(0,0,1024,460);
  let seed=14;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  for(let i=0;i<1900;i++){
    const x=rand()*1024,z=rand()*460,len=2+rand()*27;
    g.strokeStyle=i%4===0?'#9cade018':'#6e8b9c12';
    g.beginPath();g.moveTo(x,z);g.quadraticCurveTo(x+.43*len,z+2,x+len,z+rand()*6-3);g.stroke();
  }
  for(const [x,width,color] of [[0,.20,'#99444b'],[-9,.27,'#2a62ae'],[9,.27,'#2a62ae'],[-18,.14,'#ac575d'],[18,.14,'#ac575d'],[-26,.15,'#a8414e'],[26,.15,'#a8414e']]){
    const [px]=point(x-width/2,0);g.fillStyle=color;g.fillRect(px,0,width*sx,460);
  }
  function circle(x,z,r,color,filled=false){
    g.beginPath();g.ellipse(...point(x,z),r*sx,r*sz,0,0,2*Math.PI);
    if(filled){g.fillStyle=color;g.fill();}else{g.lineWidth=2.4;g.strokeStyle=color;g.stroke();}
  }
  for(const x of [-19.5,19.5]) for(const z of [-6.7,6.7]){
    circle(x,z,3.0,'#ae5d64');circle(x,z,.13,'#ae5d64',true);
  }
  circle(0,0,3.65,'#567fa8');circle(0,0,1.48,'#1b557311',true);
  g.textAlign='center';g.textBaseline='middle';g.font='bold 20px system-ui';
  g.fillStyle='#305d79';g.fillText('RINGETTE',512,230);
  for(const x of [-26,26]){circle(x,0,RINK.crease,'#69b3d677',true);circle(x,0,RINK.crease,'#6c8ba7');}
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  return tex;
}
function buildArena(world) {
  const ice=new THREE.Mesh(new THREE.PlaneGeometry(58,26),new THREE.MeshStandardMaterial({map:paintIce(),roughness:.41,metalness:.08}));
  ice.rotation.x=-Math.PI/2;
  world.add(ice);
  const board=material(dimensions.white),gasket=material(0xd9c780),top=material(0x4f6271),step=material(0x223444);
  const entryGate=new THREE.Group();world.add(entryGate);
  for(const side of [-1,1]){
    block(world,board,0,.56,side*13.13,58.4,1.12,.28);
    block(world,top,0,1.13,side*13.16,58.5,.09,.32);
    block(world,gasket,0,.087,side*12.975,58,.11,.027);
    const endBoard=(parent,z,span)=>{
      block(parent,board,side*29.12,.56,z,.28,1.12,span);
      block(parent,top,side*29.12,1.13,z,.31,.09,span);
      block(parent,gasket,side*28.985,.087,z,.027,.11,span);
    };
    if(side===1){endBoard(world,-7.32,11.76);endBoard(world,7.32,11.76);endBoard(entryGate,0,2.88);}
    else endBoard(world,0,26.4);
    for(let x=-27;x<=28;x+=3.6)block(world,top,x,1.55,side*13.2,.032,.82,.053);
    for(let tier=0;tier<3;tier++)block(world,step,0,.37+tier*.42,side*(14.35+tier*1.17),52,.65+tier*.54,1.22);
  }
  const seats=Array.from({length:132},(_,i)=>{
    const side=i<66?-1:1,tier=Math.floor(i%66/22),seat=i%22;
    return {side,tier,seat,x:(seat-10.5)*2.24+(tier%2)*.32,z:side*(14.40+tier*1.17),y:.43+tier*.69};
  });
  const crowd=buildCrowd(seats);
  world.add(crowd.group);
  const netRail=material(0xc24250), net=material(0xadb8c2);
  for(const side of [-1,1]){
    const x=side*RINK.goal,back=x+side*1.26;
    for(const z of [-RINK.mouth,RINK.mouth]){
      tube(world,netRail,.095,[x,.055,z],[x,1.31,z]);
      tube(world,netRail,.074,[x,1.30,z],[back,1.05,z]);
      tube(world,net,.060,[back,.04,z],[back,1.05,z]);
    }
    tube(world,netRail,.096,[x,1.31,-RINK.mouth],[x,1.31,RINK.mouth]);
    for(let z=-1.57;z<=1.6;z+=.16)tube(world,net,.014,[back,.04,z],[back,1.06,z]);
    for(let y=.1;y<1.10;y+=.12)tube(world,net,.014,[back,y,-RINK.mouth],[back,y,RINK.mouth]);
  }
  return {crowd,entryGate};
}
const athleteFaces=[
  {skin:0xc88e72,hair:0x2c201e,eyes:0x4d392a,width:.97,length:1,hairStyle:1},
  {skin:0x825341,hair:0x20191b,eyes:0x382820,width:1.03,length:1.05,hairStyle:2},
  {skin:0xe6b494,hair:0xab693b,eyes:0x434f39,width:.93,length:1.04,hairStyle:0},
  {skin:0xa36e56,hair:0x252026,eyes:0x372c27,width:1.04,length:.97,hairStyle:1},
  {skin:0xd19b7c,hair:0x513629,eyes:0x554e37,width:1,length:.97,hairStyle:0},
  {skin:0xe4ab9e,hair:0x573f37,eyes:0x465d66,width:1.02,length:.98,hairStyle:2},
];
export const facePresets=['Reference','Soft jaw','Oval','Angular','High cheekbones','Long face'];
export const hairPresets={tucked:'Tucked short',ponytail:'Low ponytail',braid:'Single braid',double:'Twin braids',bun:'Low bun'};
const defaultHair=['tucked','ponytail','braid'];
const detailedSphere=new THREE.SphereGeometry(1,24,18);
function helmetGeometry(){
  const geometry=new THREE.SphereGeometry(1,64,32,0,Math.PI*2,0,Math.PI*.62);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const widen=v=>Math.sign(v)*Math.pow(Math.abs(v),.82);
    const rim=Math.max(0,1-y*1.4);
    p.setXYZ(i,widen(x)*.154,.070+y*.135+rim*(.036*Math.max(0,z)-.060*Math.max(0,-z)),widen(z)*.147-.024);
  }
  geometry.computeVertexNormals();return geometry;
}
const helmetShell=helmetGeometry();
const shaftShape=new THREE.BoxGeometry();
const padOutline=new THREE.Shape();
padOutline.moveTo(-.5,-.37);padOutline.quadraticCurveTo(-.5,-.5,-.37,-.5);
padOutline.lineTo(.37,-.5);padOutline.quadraticCurveTo(.5,-.5,.5,-.37);
padOutline.lineTo(.5,.37);padOutline.quadraticCurveTo(.5,.5,.37,.5);
padOutline.lineTo(-.37,.5);padOutline.quadraticCurveTo(-.5,.5,-.5,.37);padOutline.closePath();
const padShape=new THREE.ExtrudeGeometry(padOutline,{depth:.72,bevelThickness:.13,bevelSize:.045,bevelSegments:3,steps:1});
padShape.center();
const roundedMaterial=(color)=>new THREE.MeshStandardMaterial({color,roughness:.52});
function contour(rows,depth){
  const points=rows.map(([height,radius])=>new THREE.Vector2(radius,height));
  const geometry=new THREE.LatheGeometry(points,28);
  geometry.scale(1,1,depth);
  return geometry;
}
function fabricShape(rows,depth,strength){
  const path=new THREE.CatmullRomCurve3(rows.map(([y,r])=>new THREE.Vector3(Math.max(0,r),y,0)));
  const geometry=contour(path.getPoints(55).map(p=>[p.y,Math.max(0,p.x)]),depth);
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    if(Math.hypot(x,z)<.01)continue;
    const angle=Math.atan2(x,z/depth);
    const wrinkles=1+strength*(Math.sin(angle*7+y*8)*.60+Math.cos(angle*4-y*18)*.34+Math.sin(y*96+angle*2)*.06);
    positions.setXYZ(i,x*wrinkles,y,z*wrinkles);
  }
  geometry.computeVertexNormals();return geometry;
}
const jerseyShape=fabricShape([[.724,0],[.728,.243],[.747,.263],[.84,.259],[.98,.244],[1.13,.244],[1.26,.255],[1.34,.246],[1.398,.193],[1.438,.119],[1.452,0]],.64,.041);
const hemShape=contour([[.738,.250],[.743,.264],[.752,.263]],.64);
const pantsShape=contour([[.71,0],[.74,.211],[.81,.259],[.93,.255],[.97,.203],[.98,0]],.65);
function trouserGeometry(){
  const geometry=fabricShape([[-.756,.052],[-.737,.095],[-.701,.101],[-.627,.096],[-.504,.103],[-.402,.112],[-.30,.118],[-.167,.115],[-.055,.104],[.039,.070],[.062,0]],.89,.069);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const cuff=1-THREE.MathUtils.smoothstep(y,-.733,-.55);
    const front=Math.max(0,z)/Math.max(.001,Math.hypot(x,z));
    p.setZ(i,z+cuff*(.054+front*.053));
    p.setY(i,y+cuff*(1-front)*.033);
  }
  geometry.computeVertexNormals();return geometry;
}
const trouserShape=trouserGeometry();
const linerShape=fabricShape([[-.723,.048],[-.676,.063],[-.557,.064],[-.410,.073],[-.287,.082],[-.131,.091],[-.045,.090],[.045,.068],[.060,0]],.93,.025);
function sculptFace(variant){
  const profile=[[-.153,0],[-.145,.047],[-.118,.085],[-.074,.115],[-.014,.133],[.060,.137],[.109,.122],[.148,.080],[.161,0]];
  const curve=new THREE.CatmullRomCurve3(profile.map(([y,r])=>new THREE.Vector3(r,y,0)));
  const geometry=new THREE.LatheGeometry(curve.getPoints(58).map(({x,y})=>new THREE.Vector2(Math.max(0,x),y)),64);
  geometry.scale(1,1,.86);
  const xyz=geometry.attributes.position;
  const bump=(x,y,cx,cy,rx,ry)=>Math.exp(-((x-cx)**2/rx**2+(y-cy)**2/ry**2));
  for(let i=0;i<xyz.count;i++){
    const x=xyz.getX(i),y=xyz.getY(i),z=xyz.getZ(i);
    const jaw=[0,.105,.012,-.085,-.055,-.07][variant];
    const cheeks=[0,-.014,-.040,.020,.075,-.032][variant];
    xyz.setX(i,x*(1+jaw*Math.exp(-(((y+.10)/.047)**2))+cheeks*Math.exp(-(((y+.022)/.056)**2))));
    if(z<=0)continue;
    const bridge=[.020,.015,.017,.024,.020,.026][variant];
    const nose=bridge*bump(x,y,0,.009,.023,.052)+.029*bump(x,y,0,-.024,.027,.022);
    const cheek=.008*bump(Math.abs(x),y,.082,-.021,.040,.033);
    const orbit=-.008*bump(Math.abs(x),y,.060,.034,.031,.021);
    xyz.setZ(i,z+nose+cheek+orbit+.008*bump(x,y,0,-.080,.051,.028));
  }
  geometry.computeVertexNormals();return geometry;
}
const faceMeshes=new Map();
function faceGeometry(variant){
  if(!faceMeshes.has(variant))faceMeshes.set(variant,sculptFace(variant));
  return faceMeshes.get(variant);
}
const faceMap=new THREE.Texture();
faceMap.colorSpace=THREE.SRGBColorSpace;
faceMap.anisotropy=4;
const texturedFaces=[];
const facePhoto=new Image();
facePhoto.onload=()=>{
  faceMap.image=facePhoto;faceMap.needsUpdate=true;
  for(const {features,uniform} of texturedFaces){features.visible=false;uniform.value=1;}
};
facePhoto.src=new URL('./skater-face.jpg',import.meta.url).href;
function projectFace(surface,features){
  const skin=surface.material,base=new THREE.Color(0xc48f74),active={value:facePhoto.complete&&facePhoto.naturalWidth>0?1:0};
  features.visible=active.value===0;
  texturedFaces.push({features,uniform:active});
  skin.customProgramCacheKey=()=>'ringette-face-projection';
  skin.onBeforeCompile=shader=>{
    shader.uniforms.faceAlbedo={value:faceMap};shader.uniforms.faceBaseline={value:base};shader.uniforms.useFaceAlbedo=active;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 faceLocal;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nfaceLocal=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 faceLocal;
      uniform sampler2D faceAlbedo;
      uniform vec3 faceBaseline;
      uniform float useFaceAlbedo;`)
      .replace('#include <map_fragment>',`#include <map_fragment>
        vec2 faceUV=vec2(0.504+faceLocal.x*2.51,0.485+faceLocal.y*2.68);
        float edge=(1.0-smoothstep(0.112,0.129,abs(faceLocal.x))) * smoothstep(0.024,0.092,faceLocal.z);
        edge*=smoothstep(-0.148,-0.118,faceLocal.y)*(1.0-smoothstep(0.072,0.108,faceLocal.y));
        if(useFaceAlbedo>0.5){
          vec3 portrait=texture2D(faceAlbedo, faceUV).rgb;
          vec3 complexion=clamp(diffuseColor.rgb / faceBaseline,0.08,3.0);
          diffuseColor.rgb=mix(diffuseColor.rgb, portrait*complexion, edge);
        }`);
  };
}
const sleeveShape=contour([[-.54,0],[-.54,.68],[-.41,.80],[-.18,.92],[.16,1],[.43,.91],[.54,.70],[.54,0]],1);
const ovalDetail=(parent,mat,x,y,z,w,h,d)=>mesh(parent,detailedSphere,mat,[x,y,z],[w,h,d]);
function sleeve(parent,mat,from,to,width){
  const start=new THREE.Vector3(...from),end=new THREE.Vector3(...to);
  const direction=start.clone().sub(end);
  const item=mesh(parent,sleeveShape,mat,start.lerp(end,.5).toArray(),[width,direction.length()*1.19,width]);
  item.quaternion.setFromUnitVectors(yAxis,direction.normalize());
}
const skaterGarments=new Map();
function tailoredJersey(relaxed){
  if(skaterGarments.has(relaxed))return skaterGarments.get(relaxed);
  const columns=48,rows=36,sides=[{side:1,from:8,to:16},{side:-1,from:32,to:40}];
  const low=24,high=34,origin=.734,height=.726;
  const profileRows=[[0,.244,.139],[.07,.250,.146],[.25,.231,.140],[.52,.233,.155],[.72,.246,.163],[.86,.243,.152],[.94,.186,.117],[1,.103,.078]];
  const positions=[],uvs=[],indices=[];
  const vertex=(p,u,v)=>{const index=positions.length/3;positions.push(p.x,p.y,p.z);uvs.push(u,v);return index;};
  const vertexAt=(row,col)=>row*(columns+1)+col;
  for(let row=0;row<=rows;row++){
    const v=row/rows,y=origin+height*v;
    const end=profileRows.findIndex(row=>row[0]>=v),a=profileRows[Math.max(0,end-1)],b=profileRows[Math.max(0,end)];
    const t=a===b?0:(v-a[0])/(b[0]-a[0]);
    const wide=THREE.MathUtils.lerp(a[1],b[1],t),deep=THREE.MathUtils.lerp(a[2],b[2],t);
    for(let col=0;col<=columns;col++){
      const theta=col/columns*2*Math.PI,side=Math.sin(theta),front=Math.cos(theta);
      // A lower neck opening at the front keeps the collar from reading as a raised band.
      const opening=Math.pow(Math.max(0,v-.89)/.11,2)*Math.max(0,front)*.033;
      const sag=.011*(.35+.65*Math.abs(front))*Math.pow(1-v,7)*Math.cos(theta*3+.6);
      const drape=(Math.sin(theta*7+v*6)*.003+Math.cos(theta*13-v*5)*.004)*(1-Math.pow(v,4))+.0029*Math.cos(theta*4-v*13);
      vertex(new THREE.Vector3((wide+drape)*side,y-opening+sag,(deep+drape)*front),col/columns,v);
      if(!row||!col||row>low&&row<=high&&sides.some(({from,to})=>col>from&&col<=to))continue;
      const old=vertexAt(row-1,col-1),next=vertexAt(row,col-1);
      indices.push(old,old+1,next,old+1,next+1,next);
    }
  }
  const pointAt=i=>new THREE.Vector3(positions[i*3],positions[i*3+1],positions[i*3+2]);
  for(const {side,from,to} of sides){
    const edge=[];
    for(let col=from;col<to;col++)edge.push(vertexAt(high,col));
    for(let row=high;row>low;row--)edge.push(vertexAt(row,to));
    for(let col=to;col>from;col--)edge.push(vertexAt(low,col));
    for(let row=low;row<high;row++)edge.push(vertexAt(row,from));
    const centre=edge.reduce((sum,value)=>sum.add(pointAt(value)),new THREE.Vector3()).divideScalar(edge.length);
    const hand=relaxed?(side===1?[.325,.770,.099]:[-.287,.775,.189]):side===1?[.17,.768,.584]:[-.28,1.06,.405];
    const elbow=relaxed?[side*.279,1.054,.031]:[side*.328,1.067,side===1?.27:.14];
    const wrist=elbow.map((value,i)=>(value+hand[i]*6)/7);
    const points=[centre,centre.clone().lerp(new THREE.Vector3(...elbow),.40).add(new THREE.Vector3(side*(relaxed?.039:.048),0,0)),new THREE.Vector3(...elbow),new THREE.Vector3(...wrist)];
    const path=new THREE.CatmullRomCurve3(points);
    const axis=new THREE.Vector3(side,0,0);
    const seam=edge.map(i=>{
      const offset=pointAt(i).sub(centre);
      return offset.addScaledVector(axis,-offset.dot(axis)).normalize();
    });
    let previous=edge;
    for(let row=1;row<=28;row++){
      const t=row/28,centre=path.getPoint(t),tangent=path.getTangent(t);
      const twist=new THREE.Quaternion().setFromUnitVectors(axis,tangent);
      const blend=THREE.MathUtils.smoothstep(t,0,.37),radius=.100-.034*t;
      const ring=edge.map((i,j)=>{
        const fold=1+Math.sin(t*31+j*.45)*.042*Math.sin(t*Math.PI)+Math.sin(t*46+j*.24)*.026*Math.pow(t,3);
        const target=centre.clone().addScaledVector(seam[j].clone().applyQuaternion(twist),radius*fold);
        const offset=path.getPoint(t*.52).sub(points[0]);
        const local=pointAt(i).add(offset).lerp(target,blend);
        // Match the body UV at the shoulder and keep horizontal striping level.
        return vertex(local,uvs[i*2],THREE.MathUtils.clamp((local.y-origin)/height,0,1));
      });
      for(let j=0;j<edge.length;j++){
        const k=(j+1)%edge.length;
        indices.push(previous[k],previous[j],ring[j],previous[k],ring[j],ring[k]);
      }
      previous=ring;
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();
  const normals=geometry.attributes.normal;
  for(let row=0;row<=rows;row++){
    const a=vertexAt(row,0),b=vertexAt(row,columns);
    const average=new THREE.Vector3().fromBufferAttribute(normals,a).add(new THREE.Vector3().fromBufferAttribute(normals,b)).normalize();
    normals.setXYZ(a,average.x,average.y,average.z);normals.setXYZ(b,average.x,average.y,average.z);
  }
  skaterGarments.set(relaxed,geometry);return geometry;
}
function dressLeg(thigh,root,shin,pants,geometry=trouserShape){
  if(!geometry.attributes.skinIndex){
    const indices=[],weights=[],position=geometry.attributes.position;
    for(let i=0;i<position.count;i++){
      const lower=1-THREE.MathUtils.smoothstep(position.getY(i),-.49,-.30);
      indices.push(0,1,0,0);weights.push(1-lower,lower,0,0);
    }
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  }
  const leg=new THREE.SkinnedMesh(geometry,pants);leg.frustumCulled=false;
  thigh.add(leg);thigh.updateWorldMatrix(true,true);
  leg.bind(new THREE.Skeleton([root,shin]));
  return leg;
}
function makeFabric(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const g=canvas.getContext('2d');g.fillStyle='#888';g.fillRect(0,0,64,64);
  for(let y=0;y<64;y+=8)for(let x=0;x<64;x+=8){
    g.fillStyle='#727272';g.fillRect(x+(y%16===0?1:5),y+1,2,5);
    g.fillStyle='#a5a5a5';g.fillRect(x+(y%16===0?3:7),y+2,1,4);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(7,4);return texture;
}
const fabric=makeFabric();
function rod(parent,mat,a,b,w,d=w){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
  const direction=end.clone().sub(start);
  const middle=start.lerp(end,.5);
  const item=mesh(parent,shaftShape,mat,middle.toArray(),[w,direction.length(),d]);
  item.quaternion.setFromUnitVectors(yAxis,direction.normalize());
  return item;
}
function wire(parent,mat,points,radius){
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(parent,new THREE.TubeGeometry(path,Math.max(10,points.length*2),radius,5,false),mat,[0,0,0],[1,1,1]);
}
function hairstyle(parent,base,trim,style){
  const group=new THREE.Group();parent.add(group);
  const strands=base.clone();strands.color.multiplyScalar(1.24);
  const shade=base.clone();shade.color.multiplyScalar(.76);
  const paths=[];
  if(style==='ponytail')paths.push([[0,-.038,-.141],[.017,-.087,-.187],[.053,-.175,-.211],[.047,-.256,-.203]]);
  if(style==='braid')paths.push([[0,-.044,-.147],[.01,-.135,-.189],[.009,-.245,-.204],[.030,-.327,-.216]]);
  if(style==='double')for(const side of [-1,1])paths.push([[side*.076,-.036,-.120],[side*.118,-.113,-.152],[side*.122,-.210,-.148],[side*.103,-.274,-.179]]);
  if(style==='bun'){
    const anchor=[0,-.064,-.171];
    ovalDetail(group,base,...anchor,.061,.050,.056);
    for(let i=0;i<7;i++){
      const a=i*2*Math.PI/7;
      const points=Array.from({length:9},(_,j)=>{
        const t=j/8,theta=a+t*.88,r=.053*Math.sin(Math.PI*t);
        return [Math.cos(theta)*r,anchor[1]+.045*Math.cos(Math.PI*t),anchor[2]-.020-Math.sin(theta)*r*.62];
      });
      wire(group,i%2?strands:shade,points,.0019);
    }
  }
  for(const points of paths){
    const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const braided=style==='braid'||style==='double';
    const radius=style==='double'?.021:.033;
    for(let strand=0;strand<(braided?3:9);strand++){
      const samples=Array.from({length:27},(_,j)=>{
        const t=j/26,p=path.getPoint(t),angle=(braided?t*25:t*.8)+strand*2*Math.PI/(braided?3:9);
        const taper=.32+.68*Math.sin(Math.PI*(.23+.77*t));
        const swell=radius*taper*(braided?.56:.66);
        return [p.x+Math.cos(angle)*swell,p.y,p.z+Math.sin(angle)*swell];
      });
      wire(group,[base,strands,shade][strand%3],samples,radius*(braided?.53:.36));
    }
    wire(group,trim,[[points[0][0]-.023,points[0][1]-.011,points[0][2]],[points[0][0],points[0][1]-.012,points[0][2]-.020],[points[0][0]+.023,points[0][1]-.011,points[0][2]]],.005);
    if(braided){const end=path.getPoint(.94);ovalDetail(group,trim,end.x,end.y,end.z,.015,.009,.016);}
  }
  return {group,base,strands,shade};
}
const neckShape=contour([[1.397,.086],[1.431,.076],[1.471,.066],[1.501,.065],[1.531,.074],[1.548,.069],[1.549,0]],.86);
function buildHead(parent,features,trim,goalie,variant){
  const head=new THREE.Group();
  head.position.set(0,1.642,.054);head.scale.set(features.width*.97,features.length*1.018,.97);
  parent.add(head);
  const skin=material(features.skin,.61), hair=material(features.hair,.80);
  const iris=material(features.eyes,.40), dark=material(0x201d21,.42), pearl=material(0xf1ebe4,.48);
  const lip=material(new THREE.Color(features.skin).multiplyScalar(.63).lerp(new THREE.Color(0x9f4f50),.40));
  const helmet=new THREE.MeshPhysicalMaterial({color:goalie?0xeaf4f6:0x15191e,roughness:.31,metalness:.18,clearcoat:.46,clearcoatRoughness:.35});
  const cage=new THREE.MeshStandardMaterial({color:goalie?0x90a2af:0x4f575d,metalness:.5,roughness:.31});
  const polymer=material(0x141719,.72), lining=material(0x292c30,.90), screws=material(0x949c9e,.34);
  mesh(parent,neckShape,skin,[0,0,.013],[1,1,1]);
  const surface=mesh(head,faceGeometry(variant),skin,[0,0,0],[1,1,1]);
  const featuresOnFace=new THREE.Group();head.add(featuresOnFace);
  wire(featuresOnFace,lip,[[-.031,-.080,.102],[-.012,-.079,.110],[0,-.081,.111],[.013,-.079,.110],[.031,-.080,.102]],.0046);
  wire(featuresOnFace,lip,[[-.026,-.086,.103],[0,-.090,.110],[.026,-.086,.103]],.0043);
  const eyeGroups=[];
  const brow=material(new THREE.Color(features.hair).lerp(new THREE.Color(features.skin),.30));
  for(const side of [-1,1]){
    ovalDetail(head,skin,side*.127,.001,.002,.018,.034,.024);
    const eye=new THREE.Group();eye.position.set(side*.053,.034,.103);eye.rotation.z=side*.08;featuresOnFace.add(eye);eyeGroups.push(eye);
    ovalDetail(eye,pearl,0,0,0,.025,.010,.009);
    ovalDetail(eye,iris,-side*.001,0,.008,.010,.010,.004);
    ovalDetail(eye,dark,-side*.001,0,.011,.005,.006,.002);
    ovalDetail(eye,pearl,-.004,.004,.013,.002,.002,.001);
    wire(eye,brow,[[-.025,0,-.001],[-.011,.009,.007],[.009,.009,.007],[.024,0,-.001]],.0021);
    wire(featuresOnFace,brow,[[side*.024,.059,.112],[side*.043,.064,.110],[side*.063,.063,.102],[side*.082,.057,.092]],.0038);
    const innerPad=mesh(head,padShape,lining,[side*.128,.004,-.021],[.026,.102,.112]);innerPad.rotation.x=-.22;
    const earCover=mesh(head,padShape,helmet,[side*.143,.001,-.019],[.027,.089,.100]);earCover.rotation.x=-.24;
    ovalDetail(head,polymer,side*.154,.005,-.019,.005,.025,.029);
    ovalDetail(head,screws,side*.159,.038,.010,.004,.007,.007);
    wire(head,cage,[[side*.141,.047,.027],[side*.130,.028,.114],[side*.117,-.035,.151],[side*.077,-.126,.149],[side*.040,-.148,.129]],.0046);
  }
  ovalDetail(head,hair,0,.040,-.078,.121,.102,.071);
  const styles=new Map();
  let currentHair;
  function setHair(style,color){
    const selected=Object.hasOwn(hairPresets,style)?style:defaultHair[features.hairStyle];
    if(!styles.has(selected))styles.set(selected,hairstyle(head,hair,trim,selected));
    if(currentHair)currentHair.group.visible=false;
    currentHair=styles.get(selected);currentHair.group.visible=true;
    hair.color.set(color??features.hair);
    currentHair.strands.color.copy(hair.color).multiplyScalar(1.24);
    currentHair.shade.color.copy(hair.color).multiplyScalar(.76);
    return currentHair.group;
  }
  setHair(undefined);
  mesh(head,helmetShell,helmet,[0,0,0],[1,1,1]);
  for(const side of [-1,1]){
    wire(head,lining,[[side*.133,-.018,.028],[side*.151,-.014,-.026],[side*.136,-.031,-.076],[side*.092,-.061,-.123]],.0068);
    wire(head,helmet,[[side*.041,.193,-.009],[side*.066,.179,-.047],[side*.100,.149,-.082],[side*.125,.108,-.112]],.0053);
    wire(head,polymer,[[side*.073,.173,.030],[side*.104,.155,.034],[side*.129,.125,.031]],.0033);
  }
  for(const lift of [0,.019])wire(head,helmet,[[-.147,.035+lift,.022],[-.110,.067+lift,.096],[0,.081+lift,.124],[.110,.067+lift,.096],[.147,.035+lift,.022]],.0078);
  wire(head,lining,[[-.119,.049,.096],[-.073,.063,.133],[0,.069,.147],[.073,.063,.133],[.119,.049,.096]],.0045);
  for(const side of [-1,1]){
    for(const lift of [0,.019,.035]){
      wire(head,polymer,[[side*.047,.155+lift,.082],[side*.079,.142+lift,.089],[side*.101,.118+lift,.095]],.004);
    }
    ovalDetail(head,screws,side*.115,.064,.091,.006,.006,.007);
    wire(head,helmet,[[side*.103,-.066,.143],[side*.078,-.129,.148],[side*.039,-.149,.128],[0,-.148,.132]],.0078);
    wire(head,polymer,[[side*.137,-.026,.024],[side*.127,-.074,.064],[side*.087,-.123,.106]],.008);
  }
  for(const [y,w,z] of [[.047,.113,.150],[.020,.117,.165],[-.014,.118,.172],[-.048,.106,.176],[-.086,.094,.172],[-.117,.068,.159],[-.139,.045,.143]]){
    wire(head,cage,[[-w,y,z-.047],[-w*.52,y-.003,z-.012],[0,y-.007,z],[w*.52,y-.003,z-.012],[w,y,z-.047]],.0029);
  }
  for(const side of [-1,1]){
    for(const x of [.037,.074,.105]){
      wire(head,cage,[[side*x,.049,.151-.48*x*x],[side*x*1.02,-.010,.175-.62*x*x],[side*x*.85,-.073,.174-.95*x*x],[side*x*.44,-.136,.148-.76*x*x]],.0027);
    }
  }
  if(variant===0&&!goalie)projectFace(surface,featuresOnFace);
  return {head,skin,helmet,eyeGroups,setHair};
}
function bladeProfile(){
  const outline=new THREE.Shape();
  outline.moveTo(-.145,-.033);outline.quadraticCurveTo(-.137,-.055,-.106,-.061);
  outline.bezierCurveTo(-.02,-.071,.135,-.071,.174,-.053);outline.quadraticCurveTo(.195,-.047,.194,-.035);
  outline.lineTo(.14,-.034);outline.lineTo(.129,-.012);outline.lineTo(.079,-.012);outline.lineTo(.071,-.036);
  outline.lineTo(-.065,-.037);outline.lineTo(-.075,-.014);outline.lineTo(-.12,-.014);outline.lineTo(-.13,-.034);outline.closePath();
  const geometry=new THREE.ExtrudeGeometry(outline,{depth:.010,steps:1,bevelEnabled:false,curveSegments:12});
  geometry.translate(0,0,-.005);geometry.rotateY(-Math.PI/2);return geometry;
}
const runner=bladeProfile();
function sculptVamp(){
  const shape=[[-.151,.032,.079],[-.126,.060,.113],[-.090,.071,.143],[-.045,.066,.133],[0,.070,.108],
    [.042,.076,.082],[.094,.076,.064],[.142,.065,.057],[.175,.044,.040],[.192,.012,.022]];
  const section=new THREE.CatmullRomCurve3(shape.map(([z,w,h])=>new THREE.Vector3(w,h,z)));
  const positions=[],indices=[];
  const segments=22;
  for(const [row,entry] of section.getPoints(33).entries()){
    for(let i=0;i<=segments;i++){
      const phi=i/segments*Math.PI*2;
      positions.push(Math.sin(phi)*Math.max(.006,entry.x),.014+entry.y*(.5+.5*Math.cos(phi)),entry.z);
      if(!i||!row)continue;
      const v=row*(segments+1)+i;
      indices.push(v-segments-2,v-1,v-segments-1,v-segments-1,v-1,v);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  return geometry;
}
const vamp=sculptVamp();
function boot(parent,side,trim,equipment,steel,dark){
  const foot=new THREE.Group();
  foot.position.set(0,-.364,.11);
  foot.scale.x=.83;
  parent.add(foot);
  mesh(foot,vamp,equipment,[0,0,0],[1,1,1]);
  ovalDetail(foot,dark,0,.039,.158,.058,.031,.040);
  ovalDetail(foot,equipment,0,.095,-.102,.067,.079,.061);
  wire(foot,trim,[[side*.071,.041,-.12],[side*.078,.052,-.049],[side*.064,.063,.055],[side*.056,.061,.104]],.0041);
  for(const side of [-1,1])wire(foot,dark,[[side*.054,.171,-.066],[side*.054,.12,.003],[side*.058,.078,.104]],.011);
  for(let i=0;i<7;i++){
    const z=.004+i*.016,y=.130-i*.0082;
    wire(foot,steel,[[-.048,y,z+.006],[-.020,y+.012,z],[.021,y+.011,z+.003],[.050,y-.001,z-.005]],.0035);
  }
  mesh(foot,padShape,dark,[0,.013,.019],[.151,.027,.321]);
  mesh(foot,runner,steel,[0,0,0],[1,1,1]);
  return foot;
}
function glove(parent,pos,gloveColor,trim,side,goalie){
  const [x,y,z]=pos;
  const gloveRoot=new THREE.Group();parent.add(gloveRoot);gloveRoot.position.set(x,y,z);gloveRoot.rotation.z=side*.055;
  const leather=material(0x25282c,.76), trace=material(0x60666a,.82);
  ovalDetail(gloveRoot,gloveColor,0,-.013,.009,.058,.081,.042);
  const cuff=mesh(gloveRoot,padShape,gloveColor,[0,.063,-.002],[.118,.050,.082]);cuff.rotation.x=.20;
  mesh(gloveRoot,padShape,leather,[0,.022,.038],[.104,.056,.021]);
  ovalDetail(gloveRoot,gloveColor,side*.047,-.027,.023,.021,.043,.025);
  wire(gloveRoot,trace,[[side*.054,.026,.032],[side*.058,.001,.044],[side*.051,-.034,.043]],.0025);
  for(let i=0;i<4;i++){
    const offset=(i-1.5)*.021;
    const pad=mesh(gloveRoot,padShape,gloveColor,[offset,-.029,.043],[.018,.043,.019]);pad.rotation.x=.10;
    ovalDetail(gloveRoot,leather,offset,-.056+Math.abs(i-1.5)*.004,.033,.010,.018,.015);
    wire(gloveRoot,trace,[[offset,-.010,.052],[offset,-.027,.054],[offset,-.043,.050]],.00145);
  }
  if(!goalie){
    wire(gloveRoot,trim,[[-.061,.069,.012],[-.043,.064,.037],[0,.063,.041],[.043,.064,.037],[.061,.069,.012]],.0027);
    wire(gloveRoot,trace,[[-.046,.040,.047],[0,.035,.051],[.046,.040,.047]],.0019);
  }
}
const frontNumberShape=new THREE.PlaneGeometry(.225,.225);
const chestMarks=Object.fromEntries([['left',1],['right',-1]].map(([label,side])=>{
  const geometry=new THREE.PlaneGeometry(.125,.125,12,6),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i)+side*.113,y=p.getY(i)+1.303;
    p.setXYZ(i,x,y,.164*Math.sqrt(1-(x/.249)**2)+.006);
  }
  geometry.computeVertexNormals();return [label,geometry];
}));
function castModelShadows(group){
  group.traverse(piece=>{
    if(piece.isMesh&&!piece.material.transparent){piece.castShadow=true;piece.receiveShadow=true;}
  });
}
function skater({color,trim,number,goalie,variant=0,portrait=false}){
  const model=new THREE.Group(),upper=new THREE.Group();
  model.add(upper);
  const jersey=new THREE.MeshPhysicalMaterial({color,roughness:.89,sheen:.35,sheenRoughness:.85,sheenColor:0xaebcc5});
  const collar=material(trim,.72);
  jersey.bumpMap=fabric;jersey.bumpScale=.0028;
  const pants=material(goalie?0x1d2634:0x172039,.94), equipment=roundedMaterial(0x13171c);
  const boots=roundedMaterial(0x13171c),gloves=roundedMaterial(0x13171c);
  pants.bumpMap=fabric;pants.bumpScale=.005;
  const white=material(0xe1eaf2), steel=roundedMaterial(0xa7b7c0), dark=material(0x0e1723);
  const shaft=roundedMaterial(0x16191d), tape=material(goalie?0xdce5ed:0x282a30,.88);
  const jerseySeam=material(0xffffff,.9);
  jerseySeam.color.copy(jersey.color).multiplyScalar(.67);
  const relaxed=portrait&&!goalie;
  const shirt=new THREE.Group();upper.add(shirt);
  mesh(shirt,goalie?jerseyShape:tailoredJersey(relaxed),jersey,[0,0,0],[goalie?1.13:1,1,1]);
  mesh(shirt,hemShape,goalie?collar:jerseySeam,[0,0,0],[goalie?1.13:.965,1,goalie?1:.94]);
  if(!goalie){
    const crew=Array.from({length:29},(_,i)=>{
      const a=i/28*Math.PI*2;return [.102*Math.sin(a),1.459-.033*Math.max(0,Math.cos(a)),.078*Math.cos(a)];
    });
    wire(shirt,jerseySeam,crew,.009);
    for(const side of [-1,1])wire(shirt,jerseySeam,[[side*.218,.770,.056],[side*.223,.892,.064],[side*.222,1.019,.063]],.0018);
  }
  const trousers=[mesh(model,pantsShape,pants,[0,0,0],[goalie?1:.86,1,goalie?1:.76])];
  const padding=new THREE.Group();upper.add(padding);padding.visible=false;
  const girdle=new THREE.Group();model.add(girdle);girdle.visible=false;
  const underLayers=[padding,girdle];
  const baseLayer=material(0x252d37,.96),foam=material(0x35434e,.72),binding=material(0x778892,.80);
  if(!goalie){
    mesh(padding,jerseyShape,baseLayer,[0,.017,0],[.70,.99,.71]);
    mesh(padding,padShape,foam,[0,1.232,.102],[.28,.29,.102]);
    mesh(padding,padShape,foam,[0,1.240,-.092],[.26,.31,.086]);
    for(const y of [1.166,1.231,1.296])wire(padding,binding,[[-.095,y,.151],[0,y-.012,.158],[.095,y,.151]],.0043);
    mesh(girdle,pantsShape,baseLayer,[0,0,0],[.82,1,.75]);
    mesh(girdle,padShape,foam,[0,.787,.104],[.132,.127,.059]);
  }
  const headRoot=new THREE.Group();upper.add(headRoot);
  const headCache=new Map();
  let currentHead;
  function equipHead(preset){
    if(currentHead)currentHead.root.visible=false;
    const face=athleteFaces[preset];
    if(!headCache.has(preset)){
      const root=new THREE.Group();headRoot.add(root);
      headCache.set(preset,{root,face,preset,...buildHead(root,face,collar,goalie,preset)});
    }
    currentHead=headCache.get(preset);currentHead.root.visible=true;
    return currentHead;
  }
  const initialHead=equipHead(variant);
  const legs=[];
  for(const side of [-1,1]){
    const thigh=new THREE.Group(),root=new THREE.Bone(),shin=new THREE.Bone();
    thigh.position.set(side*(goalie?.183:.139),.835,0);model.add(thigh);
    thigh.add(root);shin.position.set(0,-.395,.038);root.add(shin);
    trousers.push(dressLeg(thigh,root,shin,pants));
    if(goalie){
      mesh(shin,padShape,white,[0,-.143,.105],[.244,.446,.138]);
      mesh(shin,padShape,collar,[side*.070,-.143,.166],[.066,.388,.024]);
      for(const y of [-.02,-.095,-.17])block(shin,white,0,y,.177,.169,.018,.026);
      for(const y of [-.10,-.21,-.30])block(shin,equipment,0,y,-.047,.24,.041,.075);
    }else{
      const hip=new THREE.Group(),legPad=new THREE.Group();thigh.add(hip);shin.add(legPad);
      const liner=dressLeg(thigh,root,shin,baseLayer,linerShape);
      underLayers.push(hip,legPad,liner);hip.visible=false;legPad.visible=false;liner.visible=false;
      mesh(hip,padShape,foam,[side*.033,-.133,.053],[.148,.219,.104]);
      ovalDetail(legPad,baseLayer,0,-.159,.037,.069,.214,.076);
      mesh(legPad,padShape,foam,[0,-.166,.092],[.130,.292,.071]);
      ovalDetail(legPad,foam,0,-.010,.089,.080,.073,.061);
      for(const y of [-.107,-.226])wire(legPad,binding,[[-.052,y,.102],[0,y,.130],[.052,y,.102]],.004);
    }
    const skate=boot(shin,side,steel,boots,steel,dark);
    legs.push({thigh,shin,skate});
  }
  const gripTop=goalie?[-.39,.988,.40]:relaxed?[-.287,.775,.189]:[-.28,1.06,.405];
  const gripLow=goalie?[.23,.88,.57]:relaxed?[.325,.770,.099]:[.17,.768,.584];
  const top=goalie?[-.51,1.245,.33]:relaxed?[-.325,.878,.173]:[-.416,1.15,.35];
  const toe=goalie?[.75,.093,.71]:relaxed?[.039,.019,.30]:[1.00,.061,.915];
  for(const side of [-1,1]){
    const shootingHand=side===1;
    const shoulder=[side*(goalie?.292:.187),goalie?1.337:1.362,.019];
    const elbow=relaxed?[side*.296,1.063,.020]:[side*(goalie?.397:.328),1.067,shootingHand?.27:.14];
    const hand=shootingHand?gripLow:goalie?[-.48,1.02,.40]:gripTop;
    const d=goalie?1.13:1;
    if(goalie){
      const shoulderCap=ovalDetail(upper,jersey,...shoulder,.109*d,.108,.119);
      shoulderCap.rotation.z=side*.38;
      sleeve(upper,jersey,shoulder,elbow,.104*d);
      ovalDetail(upper,jersey,...elbow,.087*d,.086,.092);
      sleeve(upper,jersey,elbow,hand,.088*d);
    }else{
      ovalDetail(padding,foam,side*.216,1.347,.005,.118,.083,.106);
      sleeve(padding,baseLayer,shoulder,elbow,.061);
      const forearm=elbow.map((value,i)=>THREE.MathUtils.lerp(value,hand[i],.47));
      sleeve(padding,baseLayer,elbow,hand,.052);
      ovalDetail(padding,foam,...forearm,.064,.078,.057);
    }
    if(!goalie||shootingHand){
      glove(upper,hand,gloves,steel,side,goalie);
    }
    if(goalie&&shootingHand){
      const blocker=mesh(upper,padShape,white,[hand[0]+.024,hand[1]+.009,hand[2]+.086],[.211,.279,.084]);
      blocker.rotation.z=-.25;
      ovalDetail(upper,collar,hand[0]+.035,hand[1]-.030,hand[2]+.115,.090,.022,.01);
    }
    if(goalie&&!shootingHand){
      ovalDetail(upper,white,hand[0]-.03,hand[1]+.033,hand[2]+.012,.138,.163,.070);
      wire(upper,collar,[[hand[0]-.144,hand[1]+.008,hand[2]+.053],[hand[0]-.111,hand[1]+.120,hand[2]+.062],[hand[0]-.023,hand[1]+.163,hand[2]+.046]],.012);
      wire(upper,equipment,[[hand[0]-.112,hand[1]+.070,hand[2]+.073],[hand[0]-.065,hand[1]+.091,hand[2]+.078],[hand[0]-.012,hand[1]+.119,hand[2]+.061]],.007);
    }
  }
  rod(upper,shaft,top,toe,.031,.025);
  if(goalie){
    rod(upper,white,[.358,.649,.667],toe,.10,.036);
    rod(upper,white,toe,[1.07,.090,.77],.087,.036);
  }else{
    rod(upper,tape,top,top.map((v,i)=>THREE.MathUtils.lerp(v,toe[i],.13)),.034,.026);
  }
  const patch=document.createElement('canvas');patch.width=patch.height=256;
  const g=patch.getContext('2d');g.textAlign='center';g.textBaseline='middle';g.font='900 155px system-ui';
  const printing=new THREE.CanvasTexture(patch);printing.colorSpace=THREE.SRGBColorSpace;
  const numberMaterial=new THREE.MeshBasicMaterial({map:printing,transparent:true,depthWrite:false,alphaTest:.05});
  const back=mesh(upper,new THREE.PlaneGeometry(.405,.354),numberMaterial,[0,1.204,-.174],[1,1,1]);back.rotation.y=Math.PI;
  const crest=document.createElement('canvas');crest.width=crest.height=192;
  const crestTexture=new THREE.CanvasTexture(crest);crestTexture.colorSpace=THREE.SRGBColorSpace;
  const front=mesh(upper,frontNumberShape,new THREE.MeshBasicMaterial({map:crestTexture,transparent:true,depthWrite:false}),[0,1.223,.173],[1,1,1]);
  if(relaxed)front.visible=false;
  const patternCanvas=document.createElement('canvas');patternCanvas.width=256;patternCanvas.height=256;
  const weave=new THREE.CanvasTexture(patternCanvas);weave.colorSpace=THREE.SRGBColorSpace;
  const avatar={model,upper,...initialHead,legs,jersey,jerseySeam,kitTrim:collar,pants,boots,gloves,goalie,baseFace:variant,
    shirt,trousers,underLayers,back,equipFace(preset){Object.assign(this,equipHead(preset));},
    number:g,printing,logo:crest.getContext('2d'),crestTexture,front,weave,pattern:patternCanvas.getContext('2d'),relaxed};
  paintMarkings(avatar,number);
  return avatar;
}
function paintMarkings(body,number,name='',logo='',side='left'){
  const g=body.number;
  g.clearRect(0,0,256,256);g.fillStyle='#f4f8fc';g.strokeStyle='#101a28';g.lineJoin='round';
  g.font='900 44px system-ui';g.lineWidth=4;
  const label=name.trim().toUpperCase();
  g.strokeText(label,128,39,232);g.fillText(label,128,39,232);
  g.font='900 147px system-ui';g.lineWidth=8;
  g.strokeText(number,128,153,236);g.fillText(number,128,153,236);body.printing.needsUpdate=true;
  const front=body.logo;
  front.clearRect(0,0,192,192);body.hasFrontMark=Boolean(logo)||!body.relaxed;body.front.visible=body.hasFrontMark;
  body.front.geometry=logo?(chestMarks[side]??chestMarks.left):frontNumberShape;
  body.front.position.set(0,logo?0:1.223,logo?(body.goalie?.022:0):.173);
  body.logoSource=logo;
  if(logo){
    const image=new Image();image.onload=()=>{
      if(body.logoSource!==logo)return;
      const scale=174/Math.max(image.width,image.height),w=image.width*scale,h=image.height*scale;
      front.drawImage(image,(192-w)/2,(192-h)/2,w,h);body.crestTexture.needsUpdate=true;
    };image.src=logo;
  }else{
    front.textAlign='center';front.textBaseline='middle';front.font='900 130px system-ui';
    front.strokeStyle='#101a28';front.fillStyle='#f4f8fc';front.lineWidth=7;
    front.strokeText(number,96,96,180);front.fillText(number,96,96,180);
  }
  body.crestTexture.needsUpdate=true;
}
function paintJersey(body,primary,accent='#dcecff',pattern='solid'){
  body.jerseySeam.color.set(primary).multiplyScalar(.68);
  const texture=pattern!=='solid'?body.weave:null;
  if(body.jersey.map!==texture){body.jersey.map=texture;body.jersey.needsUpdate=true;}
  body.jersey.color.set(texture?0xffffff:primary);
  if(!texture)return;
  const g=body.pattern;g.fillStyle=primary;g.fillRect(0,0,256,256);g.fillStyle=accent;g.strokeStyle=accent;
  if(pattern==='split')g.fillRect(0,0,128,256);
  else if(pattern==='striped')for(let x=8;x<256;x+=32)g.fillRect(x,0,6,256);
  else if(pattern==='hoops')for(const y of [130,159,212])g.fillRect(0,y,256,13);
  else if(pattern==='checker')for(let y=0;y<8;y++)for(let x=y%2;x<8;x+=2)g.fillRect(x*32,y*32,32,32);
  else if(pattern==='geometric'){
    g.beginPath();g.moveTo(0,79);g.lineTo(128,148);g.lineTo(256,79);g.lineTo(256,113);g.lineTo(128,183);g.lineTo(0,113);g.closePath();g.fill();
  }else if(pattern==='drip'){
    g.fillRect(0,221,256,35);
    for(let x=0;x<256;x+=16){g.beginPath();g.roundRect(x,185+((x*13)%38),9,57,5);g.fill();}
  }
  body.weave.needsUpdate=true;
}
const waistPivot=new THREE.Vector3(0,.79,0),rotatedPivot=new THREE.Vector3();
function poseUpper(avatar,x,y,z){
  avatar.upper.rotation.set(x,y,z);
  rotatedPivot.copy(waistPivot).applyQuaternion(avatar.upper.quaternion);
  avatar.upper.position.copy(waistPivot).sub(rotatedPivot);
}
function animateAthlete(avatar,time,effort,index,portrait=false){
  const phase=time*9+index*1.8;
  const drive=portrait?0:Math.min(1,effort);
  const atRest=avatar.relaxed&&drive===0;
  poseUpper(avatar,atRest?0:.035+drive*.076,Math.sin(phase)*drive*.055,0);
  avatar.head.rotation.y=portrait?0:Math.sin(time*2+index)*.065;
  const blink=(time+index*.49)%5.35;
  const openness=1-.9*Math.max(0,1-Math.abs(blink-.10)/.10);
  for(const eye of avatar.eyeGroups)eye.scale.y=openness;
  for(const [i,{thigh,shin,skate}] of avatar.legs.entries()){
    const stride=Math.sin(phase+i*Math.PI)*drive;
    thigh.rotation.x=atRest?-.014:-.14+stride*.46;
    thigh.rotation.z=(i===0?-1:1)*((atRest?.047:.08)+Math.max(0,stride)*.15);
    shin.rotation.x=atRest?.023:.25+Math.max(0,stride)*.31;
    skate.rotation.x=-thigh.rotation.x-shin.rotation.x;
  }
}
function walkAthlete(avatar,time,walk){
  animateAthlete(avatar,time,0,0);
  const phase=walk.stride,weight=walk.effort;
  poseUpper(avatar,weight*.075,Math.sin(phase)*weight*.105,Math.cos(phase)*weight*.042);
  avatar.head.rotation.x=-weight*.055;
  for(const [i,{thigh,shin,skate}] of avatar.legs.entries()){
    const step=phase+i*Math.PI,reach=Math.cos(step),lift=Math.max(0,Math.sin(step));
    thigh.rotation.set(-.03+reach*weight*.53,0,(i===0?-1:1)*.055);
    shin.rotation.x=.06+lift*weight*.72;
    skate.rotation.x=-thigh.rotation.x-shin.rotation.x+lift*weight*.24;
  }
}
function globeView(){
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x122332);
  const sphere=new THREE.Group();scene.add(sphere);
  scene.add(new THREE.HemisphereLight(0xdfedf5,0x3a4954,2.2));
  const sun=new THREE.DirectionalLight(0xffefda,2.1);sun.position.set(-4,6,8);scene.add(sun);
  const map=document.createElement('canvas');map.width=1800;map.height=900;
  const context=map.getContext('2d');context.scale(2,2);context.fillStyle='#244759';context.fillRect(0,0,900,450);
  context.save();context.translate(0,12.5);context.fillStyle='#829385';context.strokeStyle='#afbdad';context.lineWidth=.42;
  for(const outline of worldLand){const coastline=new Path2D(outline);context.fill(coastline);context.stroke(coastline);}
  context.restore();
  context.strokeStyle='#c0d9e52b';
  for(let x=0;x<900;x+=75){context.beginPath();context.moveTo(x,0);context.lineTo(x,450);context.stroke();}
  for(let y=0;y<450;y+=75){context.beginPath();context.moveTo(0,y);context.lineTo(900,y);context.stroke();}
  const texture=new THREE.CanvasTexture(map);texture.colorSpace=THREE.SRGBColorSpace;
  sphere.add(new THREE.Mesh(new THREE.SphereGeometry(2,64,44),new THREE.MeshStandardMaterial({map:texture,roughness:.87})));
  const camera=new THREE.PerspectiveCamera(38,1,.1,30);
  const point=({lon,lat})=>{
    const phi=THREE.MathUtils.degToRad(lon+180),angle=THREE.MathUtils.degToRad(lat),r=Math.cos(angle);
    return new THREE.Vector3(-Math.cos(phi)*r,Math.sin(angle),Math.sin(phi)*r);
  };
  const front=new THREE.Vector3(0,0,1),target=new THREE.Quaternion(),spin=new THREE.Quaternion(),axes=new THREE.Euler();
  let stops=[],dots=[],selected=-1;
  function setStops(venues){
    stops=venues;
    const points=stops.map(point);
    const dotShape=new THREE.SphereGeometry(.023,10,8);
    dots=points.map(position=>{
      const dot=new THREE.Mesh(dotShape,new THREE.MeshBasicMaterial({color:0xaee5f0}));
      dot.position.copy(position).multiplyScalar(2.017);sphere.add(dot);return dot;
    });
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],distance=a.angleTo(b);
      const arc=Array.from({length:24},(_,j)=>a.clone().lerp(b,j/23).normalize().multiplyScalar(2.023+Math.sin(j/23*Math.PI)*distance*.22));
      sphere.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arc),new THREE.LineBasicMaterial({color:0xbed9e9})));
    }
  }
  function draw(renderer,aspect,{venues,index,angle}){
    if(!stops.length)setStops(venues);
    if(selected!==index){
      selected=index;
      dots.forEach((dot,i)=>{dot.scale.setScalar(i===index?2.25:1);dot.material.color.setHex(i===index?0xffcb78:0xaee5f0);});
    }
    target.setFromUnitVectors(point(stops[index]),front);
    spin.setFromEuler(axes.set(angle.x,angle.y,0));sphere.quaternion.copy(spin).multiply(target);
    camera.aspect=aspect;camera.position.z=Math.max(7.15,6.5/aspect);camera.updateProjectionMatrix();
    renderer.render(scene,camera);
  }
  return draw;
}
function buildCampus(group){
  const ground=material(0x6b7985), paving=material(0x9aa6ad), brick=material(0x757e89), shop=material(0x9b8072);
  const trim=material(0x21465d), roof=material(0x354551), floor=material(0x536373), glass=material(0x233846,.28);
  const rail=material(0x364756), foliage=material(0x455e54), wood=material(0x895e41);
  const ice=material(0xc1dce3,.43), light=material(0xf1dba2), dark=material(0x243242);
  const terrain=material(0x99a9ac), distant=[material(0x697c81),material(0x8a918b),material(0x829195)];
  block(group,terrain,56,-.37,0,224,.42,225);
  const skyline=new THREE.Group();group.add(skyline);
  const conifer=new THREE.ConeGeometry(1,1,9);
  const scenery=Array.from({length:3},()=>{const district=new THREE.Group();skyline.add(district);return district;});
  for(const [style,district] of scenery.entries()){
    for(let i=0;i<13;i++){
      const z=-65+i*10.4, x=103+(i*13%29);
      const h=style===1?9+(i*15%21):5+(i*11%13);
      const width=style===1?7+(i*5%6):11+(i*5%6);
      block(district,distant[i%3],x,h/2,z,width,h,7.5+(i%3)*2);
      block(district,roof,x,h+.25,z,width*.74,.50,6.8);
      for(let floorY=1.4;floorY<h-1;floorY+=2.6){
        block(district,glass,x-width/2-.018,floorY,z,.035,.44,5.1);
      }
    }
    if(style!==1)for(const side of [-1,1])for(let i=0;i<18;i++){
      const z=side*(37+(i*5%13)),x=22+i*4.8,h=4+(i*7%6)*.70;
      block(district,wood,x,.95,z,.23,1.9,.23);
      for(let tier=0;tier<3;tier++){
        const r=1.36-tier*.31;
        mesh(district,conifer,foliage,[x,h*(.37+tier*.185),z],[r,h*.52,r]);
      }
    }
  }
  block(group,ground,56,-.18,0,62,.3,75);
  block(group,paving,56,-.011,0,33,.025,11);
  block(group,paving,56.8,-.010,0,4,.025,34);
  const line=material(0x5e6c78);
  for(let x=42;x<70;x+=2.1)block(group,line,x,.005,0,.026,.009,10.9);
  for(const edge of [-5.45,5.45])block(group,trim,55.5,.007,edge,31,.015,.08);
  for(const z of [limits.minZ,limits.maxZ]){
    block(group,rail,57,1.13,z,54,.08,.08);
    block(group,rail,57,.43,z,54,.08,.08);
    for(let x=31;x<=84;x+=3)block(group,rail,x,.65,z,.12,1.3,.12);
  }
  block(group,rail,limits.maxX,1.13,0,.08,.08,62);
  block(group,rail,limits.maxX,.43,0,.08,.08,62);
  for(let z=-30;z<=31;z+=3)block(group,rail,limits.maxX,.65,z,.12,1.3,.12);
  for(let z=-31;z<=31;z+=3){
    if(Math.abs(z)<12)continue;
    block(group,rail,limits.minX,.65,z,.095,1.3,.105);
    block(group,rail,limits.minX,1.1,z,.08,.09,3.1);
  }
  function sign(text,width,height,parent,x,y,z,rotation){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const g=canvas.getContext('2d');g.fillStyle='#173044';g.fillRect(0,0,512,128);
    g.strokeStyle='#8eb6c9';g.lineWidth=4;g.strokeRect(8,8,496,112);
    g.textAlign='center';g.textBaseline='middle';g.font='800 51px system-ui';g.fillStyle='#f0f6fb';g.fillText(text,256,65,460);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const board=mesh(parent,new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture}),[x,y,z],[1,1,1]);board.rotation.y=rotation;
    return board;
  }
  for(const room of rooms){
    const practice=room.key==='ice',lobby=room.key==='lobby',tint=practice?ice:lobby?brick:shop;
    block(group,practice?ice:floor,room.x,.005,room.z,room.w,.02,room.d);
    for(const part of roomWalls(room)){
      block(group,tint,part.x,room.roof/2,part.z,part.w,room.roof,part.d);
      block(group,trim,part.x,practice?.74:room.roof-.22,part.z,part.w+.025,.14,part.d+.025);
      if(!practice)block(group,dark,part.x,.12,part.z,part.w+.04,.24,part.d+.04);
    }
    if(practice){
      for(const x of [71,76,81])block(group,trim,x,.018,0,.11,.008,14.6);
      const dot=mesh(group,new THREE.RingGeometry(1.7,1.76,45),new THREE.MeshBasicMaterial({color:0x496b8f}),[76,.024,0],[1,1,1]);dot.rotation.x=-Math.PI/2;
      sign('PRACTICE ICE',3.3,.82,group,68.76,2.04,0,-Math.PI/2);
      for(const z of [-1.7,1.7])block(group,trim,69,.90,z,.12,1.8,.11);
      continue;
    }
    block(group,roof,room.x,room.roof+.10,room.z,room.w+.45,.20,room.d+.45);
    if(lobby){
      const east=room.x+room.w/2;
      sign('ARENA LOBBY',6.1,1.13,group,east+.17,3.39,0,Math.PI/2);
      for(const z of [-8,-4,4,8]){
        block(group,glass,east+.13,2.27,z,.035,1.43,2.42);
        block(group,rail,east+.16,2.27,z,.04,1.52,.04);
      }
      for(const z of [-1.81,1.81])block(group,trim,east+.13,1.45,z,.19,2.9,.19);
    }else{
      const side=room.opening==='south'?1:-1,front=room.z+side*(room.d/2+.14);
      sign(room.name.toUpperCase(),3.95,.90,group,room.x,2.79,front,side===1?0:Math.PI);
      for(const x of [room.x-4.3,room.x+4.3]){
        block(group,glass,x,1.74,front,2.55,1.28,.047);
        block(group,light,x,2.11,front+side*.027,2.45,.043,.025);
      }
      block(group,trim,room.x,2.3,front,3.75,.13,.42);
    }
  }
  for(const item of furniture){
    const {x,z,w,d,key}=item;
    if(key==='planter'){
      block(group,rail,x,.24,z,w,.48,d);
      for(const dx of [-.68,0,.68])ovalDetail(group,foliage,x+dx,.64,z,.46,.44,.43);
    }else if(key==='bench'){
      block(group,wood,x,.51,z,w,.12,d);
      for(const dx of [-1,1])block(group,rail,x+dx,.25,z,.11,.50,.62);
    }else if(key==='table'){
      block(group,wood,x,.74,z,w,.09,d);
      block(group,rail,x,.36,z,.12,.74,.12);
      for(const dx of [-.38,.38])block(group,light,x+dx,.82,z+.23,.09,.085,.09);
    }else{
      block(group,wood,x,.52,z,w,1.04,d);block(group,trim,x,1.04,z,w+.13,.09,d+.07);
      for(let i=0;i<3;i++)block(group,light,x+(i-1)*w*.26,1.16,z,.20,.17,.20);
    }
  }
  for(const z of [-28,28]){
    for(const x of [44,64,80]){
      block(group,rail,x,1.55,z,.15,3.10,.15);
      block(group,light,x,3.16,z,.54,.13,.37);
    }
  }
  const staff=stations.filter(stop=>stop.key!=='match').map((stop,i)=>{
    const person=skater({color:[0x326487,0x5b713f,0x884e39,0x575175][i],trim:0xd5dfe5,number:i+1,variant:i+1,portrait:true});
    person.model.position.set(stop.x,.02,stop.z);
    group.add(person.model);
    return person;
  });
  return {setVenue({lon,lat},color){
    trim.color.set(color).lerp(new THREE.Color(0x21465d),.42);
    const style=lon<-108?2:lat<46.1?1:0;
    scenery.forEach((district,index)=>{district.visible=index===style;});
  },draw(time){
    staff.forEach((person,i)=>{
      person.model.rotation.y=[.42,-.26,2.65,4.25][i];
      animateAthlete(person,time,0,i);
    });
  }};
}
export function createRinkView(canvas) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.45));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.21;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  const drawGlobe=globeView();
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x101e2c);scene.fog=new THREE.FogExp2(0x101e2c,.013);
  const ambient=new THREE.HemisphereLight(0xe7f3ff,0x78818e,2.2);scene.add(ambient);
  const skylight=new THREE.DirectionalLight(0xeaf8ff,2.6);skylight.position.set(-7,14,7);scene.add(skylight);
  const world=new THREE.Group();scene.add(world);const {crowd,entryGate}=buildArena(world);
  const concourse=new THREE.Group();world.add(concourse);
  const campus=buildCampus(concourse);
  const hallStripe=material(0x7aa9bd);
  const arenaBanner=document.createElement('canvas');arenaBanner.width=768;arenaBanner.height=256;
  const bannerInk=arenaBanner.getContext('2d'),bannerTexture=new THREE.CanvasTexture(arenaBanner);
  bannerTexture.colorSpace=THREE.SRGBColorSpace;
  const banner=mesh(concourse,new THREE.PlaneGeometry(3.60,1.20),new THREE.MeshBasicMaterial({map:bannerTexture}),[29.46,2.43,0],[1,1,1]);
  banner.rotation.y=Math.PI/2;
  for(const z of [-1.39,1.39])block(concourse,hallStripe,30.77,.65,z,.09,1.30,.12);
  block(concourse,hallStripe,30.80,.009,0,.34,.007,2.79);
  function setVenue(venue,color){
    bannerInk.fillStyle='#132638';bannerInk.fillRect(0,0,768,256);bannerInk.strokeStyle=color;bannerInk.lineWidth=12;
    bannerInk.strokeRect(12,12,744,232);bannerInk.textAlign='center';bannerInk.fillStyle='#dcecf3';
    bannerInk.font='900 56px system-ui';bannerInk.fillText(venue.name,384,110,690);
    bannerInk.fillStyle=color;bannerInk.font='800 35px system-ui';bannerInk.fillText(venue.city.toUpperCase(),384,179,680);
    hallStripe.color.set(color);campus.setVenue(venue,color);bannerTexture.needsUpdate=true;
  }
  const explorer=skater({color:0x161f43,trim:0xaad7f2,number:9,goalie:false,portrait:true});
  concourse.add(explorer.model);
  const rinkGroup=new THREE.Group();scene.add(rinkGroup);
  const models=Array.from({length:12},(_,index)=>{
    const home=index<6,role=index%6;
    const model=skater({color:home?0x245f96:0xa0394d,trim:home?0xaad7f2:0xf0b695,
      number:role===5?1:9+role,goalie:role===5,variant:home?role:(role+2)%6});
    rinkGroup.add(model.model);return model;
  });
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.23,.08,12,28),material(0x082e8a,.36));
  ring.rotation.x=-Math.PI/2;rinkGroup.add(ring);
  const indicators=[0x3dd8fd,0xffca74].map(color=>{
    const shape=new THREE.Mesh(new THREE.RingGeometry(.53,.60,44),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
    shape.rotation.x=-Math.PI/2;rinkGroup.add(shape);return shape;
  });
  const photoStage=new THREE.Group();scene.add(photoStage);
  const studioModels=athleteFaces.map((_,variant)=>{
    const avatar=skater({color:0x161f43,trim:0xaad7f2,number:9,goalie:variant===5,variant,portrait:true});
    photoStage.add(avatar.model);
    avatar.studioLighting=true;castModelShadows(avatar.model);
    animateAthlete(avatar,0,0,variant,true);
    return avatar;
  });
  const floorTexture=paintIce();floorTexture.repeat.set(.23,.45);floorTexture.offset.set(.46,.37);
  const floor=mesh(photoStage,new THREE.PlaneGeometry(14,11),new THREE.MeshStandardMaterial({map:floorTexture,roughness:.48,metalness:.07}),[0,-.016,0],[1,1,1]);
  floor.rotation.x=-Math.PI/2;
  floor.receiveShadow=true;
  const dasher=material(0xb1c6d4), rail=material(0x183a5c), kick=material(0xc6ab53);
  block(photoStage,dasher,0,.42,-4.35,14,.84,.21);
  block(photoStage,rail,0,.83,-4.24,14,.05,.06);
  block(photoStage,kick,0,.05,-4.24,14,.09,.06);
  for(const x of [-5.6,-2.8,0,2.8,5.6])block(photoStage,rail,x,1.50,-4.32,.029,1.27,.052);
  const studioGlass=new THREE.MeshPhysicalMaterial({color:0xa3c4e8,transparent:true,opacity:.09,roughness:.36,depthWrite:false});
  for(const x of [-4.2,-1.4,1.4,4.2])block(photoStage,studioGlass,x,1.51,-4.34,2.77,1.33,.023);
  const galleryWall=material(0x25364b),galleryLights=new THREE.MeshBasicMaterial({color:0xa6c9e4});
  block(photoStage,galleryWall,0,2.15,-5.8,14,4.3,.18);
  for(const y of [1.19,1.55,1.92,2.31]){
    block(photoStage,rail,0,y,-5.54,14,.16,.24);
    for(let x=-5;x<=5;x+=2)block(photoStage,galleryLights,x,y+.04,-5.409,.38,.027,.011);
  }
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
  const shade=shadowCanvas.getContext('2d'),shadowFade=shade.createRadialGradient(32,32,0,32,32,30);
  shadowFade.addColorStop(0,'#17283d93');shadowFade.addColorStop(1,'#17283d00');shade.fillStyle=shadowFade;shade.fillRect(0,0,64,64);
  const shadow=mesh(photoStage,new THREE.PlaneGeometry(.85,.53),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),[0,-.012,.12],[1,1,1]);
  shadow.rotation.x=-Math.PI/2;
  const explorerShadow=mesh(concourse,new THREE.PlaneGeometry(.81,.61),shadow.material,[0,.037,0],[1,1,1]);
  explorerShadow.rotation.x=-Math.PI/2;
  const rim=new THREE.DirectionalLight(0xc4d6fb,2.3);rim.position.set(-3,4,-5);photoStage.add(rim);
  const fill=new THREE.DirectionalLight(0xdce8fc,.85);fill.position.set(3,2,4);photoStage.add(fill);
  const key=new THREE.DirectionalLight(0xffeee7,3.1);key.position.set(-2.3,4.2,3.8);photoStage.add(key);
  key.target.position.set(0,.86,0);photoStage.add(key.target);
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-1.4,right:1.4,top:1.55,bottom:-1.55,near:.2,far:9});
  key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.0002;key.shadow.normalBias=.004;key.shadow.radius=2.4;key.shadow.intensity=.64;
  const camera=new THREE.PerspectiveCamera(40,1,.1,140),ray=new THREE.Raycaster(),point=new THREE.Vector3();
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const look=new THREE.Vector3();
  let width=0,height=0,lastKitIdentity;
  function updateKit(body,identity){
    const preset=Number.isInteger(identity.facePreset)&&athleteFaces[identity.facePreset]?identity.facePreset:body.baseFace;
    if(body.preset!==preset){body.equipFace(preset);if(body.studioLighting)castModelShadows(body.root);}
    paintJersey(body,identity.color,identity.accent,identity.pattern);
    body.model.scale.y=identity.height/170;
    body.pants.color.set(identity.pants||0x172039);body.boots.color.set(identity.skates||0x13171c);
    body.gloves.color.set(identity.gloves||0x13171c);body.helmet.color.set(identity.helmet||(body.goalie?0xeaf4f6:0x15191e));
    body.skin.color.set(identity.skin||body.face.skin);
    const hair=body.setHair(identity.hairStyle,identity.hair);
    if(body.studioLighting)castModelShadows(hair);
    paintMarkings(body,identity.number,identity.jerseyName,identity.logo,identity.logoSide);
  }
  function draw(game,mode,time,identity,turn=0,zoom=1,pose='Ready',showPadding=false){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    if(mode==='globe'){drawGlobe(renderer,w/h,game);return;}
    const showModel=mode==='studio'||mode==='profile'||mode==='players';
    ambient.intensity=showModel?1.06:2.2;
    skylight.intensity=showModel?.22:2.6;
    world.visible=!showModel;rinkGroup.visible=!showModel;photoStage.visible=showModel;
    const visiting=mode==='explore'||mode==='travel';
    concourse.visible=visiting||mode==='venues';explorer.model.visible=mode==='explore'&&!game?.firstPerson;
    explorerShadow.visible=explorer.model.visible;
    entryGate.visible=!visiting;
    scene.background.setHex(showModel?0x24394c:visiting?0x8caab7:0x101e2c);
    scene.fog.color.copy(scene.background);
    if(showModel){
      const variant=mode==='players'?(identity.variant??0):0;
      const studio=studioModels[variant];
      studioModels.forEach((avatar,index)=>{avatar.model.visible=index===variant;});
      if(identity!==lastKitIdentity){updateKit(studio,identity);lastKitIdentity=identity;}
      studio.shirt.visible=!showPadding;
      studio.back.visible=!showPadding;studio.front.visible=!showPadding&&studio.hasFrontMark;
      studio.trousers.forEach(piece=>{piece.visible=!showPadding;});
      studio.underLayers.forEach(layer=>{layer.visible=showPadding;});
      studio.model.rotation.y=turn;
      studio.model.position.y=studio.relaxed?-.012:0;
      shadow.position.x=Math.sin(turn)*.11;shadow.position.z=Math.cos(turn)*.11;
      animateAthlete(studio,time,pose==='Skate'?.65:0,variant,pose!=='Skate');
      studio.head.rotation.x=0;
      if(pose==='Look around')studio.head.rotation.set(Math.sin(time*1.9)*.038,Math.sin(time*1.15)*.38,0);
      if(pose==='Ring control')poseUpper(studio,.18,Math.sin(time*3.8)*.22,Math.sin(time*3.8)*.08);
      if(pose==='Victory'){
        const hop=Math.pow(Math.max(0,Math.sin(time*5)),2);
        studio.model.position.y+=hop*.13;
        poseUpper(studio,-hop*.17,Math.sin(time*5)*.19,-hop*.085);
      }
      const fit=Math.max(1,.78/camera.aspect);
      const taller=Math.max(1,identity.height/170);
      camera.position.set(.11*fit,1.10*taller,3.21*fit*taller/zoom);look.set(studio.relaxed?0:.16,.92*taller,.10);
    }else if(visiting){
      rinkGroup.visible=false;
      campus.draw(time);
      if(mode==='explore'){
        if(explorer.identity!==identity){updateKit(explorer,identity);explorer.identity=identity;}
        explorer.model.position.set(game.x,.006+Math.abs(Math.sin(game.stride))*game.effort*.06,game.z);
        explorer.model.rotation.y=game.yaw;walkAthlete(explorer,time,game);
        explorerShadow.position.set(game.x,.037,game.z);
        const dx=Math.sin(game.cameraYaw),dz=Math.cos(game.cameraYaw);
        let distance=5.2;
        for(let probe=.5;probe<distance;probe+=.32){
          if(blocksPoint(game.x-dx*probe,game.z-dz*probe,.16)){distance=Math.max(.38,probe-.28);break;}
        }
        if(game.firstPerson){
          camera.position.set(game.x,1.68,game.z);look.set(game.x+dx*6,1.68+game.pitch*6,game.z+dz*6);
        }else{
          const lift=Math.min(3.11,1.62+distance*.27+game.pitch*1.5);
          camera.position.set(game.x-dx*distance,lift,game.z-dz*distance);look.set(game.x+dx*2.4,1.01+game.pitch*1.25,game.z+dz*2.4);
        }
      }else{
        const t=1-Math.pow(1-Math.min(1,time),2);
        camera.position.set(84-5*t,18-13*t,26-15*t);look.set(48,1.3,0);
      }
    }else{
      crowd.draw(time,Boolean(game?.stoppage&&game.notice.endsWith('scores!')));
      if(game){
        game.athletes.forEach((p,index)=>{
          const avatar=models[index];
          avatar.model.position.set(p.x,.01,p.z);
          avatar.model.rotation.y=p.yaw;
          avatar.model.rotation.z=Math.sin(time*5+index)*.035*p.effort;
          animateAthlete(avatar,time,p.effort,index);
        });
        ring.position.set(game.ring.x,.096,game.ring.z);
        indicators.forEach((disc,index)=>{
          const current=game.athletes[game.controls[index]];
          disc.visible=!!current;
          if(current)disc.position.set(current.x,.018,current.z);
        });
      }
      const fit=Math.max(1,1.29/camera.aspect);
      if(mode==='home'){
        const bob=Math.sin(time*.13);
        camera.position.set(-9+bob*7,19*fit,26*fit);look.set(3,0,0);
      }else if(mode==='venues'){
        const angle = [
          { orbit: .3, distance: 37, height: 26 },
          { orbit: 1.25, distance: 24, height: 4.2 },
          { orbit: Math.PI, distance: 24, height: 7 },
          { orbit: -1.55, distance: 31, height: 14 }
        ][pose] || { orbit: .3, distance: 37, height: 26 };
        const orbit = angle.orbit + turn;
        camera.position.set(Math.sin(orbit) * angle.distance * fit, angle.height * fit, Math.cos(orbit) * angle.distance * fit);
        look.set(0, 0, 0);
      }else{
        camera.position.set(0,36*fit/zoom,39*fit/zoom);look.set(0,0,0);
      }
    }
    camera.lookAt(look);renderer.render(scene,camera);
  }
  function setTeams(home,away,identity){
    for(let i=0;i<models.length;i++){
      const team=i<6?home:away, avatar=models[i];
      if(avatar.preset!==avatar.baseFace)avatar.equipFace(avatar.baseFace);
      avatar.model.scale.y=1;
      paintJersey(avatar,team.color);
      avatar.kitTrim.color.set(team.trim);
      avatar.pants.color.set(i%6===5?0x1d2634:0x172039);
      avatar.boots.color.set(0x13171c);avatar.gloves.color.set(0x13171c);
      avatar.helmet.color.set(avatar.goalie?0xeaf4f6:0x15191e);
      avatar.skin.color.set(avatar.face.skin);avatar.setHair(undefined);
      paintMarkings(avatar,i%6===5?1:9+i%6);
      if(i===0&&identity)updateKit(avatar,identity);
    }
  }
  function aim(clientX,clientY){
    const rect=canvas.getBoundingClientRect();
    ray.setFromCamera({x:2*(clientX-rect.left)/rect.width-1,y:1-2*(clientY-rect.top)/rect.height},camera);
    return ray.ray.intersectPlane(plane,point)?{x:point.x,z:point.z}:null;
  }
  return {draw,setTeams,setVenue,aim};
}




