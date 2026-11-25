import * as THREE from '/vendor/three.module.js';
export function buildCrowd(seats) {
  const group = new THREE.Group();
  const count = seats.length;
  const shape = new THREE.SphereGeometry(1,10,7);
  const material = new THREE.MeshStandardMaterial({roughness:.85});
  const series = [
    ['torso',1],['head',1],['hair',1],['ears',2],['eyes',2],['irises',2],['nose',1],['mouth',1],
    ['upperArms',2],['forearms',2],['hands',2],['thighs',2],['shins',2],['shoes',2],
  ];
  const batches = Object.fromEntries(series.map(([part,instances]) => {
    const batch = new THREE.InstancedMesh(shape,material,count*instances);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.frustumCulled=false;
    group.add(batch);
    return [part,batch];
  }));
  const posterGeometry=new THREE.PlaneGeometry(.89,.49);
  const posterMaps=[
    ['NORTHERN','CIRCUIT', '#143b32','#ffe2b3'],
    ['RINGETTE','LET’S GO!','#143957','#e3efff'],
    ['LET’S PLAY','RINGETTE','#2e295b','#fbf18c'],
  ].map(([name,tag,bg,ink])=>{
    const canvas=document.createElement('canvas');
    canvas.width=512; canvas.height=288;
    const context=canvas.getContext('2d');
    context.fillStyle=bg;context.fillRect(0,0,512,288);
    context.strokeStyle=ink;context.lineWidth=9;context.strokeRect(17,17,478,254);
    context.textAlign='center';context.fillStyle=ink;
    context.font='bold 45px system-ui';context.fillText(name,256,117,435);
    context.font='bold 63px system-ui';context.fillText(tag,256,207,435);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace=THREE.SRGBColorSpace;
    return map;
  });
  const posterMaterials=posterMaps.map(map=>new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));
  const palettes = {
    tops:[0x376481,0xe2dfd6,0xa34b53,0x527e75,0xb18a55,0x624a87,0x2d303d],
    skin:[0xb88065,0xdab195,0x815740,0xbf9477,0x69473d,0xe6ae96],
    hair:[0x252126,0x695143,0x442d25,0x7f4b30,0x463e39,0xb39570],
    pants:[0x263145,0x445665,0x373940,0x34475a],
  };
  const colour = new THREE.Color();
  function tint(part,i,value) { batches[part].setColorAt(i,colour.setHex(value)); }
  const fans=seats.map(({x,y,z,side,tier,seat},index)=>{
    const variant=seat+9+tier*5+(side>0?7:0);
    const top=palettes.tops[variant%palettes.tops.length], skin=palettes.skin[variant%palettes.skin.length];
    const pants=palettes.pants[variant%palettes.pants.length];
    tint('torso',index,top);tint('head',index,skin);tint('nose',index,skin);
    tint('hair',index,palettes.hair[(variant+tier)%palettes.hair.length]);tint('mouth',index,0x643b32);
    for(let limb=0;limb<2;limb++){
      const id=index*2+limb;
      tint('ears',id,skin);tint('eyes',id,0xefece2);tint('irises',id,0x312830);
      tint('upperArms',id,top);tint('forearms',id,(variant%3===0)?top:skin);tint('hands',id,skin);
      tint('thighs',id,pants);tint('shins',id,pants);tint('shoes',id,(variant%4===0)?0xd2cbd0:0x202a30);
    }
    const poster=tier<6 && (seat+13*tier+side)%13===0
      ? new THREE.Mesh(posterGeometry,posterMaterials[variant%3]) : null;
    if(poster)group.add(poster);
    return {x,y,z,yaw:side>0?Math.PI:0,phase:variant*1.11,size:.90+(variant%7)*.026,poster,
      active:variant%4===0};
  });
  const base=new THREE.Object3D(), piece=new THREE.Object3D();
  let lastFrame=-1, lastCheer=false;
  function part(name,index,x,y,z,w,h,d,pitch=0,roll=0) {
    piece.position.set(x,y,z);piece.scale.set(w,h,d);piece.rotation.set(pitch,0,roll);
    piece.updateMatrix();
    piece.matrix.premultiply(base.matrix);
    batches[name].setMatrixAt(index,piece.matrix);
  }
  function draw(time,cheer=false) {
    const frame=Math.floor(time*24);
    if(frame===lastFrame && cheer===lastCheer)return;
    lastFrame=frame;lastCheer=cheer;
    fans.forEach((fan,index)=>{
      const wave=Math.sin(time*(cheer?3.4:1.8)+fan.phase);
      const uplift=fan.poster ? (.045+wave*.065) : 0;
      base.position.set(fan.x,fan.y,fan.z);
      base.rotation.set(0,fan.yaw,fan.active?wave*.037:0);base.scale.setScalar(fan.size);
      base.updateMatrix();
      part('torso',index,0,.5,0,.222,.32,.135);
      part('head',index,0,.90,.021,.111,.143,.108);
      part('hair',index,0,.974,-.003,.117,.08,.112);
      part('nose',index,0,.895,.129,.025,.033,.021);
      part('mouth',index,0,.841,.117,.042,cheer&&fan.active ? .014 : .009,.011);
      for(const [limb,side] of [[0,-1],[1,1]]){
        const id=index*2+limb;
        part('ears',id,side*.105,.901,.025,.025,.041,.024);
        part('eyes',id,side*.042,.929,.111,.024,.017,.014);
        part('irises',id,side*.041,.929,.123,.009,.011,.005);
        part('thighs',id,side*.107,.253,.103,.078,.202,.082,1.25);
        part('shins',id,side*.107,.071,.255,.062,.177,.064,-.20);
        part('shoes',id,side*.107,-.09,.31,.078,.05,.125);
        const raised=fan.poster || (cheer&&fan.active);
        part('upperArms',id,side*.243,.637,raised ? .095 : .012,.066,.145,.071,raised?-.79:.27,-side*.29);
        if(fan.poster){
          part('forearms',id,side*.32,.79+uplift*.5,.20,.057,.151,.053,-.77,-side*.29);
          part('hands',id,side*.38,.914+uplift,.33,.047,.073,.035);
        }else{
          part('forearms',id,side*.239,raised ? .815+wave*.055 : .449,.152,.057,.143,.053,raised?-1.80:1.1);
          part('hands',id,side*.226,raised ? .949+wave*.09 : .408,.265,.043,.069,.037);
        }
      }
      if(fan.poster){
        fan.poster.position.set(0,.994+uplift,.355).applyMatrix4(base.matrix);
        fan.poster.rotation.set(-.1,fan.yaw,wave*.09);
        fan.poster.scale.setScalar(fan.size);
      }
    });
    Object.values(batches).forEach(batch=>{batch.instanceMatrix.needsUpdate=true;});
  }
  draw(0);
  return {group,draw,dispose(){
    group.parent?.remove(group);
    Object.values(batches).forEach(batch=>batch.dispose?.());
    shape.dispose();material.dispose();posterGeometry.dispose();
    posterMaterials.forEach(value=>value.dispose());posterMaps.forEach(value=>value.dispose());
  }};
}

