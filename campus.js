export const limits={minX:30,maxX:84,minZ:-31,maxZ:31};
export const spawn={x:76,z:11};
export const rooms=[
  {key:'lobby',name:'Arena lobby',x:35.55,z:0,w:11.1,d:23,opening:'east',door:0,roof:4.8},
  {key:'cafe',name:'Café',x:56.8,z:-19,w:13,d:11,opening:'south',door:56.8,roof:3.65},
  {key:'gear',name:'Pro shop',x:56.8,z:19,w:13,d:11,opening:'north',door:56.8,roof:3.65},
  {key:'ice',name:'Practice ice',x:76,z:0,w:14,d:15,opening:'west',door:0,roof:.78},
];
export const stations=[
  {key:'match',room:'lobby',name:'Rink gate',x:30.7,z:0},
  {key:'desk',room:'lobby',name:'Arena desk',x:38.2,z:-7.2},
  {key:'cafe',room:'cafe',name:'Café counter',x:58.7,z:-22.4},
  {key:'gear',room:'gear',name:'Pro shop counter',x:58.7,z:22.4},
  {key:'training',room:'ice',name:'Practice coach',x:79,z:-3.8},
];
export const furniture=[
  {key:'desk',x:37.97,z:-8.25,w:3.5,d:.9},
  {key:'coffee',x:55.4,z:-22.25,w:4.0,d:.95},
  {key:'gear',x:55.4,z:22.25,w:4.0,d:.95},
  {key:'table',x:60.1,z:-17.6,w:1.5,d:1.35},
  {key:'table',x:53.7,z:-17.6,w:1.5,d:1.35},
  {key:'display',x:61.2,z:17.7,w:1.5,d:1.4},
  {key:'display',x:53.3,z:17.7,w:1.5,d:1.4},
  {key:'planter',x:53.2,z:-6.2,w:2.4,d:1.5},
  {key:'planter',x:53.2,z:6.2,w:2.4,d:1.5},
  {key:'bench',x:61.6,z:-8.6,w:2.8,d:1.05},
  {key:'bench',x:61.6,z:8.6,w:2.8,d:1.05},
];
const doorWidth=3.5,th=.24;
export function roomWalls(room){
  const {x,z,w,d,opening,door}=room;
  const west=x-w/2,east=x+w/2,north=z-d/2,south=z+d/2;
  const entries=[];
  const walls=(side,axis,fixed,lo,hi)=>{
    const points=side===opening||room.key==='lobby'&&side==='west'?[[lo,door-doorWidth/2],[door+doorWidth/2,hi]]:[[lo,hi]];
    for(const [a,b] of points){
      if(b<=a)continue;
      entries.push(axis==='x'?{x:(a+b)/2,z:fixed,w:b-a,d:th}:{x:fixed,z:(a+b)/2,w:th,d:b-a});
    }
  };
  walls('west','z',west,north,south);walls('east','z',east,north,south);
  walls('north','x',north,west,east);walls('south','x',south,west,east);
  return entries;
}
export const obstacles=[
  ...rooms.flatMap(roomWalls),...furniture,
  ...stations.filter(station=>station.key!=='match').map(({x,z})=>({x,z,w:.72,d:.72})),
];
export function blocksPoint(x,z,pad=.31){
  return x<limits.minX+pad||x>limits.maxX-pad||z<limits.minZ+pad||z>limits.maxZ-pad||
    obstacles.some(box=>Math.abs(x-box.x)<box.w/2+pad&&Math.abs(z-box.z)<box.d/2+pad);
}
export function moveWalker(walk,dx,dz){
  if(!blocksPoint(walk.x+dx,walk.z))walk.x+=dx;
  if(!blocksPoint(walk.x,walk.z+dz))walk.z+=dz;
}
export function roomAt({x,z}){
  return rooms.find(room=>Math.abs(room.x-x)<room.w/2&&Math.abs(room.z-z)<room.d/2);
}
export function nearestStation(walk){
  const room=roomAt(walk);
  let best=null,min=2.65;
  for(const station of stations){
    if(station.room!==room?.key)continue;
    const gap=Math.hypot(walk.x-station.x,walk.z-station.z);
    if(gap<min){min=gap;best=station;}
  }
  return best;
}
