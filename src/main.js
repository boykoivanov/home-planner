import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { EMBEDDED_TEXTURES } from './embedded-textures.js';
import './style.css';
window.__GLTFExporter = GLTFExporter;
(function(){
'use strict';
const $ = s => document.querySelector(s);
let W = 267, D = 156;               // current bathroom floor size, set by useRoom()
let H = 280;                        // ceiling height of the current bathroom
const doorH = () => Math.min(205, H-8);
const PX = 3;                       // texture pixels per cm
const LS_KEY = 'bathroom-tile-planner.v1';

/* ---------------- bathrooms ----------------
   Per bathroom: x runs from the Left wall (0) to the Right wall (W); z from the Back wall (0) to the Entrance wall (D); y up.
   Each surface has local (u,v) coords and a list of rects [u0,v0,u1,v1]. */
let SURF = [];
const PLANE_NUM = {};
let SECTIONS = [], SECT = {};
let R = null;                       // current bathroom definition

// Entrance wall seen from inside: u runs from the Right wall (x=W) towards the Left wall (x=0)
function entranceRects(){
  const DH=doorH(), u0=W-R.door.x1, u1=W-R.door.x0;
  return [[0,0,u0,H],[u0,DH,u1,H],[u1,0,W,H]].filter(r=>r[3]>r[1] && r[2]>r[0]);
}
const wallE = ()=>({id:'entrance', sec:'entrance', plane:'entrance', O:[W,0,D], U:[-1,0,0], V:[0,1,0], N:[0,0,-1], rects:entranceRects()});

const ROOMS = {
  b1:{
    id:'b1', name:'Bathroom 1', W:267, D:156,
    door:{x0:10, x1:100, hinge:'x0'}, mirrorX:45, castSecs:['box'],
    sections:[
      {id:'entrance', name:'Entrance wall', note:'267 cm, door opening left out', split:true},
      {id:'left', name:'Left wall', note:'156 cm, radiator behind the door', split:true},
      {id:'right_shower', name:'Right wall', note:'156 cm, all inside the shower', split:true},
      {id:'back_sink', name:'Back wall, sink and mirror', note:'90 cm', split:true},
      {id:'back_shower', name:'Back wall, inside the shower', note:'87 cm', split:true},
      {id:'box', name:'Toilet box', note:'90 cm, floor to ceiling, front and sides', split:true},
      {id:'floor', name:'Floor', note:'outside the shower, 180 × 156 cm', split:false},
      {id:'floor_shower', name:'Shower floor', note:'87 × 156 cm, up to the Entrance wall', split:false}
    ],
    surfaces(){ return [
      wallE(),
      {id:'left', sec:'left', plane:'left', O:[0,0,D], U:[0,0,-1], V:[0,1,0], N:[1,0,0], rects:[[0,0,D,H]]},
      {id:'right', sec:'right_shower', plane:'right', O:[W,0,0], U:[0,0,1], V:[0,1,0], N:[-1,0,0], rects:[[0,0,D,H]]},
      {id:'back_sink', sec:'back_sink', plane:'back', O:[0,0,0], U:[1,0,0], V:[0,1,0], N:[0,0,1], rects:[[0,0,90,H]]},
      {id:'back_sh', sec:'back_shower', plane:'back', O:[0,0,0], U:[1,0,0], V:[0,1,0], N:[0,0,1], rects:[[180,0,W,H]]},
      {id:'box_front', sec:'box', plane:'box_front', O:[0,0,12], U:[1,0,0], V:[0,1,0], N:[0,0,1], rects:[[90,0,180,H]]},
      {id:'box_sl', sec:'box', plane:'box_sl', O:[90,0,0], U:[0,0,1], V:[0,1,0], N:[-1,0,0], rects:[[0,0,12,H]]},
      {id:'box_sr', sec:'box', plane:'box_sr', O:[180,0,12], U:[0,0,-1], V:[0,1,0], N:[1,0,0], rects:[[0,0,12,H]]},
      {id:'floor', sec:'floor', plane:'floor', O:[0,0,D], U:[1,0,0], V:[0,0,-1], N:[0,1,0], rects:[[0,0,180,D]]},
      {id:'floor_sh', sec:'floor_shower', plane:'floor', O:[0,0,D], U:[1,0,0], V:[0,0,-1], N:[0,1,0], rects:[[180,0,W,D]]}
    ]; },
    views:{ door:{pos:[55,165,140], yaw:-0.32, pitch:-0.12}, sink:{pos:[95,162,118], yaw:0.42, pitch:-0.18}, shower:{pos:[236,165,48], yaw:2.35, pitch:-0.1} },
    fixtures(F){
      const {box,cyl}=F, {mCeramic,mWood,mChrome,mMirror,mGlass,mRad,mDark,mLamp,mInner}=F.m;
      // vanity, basin, mirror (mirror and light stay below the ceiling)
      F.label('Vanity');
      box(80,38,46,mWood,45,64,23); box(82,3,48,mCeramic,45,84.5,24);
      cyl(20,17,13,mCeramic,45,92.5,25,1.25,.9); cyl(18,18,.4,mInner,45,99.1,25,1.25,.9).castShadow=false;
      cyl(1.6,1.6,18,mChrome,45,108,6); box(2.4,2.4,12,mChrome,45,116,11);
      const mTop=Math.min(190,H-12), mBot=110;
      F.label('Mirror'); if(mTop-mBot>15) box(70,mTop-mBot,1.4,mMirror,45,(mTop+mBot)/2,.8);
      F.label('MirrorLamp'); box(60,2.5,5,mLamp,45,Math.min(194,H-6),3).castShadow=false;
      // wall-hung toilet on the floor-to-ceiling box
      F.label('Toilet');
      cyl(18,15,16,mCeramic,135,34,39,1,1.5); cyl(18.4,18.4,2.2,mCeramic,135,43.1,39,1,1.5);
      F.label('FlushPlate'); box(24,16,1,mCeramic,135,100,12.5); box(10,12,.6,mChrome,129.4,100,13.2); box(10,12,.6,mChrome,140.6,100,13.2);
      // walk-in shower along the Right wall: one fixed glass wall on the toilet side
      F.label('ShowerGlass');
      const GH=Math.min(200,H-6);
      box(.8,GH,78,mGlass,180.4,GH/2+1,51).castShadow=false;
      box(1.2,GH,1.6,mChrome,180.4,GH/2+1,12.8); box(2,2,78,mChrome,180.4,GH+1,51);
      F.label('ShowerHead');
      const hy=Math.min(212,H-14);
      box(2,2,32,mChrome,223.5,hy+1.5,16); cyl(13,13,1.4,mChrome,223.5,hy,32);
      box(16,7,4,mChrome,223.5,110,2); box(70,.3,6,mDark,223.5,.15,6).castShadow=false;
      // ladder radiator on the Left wall, behind the door
      F.label('Radiator');
      box(2.6,120,2.6,mRad,5.5,85,85); box(2.6,120,2.6,mRad,5.5,85,135);
      for(let y=30;y<=140;y+=9) box(1.8,1.8,50,mRad,5.5,y,110);
    },
    info(){ return {
      door:{ widthCm:90, heightCm:doorH(), fromLeftWallCm:10, opensInward:true, hingeSide:'left wall' },
      shower:{ type:'walk-in', alongWall:'right', widthCm:87, depthCm:D, glassWallCm:78, entryCm:66 },
      toiletBox:{ widthCm:90, depthCm:12, heightCm:H } }; },
    assumptions(){ return [
      'Door opening 90 × 205 cm, 10 cm from the Left wall (lower when the ceiling is under 213 cm), no window.',
      'Walk-in shower 87 cm wide along the whole Right wall, from the Back wall to the Entrance wall: no door, a 78 cm fixed glass wall on the toilet side, a 66 cm entry next to the Entrance wall, tiled floor with a linear drain.',
      'Toilet box 90 cm wide and 12 cm deep, running from floor to ceiling, tiled on the front and both sides.',
      'Walls are tiled behind the vanity, mirror and radiator; the ceiling is painted, with six recessed spots in two rows of three.',
      'Tiling starts at the floor and from the left corner of each wall; floor tiling starts at the door.' ]; }
  },
  b2:{
    id:'b2', name:'Bathroom 2', W:310, D:145,
    door:{x0:205, x1:295, hinge:'x1'}, mirrorX:255,
    variants:{ walkin:'Walk-in, fixed glass', folding:'Folding glass wall, full length' },
    glassOptions:[78,68,58,48],     // walk-in glass length above the toilet box; 20 cm less below it; entry = 118 − length castSecs:['vent','pipe_box','wc_box'],
    sections:[
      {id:'entrance', name:'Entrance wall', note:'310 cm, door opening left out, radiator left of the door', split:true},
      {id:'left', name:'Left wall', note:'119 cm, inside the shower', split:true},
      {id:'right', name:'Right wall', note:'145 cm', split:true},
      {id:'back_shower', name:'Back wall, inside the shower', note:'90 cm, shower pipe wall', split:true},
      {id:'vent', name:'Ventilation box', note:'24 × 26 cm in the shower corner, floor to ceiling', split:true},
      {id:'pipe_box', name:'Toilet pipe box', note:'86 cm wide, 27 cm deep, floor to ceiling', split:true},
      {id:'wc_box', name:'Toilet box', note:'86 cm wide, 20 cm deep, 90 cm high', split:false},
      {id:'back_sink', name:'Back wall, sink and mirror', note:'110 cm', split:true},
      {id:'floor', name:'Floor', note:'outside the shower', split:false},
      {id:'floor_shower', name:'Shower floor', note:'114 × 145 cm, up to the Entrance wall', split:false}
    ],
    surfaces(){ return [
      wallE(),
      {id:'left', sec:'left', plane:'left', O:[0,0,D], U:[0,0,-1], V:[0,1,0], N:[1,0,0], rects:[[0,0,119,H]]},
      {id:'right', sec:'right', plane:'right', O:[W,0,0], U:[0,0,1], V:[0,1,0], N:[-1,0,0], rects:[[0,0,D,H]]},
      {id:'back_sh', sec:'back_shower', plane:'back', O:[0,0,0], U:[1,0,0], V:[0,1,0], N:[0,0,1], rects:[[24,0,114,H]]},
      {id:'back_sink', sec:'back_sink', plane:'back', O:[0,0,0], U:[1,0,0], V:[0,1,0], N:[0,0,1], rects:[[200,0,W,H]]},
      {id:'vent_front', sec:'vent', plane:'vent_front', O:[0,0,26], U:[1,0,0], V:[0,1,0], N:[0,0,1], rects:[[0,0,24,H]]},
      {id:'vent_side', sec:'vent', plane:'vent_side', O:[24,0,26], U:[0,0,-1], V:[0,1,0], N:[1,0,0], rects:[[0,0,26,H]]},
      {id:'pipe_front', sec:'pipe_box', plane:'pipe_front', O:[0,0,27], U:[1,0,0], V:[0,1,0], N:[0,0,1], rects:[[114,90,200,H]]},
      {id:'pipe_l', sec:'pipe_box', plane:'side_l', O:[114,0,0], U:[0,0,1], V:[0,1,0], N:[-1,0,0], rects:[[0,0,27,H]]},
      {id:'pipe_r', sec:'pipe_box', plane:'side_r', O:[200,0,47], U:[0,0,-1], V:[0,1,0], N:[1,0,0], rects:[[20,0,47,H]]},
      {id:'wc_front', sec:'wc_box', plane:'wc_front', O:[0,0,47], U:[1,0,0], V:[0,1,0], N:[0,0,1], rects:[[114,0,200,90]]},
      {id:'wc_top', sec:'wc_box', plane:'wc_top', O:[0,90,47], U:[1,0,0], V:[0,0,-1], N:[0,1,0], rects:[[114,0,200,20]]},
      {id:'wc_l', sec:'wc_box', plane:'side_l', O:[114,0,0], U:[0,0,1], V:[0,1,0], N:[-1,0,0], rects:[[27,0,47,90]]},
      {id:'wc_r', sec:'wc_box', plane:'side_r', O:[200,0,47], U:[0,0,-1], V:[0,1,0], N:[1,0,0], rects:[[0,0,20,90]]},
      {id:'floor', sec:'floor', plane:'floor', O:[0,0,D], U:[1,0,0], V:[0,0,-1], N:[0,1,0], rects:[[114,0,200,98],[200,0,W,D]]},
      {id:'floor_sh', sec:'floor_shower', plane:'floor', O:[0,0,D], U:[1,0,0], V:[0,0,-1], N:[0,1,0], rects:[[0,0,114,119],[24,119,114,D]]}
    ]; },
    views:{ door:{pos:[250,165,128], yaw:0.35, pitch:-0.12}, sink:{pos:[235,162,100], yaw:-0.25, pitch:-0.18}, shower:{pos:[55,165,70], yaw:-2.3, pitch:-0.1} },
    fixtures(F){
      const {box,cyl}=F, {mCeramic,mWood,mChrome,mMirror,mGlass,mRad,mDark,mLamp,mInner}=F.m;
      // vanity, basin, mirror opposite the door
      F.label('Vanity');
      box(80,38,46,mWood,255,64,23); box(82,3,48,mCeramic,255,84.5,24);
      cyl(20,17,13,mCeramic,255,92.5,25,1.25,.9); cyl(18,18,.4,mInner,255,99.1,25,1.25,.9).castShadow=false;
      cyl(1.6,1.6,18,mChrome,255,108,6); box(2.4,2.4,12,mChrome,255,116,11);
      const mTop=Math.min(190,H-12), mBot=110;
      F.label('Mirror'); if(mTop-mBot>15) box(70,mTop-mBot,1.4,mMirror,255,(mTop+mBot)/2,.8);
      F.label('MirrorLamp'); box(60,2.5,5,mLamp,255,Math.min(194,H-6),3).castShadow=false;
      // wall-hung toilet on the 90 cm toilet box, flush plate on top of the box
      F.label('Toilet');
      cyl(18,15,16,mCeramic,157,34,74,1,1.5); cyl(18.4,18.4,2.2,mCeramic,157,43.1,74,1,1.5);
      F.label('FlushPlate'); box(24,1,16,mCeramic,157,90.5,37); box(10,.6,12,mChrome,151.4,91.1,37); box(10,.6,12,mChrome,162.6,91.1,37);
      F.label('ShowerGlass');
      const GH=Math.min(200,H-6);
      if(F.variant==='folding'){
        // the whole glass side is one folding glass wall (like the Armonia Duo Nero), black profiles, no rail:
        // panel A is hinged on a wall profile at the Entrance wall, panel B hangs on panel A and reaches the pipe box.
        // Opening, they fold into the shower towards the Entrance wall, one over the other, away from the shower pipe.
        const mBlack=F.m.mBlack, z0=27.8, z1=144.2, PW=(z1-z0)/2;   // 2 × 58.2 cm
        box(1.6,GH,1.8,mBlack,113.6,GH/2+1,z1+.4);              // wall hinge profile on the Entrance wall
        box(1.2,GH,1.6,mBlack,113.6,GH/2+1,z0-.4);              // closing profile on the pipe box
        F.label('ShowerDoor_PanelA'); const pa=F.group(113.6,0,z1);
        box(.8,GH,PW,mGlass,0,GH/2+1,-PW/2,pa).castShadow=false;
        box(1.4,GH,1.4,mBlack,0,GH/2+1,-PW,pa);                // black hinge profile between the panels
        box(1.2,1.6,PW,mBlack,0,GH+1.4,-PW/2,pa); box(1.2,1.6,PW,mBlack,0,1.8,-PW/2,pa);   // thin top and bottom frame
        F.label('ShowerDoor_PanelB'); const pb=F.group(0,0,-PW,pa);
        box(.8,GH,PW,mGlass,0,GH/2+1,-PW/2,pb).castShadow=false;
        box(1.2,1.6,PW,mBlack,0,GH+1.4,-PW/2,pb); box(1.2,1.6,PW,mBlack,0,1.8,-PW/2,pb);
        box(1.4,GH,1.4,mBlack,0,GH/2+1,-PW,pb);                // free edge profile, closes on the pipe box
        box(2.2,30,1.4,mBlack,-1.4,105,-PW+3,pb); box(2.2,30,1.4,mBlack,1.4,105,-PW+3,pb);   // handles at the free edge, both sides
        F.anim(t=>{ const a=1.5*t; pa.rotation.y=a; pb.rotation.y=-2*a; });   // a > 0 folds into the shower; the pack ends at the Entrance wall
      } else {
        // walk-in: fixed glass on the toilet side, cut around the toilet box so no glass hides behind it.
        // Above the box (90 cm) it reaches the pipe box: 78 cm wide; below it starts at the toilet box front: 58 cm wide.
        const top=GH+1, BH=90, hu=top-BH, GL=F.glass||78, ge=27+GL;  // GL: glass length above the toilet box, ge: where the glass ends
        box(.8,hu,GL,mGlass,113.6,BH+hu/2,27+GL/2).castShadow=false;           // upper part, pipe box to the entry
        box(.8,BH-1,GL-20,mGlass,113.6,1+(BH-1)/2,(47+ge)/2).castShadow=false;  // lower part, toilet box front to the entry
        box(1.2,hu,1.6,mChrome,113.6,BH+hu/2,27.8);                     // fixing profile on the pipe box
        box(1.2,BH-1,1.6,mChrome,113.6,1+(BH-1)/2,47.8);                // fixing profile on the toilet box front corner
        box(1.2,1.6,20,mChrome,113.6,BH+.8,37.8);                       // profile along the top edge of the toilet box
        box(2,2,GL,mChrome,113.6,top,27+GL/2);
      }
      F.label('ShowerHead');
      const hy=Math.min(212,H-14);
      box(2,2,32,mChrome,69,hy+1.5,16); cyl(13,13,1.4,mChrome,69,hy,32);
      box(16,7,4,mChrome,69,110,2); box(64,.3,6,mDark,69,.15,6).castShadow=false;
      // ladder radiator on the Entrance wall, left of the door, facing the toilet
      F.label('Radiator');
      const rz=D-5.5;
      box(2.6,120,2.6,mRad,132,85,rz); box(2.6,120,2.6,mRad,182,85,rz);
      for(let y=30;y<=140;y+=9) box(50,1.8,1.8,mRad,157,y,rz);
    },
    info(){ return {
      door:{ widthCm:90, heightCm:doorH(), fromRightWallCm:15, opensInward:true, hingeSide:'right wall' },
      shower: (state.rooms.b2.variant==='folding')
        ? { type:'folding glass wall', model:'Armonia Duo Nero style', profiles:'black', alongWall:'left', widthCm:114, depthCm:D, doorCm:118, glassPanels:2, panelCm:58, rail:false, hingedOn:'entrance wall', foldsTowards:'entrance wall', foldsInto:'shower', clearOpeningCm:110 }
        : { type:'walk-in', alongWall:'left', widthCm:114, depthCm:D, glassWallCm:(state.rooms.b2.glass||78), glassBelowToiletBoxCm:(state.rooms.b2.glass||78)-20, glassCutAt:'toilet box, 90 cm', fixedTo:['pipe box','toilet box'], entryCm:118-(state.rooms.b2.glass||78) },
      ventilationBox:{ widthCm:24, depthCm:26, heightCm:H, corner:'back left' },
      pipeBox:{ widthCm:86, depthCm:27, heightCm:H },
      toiletBox:{ widthCm:86, depthCm:20, heightCm:90 } }; },
    assumptions(){ return [
      'Door opening 90 × 205 cm, 15 cm from the Right wall, hinged on that side and opening inward; no window.',
      state.rooms.b2.variant==='folding'
        ? 'Shower along the Left wall, 114 × 145 cm up to the Entrance wall, closed by one folding glass wall with black profiles and no rail (like the Armonia Duo Nero): two 58 cm panels, hinged on the Entrance wall. They fold one over the other into the shower, towards the Entrance wall and away from the shower pipe, leaving about 110 cm clear.'
        : `Walk-in shower along the Left wall, 114 × 145 cm up to the Entrance wall. The fixed glass on the toilet side is cut around the toilet box and fixed to both boxes: ${state.rooms.b2.glass||78} cm wide above 90 cm (from the pipe box), ${(state.rooms.b2.glass||78)-20} cm below (from the toilet box front). That leaves a ${118-(state.rooms.b2.glass||78)} cm entry next to the Entrance wall.`,
      'Ventilation box 24 × 26 cm in the back left corner and toilet pipe box 86 × 27 cm, both floor to ceiling. Toilet box 86 × 20 cm and 90 cm high in front of the pipe box, with the flush plate on top.',
      'Ladder radiator on the Entrance wall, left of the door, facing the toilet.',
      'The floor under the boxes is not tiled; the ceiling is painted, with six recessed spots in two rows of three.' ]; }
  }
};
const ROOM_ORDER = ['b1','b2'];
function useRoom(id){ R=ROOMS[id]||ROOMS.b1; W=R.W; D=R.D; SECTIONS=R.sections; SECT=Object.fromEntries(SECTIONS.map(s=>[s.id,s])); }
function makeSurf(){
  SURF = R.surfaces().concat([{id:'ceiling', sec:null, plane:'ceiling', O:[0,H,0], U:[1,0,0], V:[0,0,1], N:[0,-1,0], rects:[[0,0,W,D]], paintOnly:true}]);
  SURF.forEach((s,i)=>{ if(!(s.plane in PLANE_NUM)) PLANE_NUM[s.plane] = Object.keys(PLANE_NUM).length*7919+13; });
}

const LAYOUTS = {grid:'Straight grid', half:'Half offset (brick)', third:'One-third offset', half_v:'Vertical, half offset'};
const LOOKS = {plain:'Plain glaze', concrete:'Concrete / stone', marble:'Marble veins', zellige:'Handmade (zellige)', wood:'Wood planks', relief:'Relief motif', patchwork:'Patchwork motifs'};
const FINISH = {matte:0.85, satin:0.55, gloss:0.22};

/* ---------------- state ---------------- */
function full(t){ return {lower:t, upper:'', split:120}; }
function defaultState(){
  return {
    v:8,
    tiles:SHOP_TILES(),
    rooms:{ b1:{height:280, combos:[DEFAULT_COMBO('b1')].concat(SHOP_COMBOS()), active:'c0'}, b2:{height:280, variant:'folding', combos:[DEFAULT_COMBO('b2')].concat(SHOP_COMBOS_B2()), active:'c0'} },
    activeRoom:'b1'
  };
}
function SHOP_TILES(){ return [
  {id:'wall_main', brand:'Cersanit', model:'Dekorina Turquoise', shopCode:'258341', variations:'mirror', specs:{type:'Wall tile (faience)', use:'Indoor', surface:'Matte', color:'Turquoise', quality:'1st'}, name:'Wall main', w:60, h:29.7, grout:2, groutColor:'#e9ebe8', layout:'grid', finish:'matte', color:'#5f878f', look:'plain', boxPcs:0, boxM2:1.25, price:19.74, currency:'EUR', priceUnit:'box', priceCheckedAt:'2026-10-01', waste:10, images:[], texFile:'wall-main',
   url:'https://praktiker.bg/bg/Stenni-plochki-i-dekoraciya/FAYaNS-CERSANIT-DEKORINA-TURQUOISE-29-7X60-CM/p/258341'},
  {id:'wall_decor', brand:'Cersanit', model:'Dekorina White Matt (decor)', shopCode:'243213', variations:'none', specs:{type:'Wall decor tile', use:'Indoor', surface:'Matte, motifs', color:'White with teal patchwork', thicknessMm:8.5, rectified:false, frostResistant:false, toneVariation:'V0', quality:'1st', soldPer:'piece'}, name:'Wall decor', w:60, h:29.7, grout:2, groutColor:'#e9ebe8', layout:'grid', finish:'matte', color:'#efeee9', look:'relief', boxPcs:1, boxM2:0, price:9.79, currency:'EUR', priceUnit:'box', priceCheckedAt:'2026-10-01', waste:10, images:[], texFile:'wall-decor',
   url:'https://praktiker.bg/bg/Stenni-plochki-i-dekoraciya/DEKOR-CERSANIT-DEKORINA-WHITE-MATT-29-7X60-SM/p/243213'},
  {id:'floor', brand:'Cersanit', model:'G1807 Cream (Starwood)', shopCode:'142803', variations:'mirror', specs:{type:'Porcelain floor tile', use:'Indoor and outdoor', surface:'Matte, wood look', color:'Light beige', thicknessMm:8, rectified:true, frostResistant:true, wearClass:'PEI 4', slipRating:'R9', quality:'1st'}, name:'Floor', w:59.8, h:18.5, grout:2, groutColor:'#b9ab95', layout:'third', finish:'matte', color:'#d4c1a0', look:'wood', boxPcs:0, boxM2:1.0, price:15.33, currency:'EUR', priceUnit:'box', priceCheckedAt:'2026-10-01', waste:10, images:[], texFile:'floor',
   url:'https://praktiker.bg/bg/Granitogres/GRANITOGRES-CERSANIT-G1807-CREAM-18-5X59-8-CM/p/142803'},
  {id:'floor_decor', brand:'Cersanit', model:'Patchwork Multicolor', shopCode:'147835', variations:'rotate', specs:{type:'Porcelain floor tile', use:'Indoor and outdoor', surface:'Matte, patchwork print', color:'Multicolour', thicknessMm:8, rectified:true, frostResistant:true, wearClass:'PEI 4', slipRating:'R9', toneVariation:'V1', quality:'1st'}, name:'Floor decor', w:59.8, h:59.8, grout:2, groutColor:'#9c9a94', layout:'grid', finish:'matte', color:'#e9e1cf', look:'patchwork', boxPcs:3, boxM2:0, price:20.78, currency:'EUR', priceUnit:'box', priceCheckedAt:'2026-10-01', waste:10, images:[], texFile:'floor-decor',
   url:'https://praktiker.bg/bg/Granitogres/GRANITOGRES-CERSANIT-PATCHWORK-MCOLOR-59-8X59-8-CM/p/147835'}
]; }
function DEFAULT_COMBO(rid){
  const assign={};
  ROOMS[rid].sections.forEach(sec=>{ assign[sec.id]=full(sec.id==='floor'||sec.id==='floor_shower' ? 'floor_decor' : 'wall_main'); });
  return {id:'c0', name:'Wall main + Floor decor', paint:'#ecebe6', assign};
}
function SHOP_COMBOS_B2(){
  const main={entrance:full('wall_main'), left:full('wall_main'), right:full('wall_main')};
  const walls1 = Object.assign({}, main, {back_shower:full('wall_main'), vent:full('wall_main'), pipe_box:full('wall_main'), wc_box:full('wall_main'), back_sink:full('wall_decor')});
  const walls2 = Object.assign({}, main, {back_shower:full('wall_decor'), vent:full('wall_decor'), pipe_box:full('wall_decor'), wc_box:full('wall_decor'), back_sink:full('wall_decor')});
  const mk=(id,name,w,f)=>({id, name, paint:'#ecebe6', assign:Object.assign(JSON.parse(JSON.stringify(w)), {floor:full(f), floor_shower:full(f)})});
  return [
    mk('c1','Decor behind sink + Floor', walls1, 'floor'),
    mk('c2','Decor behind sink + Floor decor', walls1, 'floor_decor'),
    mk('c3','Decor back wall + Floor', walls2, 'floor'),
    mk('c4','Decor back wall + Floor decor', walls2, 'floor_decor')
  ];
}
function SHOP_COMBOS(){
  const walls1 = {entrance:full('wall_main'), left:full('wall_main'), right_shower:full('wall_main'),
                  back_sink:full('wall_decor'), back_shower:full('wall_main'), box:full('wall_main')};
  const walls2 = {entrance:full('wall_main'), left:full('wall_main'), right_shower:full('wall_main'),
                  back_sink:full('wall_decor'), back_shower:full('wall_decor'), box:full('wall_decor')};
  const mk=(id,name,w,f)=>({id, name, paint:'#ecebe6', assign:Object.assign(JSON.parse(JSON.stringify(w)), {floor:full(f), floor_shower:full(f)})});
  return [
    mk('c1','Decor behind sink + Floor', walls1, 'floor'),
    mk('c2','Decor behind sink + Floor decor', walls1, 'floor_decor'),
    mk('c3','Decor back wall + Floor', walls2, 'floor'),
    mk('c4','Decor back wall + Floor decor', walls2, 'floor_decor')
  ];
}
let state = null;
try { const raw = localStorage.getItem(LS_KEY); if(raw) state = JSON.parse(raw); } catch(e) { state = null; }
if(!state || !Array.isArray(state.tiles) || !((Array.isArray(state.combos) && state.combos.length) || state.rooms)) state = defaultState();
// v1 → v2: toilet box now runs floor to ceiling, so the wall above it is gone; it takes over that wall's upper tile
if((state.v||1) < 2){
  state.combos.forEach(c=>{ const bt=c.assign.back_toilet, bx=c.assign.box;
    if(bt && bx){ bx.upper=bt.upper||''; bx.split=bt.split||120; if(bx.upper===bx.lower) bx.upper=''; }
    delete c.assign.back_toilet; });
  state.v = 2;
}
// v2 → v3: replace the placeholder tiles and combinations with the shop tiles; keep anything the person added
if(state.v < 3){
  const placeholder=new Set(['t1','t2','t3','t4']);
  const keepTiles=state.tiles.filter(t=>!placeholder.has(t.id));
  const keepCombos=state.combos.filter(c=>c.id!=='A' && c.id!=='B');
  keepCombos.forEach(c=>Object.values(c.assign).forEach(a=>{ if(placeholder.has(a.lower)) a.lower='paint'; if(placeholder.has(a.upper)) a.upper='paint'; }));
  state.tiles=SHOP_TILES().concat(keepTiles);
  state.combos=SHOP_COMBOS().concat(keepCombos);
  state.active='c1'; state.v=3;
}
// v3 → v4: the shower runs to the Entrance wall, so the Right wall is one surface; ceiling height becomes a setting
if(state.v < 4){
  state.combos.forEach(c=>{ delete c.assign.right_room; });
  state.height = state.height || 280; state.v = 4;
}
// v4 → v5: shop details (brand, product code, specs) and face variations on the shop tiles
if(state.v < 5){
  const shop=Object.fromEntries(SHOP_TILES().map(t=>[t.id,t]));
  state.tiles.forEach(t=>{ const d=shop[t.id]; if(!d) return;
    ['brand','model','shopCode','variations','specs','currency','priceUnit','priceCheckedAt'].forEach(k=>{ if(t[k]===undefined) t[k]=d[k]; }); });
  state.v = 5;
}
// v5 → v6: bathrooms; what existed so far becomes Bathroom 1
if(state.v < 6){
  state.rooms = { b1:{height:state.height||280, combos:state.combos, active:state.active} };
  delete state.combos; delete state.active; delete state.height;
  state.activeRoom='b1'; state.v=6;
}
if(!state.rooms.b1) state.rooms.b1={height:280, combos:SHOP_COMBOS(), active:'c1'};
if(!state.rooms.b2) state.rooms.b2={height:280, combos:SHOP_COMBOS_B2(), active:'c1'};
// v6 → v7: "Wall main + Floor decor" becomes the first and selected combination in both bathrooms
if(state.v < 7){
  ['b1','b2'].forEach(rid=>{ const rs=state.rooms[rid];
    if(!rs.combos.some(c=>c.id==='c0')) rs.combos.unshift(DEFAULT_COMBO(rid));
    rs.active='c0'; });
  state.v=7;
}
// v7 → v8: Bathroom 2 gets the sliding shower door variant, shown first
if(state.v < 8){ if(!state.rooms.b2.variant) state.rooms.b2.variant='folding'; state.v=8; }
// the sliding shower door was replaced by a folding one
if(state.rooms.b2.variant==='sliding') state.rooms.b2.variant='folding';
if(!ROOMS[state.activeRoom]) state.activeRoom='b1';
useRoom(state.activeRoom);
H = Math.max(150, Math.min(400, Math.round(+state.rooms[R.id].height||280)));
makeSurf();

let saveT = 0;
function save(){ clearTimeout(saveT); saveT = setTimeout(()=>{ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){} }, 250); }
const tileById = id => state.tiles.find(t=>t.id===id);
const RS = () => state.rooms[R.id];
const combo = () => RS().combos.find(c=>c.id===RS().active) || RS().combos[0];
const allCombos = () => Object.values(state.rooms).flatMap(r=>r.combos);
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);

/* ---------------- image store (IndexedDB) ---------------- */
const imgs = {};       // id -> HTMLImageElement (loaded)
const memData = {};    // id -> dataURL fallback when IndexedDB is unavailable
let dbp = null;
function db(){
  if(dbp) return dbp;
  dbp = new Promise(res=>{
    try{
      const r = indexedDB.open('bathroom-tile-planner', 1);
      r.onupgradeneeded = ()=> r.result.createObjectStore('img');
      r.onsuccess = ()=> res(r.result);
      r.onerror = ()=> res(null);
    }catch(e){ res(null); }
  });
  return dbp;
}
async function idbPut(k,v){ memData[k]=v; const d=await db(); if(!d) return; try{ await new Promise((ok,no)=>{ const tx=d.transaction('img','readwrite'); tx.objectStore('img').put(v,k); tx.oncomplete=ok; tx.onerror=no; }); }catch(e){} }
async function idbGet(k){ if(memData[k]) return memData[k]; const d=await db(); if(!d) return null; try{ return await new Promise(ok=>{ const r=d.transaction('img').objectStore('img').get(k); r.onsuccess=()=>ok(r.result||null); r.onerror=()=>ok(null); }); }catch(e){ return null; } }
async function idbDel(k){ delete memData[k]; const d=await db(); if(!d) return; try{ d.transaction('img','readwrite').objectStore('img').delete(k); }catch(e){} }
function loadImg(id, src){ return new Promise(ok=>{ const im=new Image(); im.onload=()=>{ imgs[id]=im; ok(im); }; im.onerror=()=>ok(null); im.src=src; }); }
async function loadAllImages(){
  let any=false;
  for(const t of state.tiles){ for(const id of t.images){ if(imgs[id]) continue; const src=await idbGet(id); if(src){ await loadImg(id,src); any=true; } } }
  // texture files: textures/<name>.jpg (also -2, -3 … for face variations), served next to the page
  for(const t of state.tiles){
    if(!t.texFile || fileImgs[t.id]) continue;
    const found=[];
    for(let k=1;k<=6;k++){
      const base='textures/'+t.texFile+(k>1?'-'+k:'');
      let im=null;
      for(const ext of ['jpg','png','webp']){ im=await loadImg('file:'+base+'.'+ext, base+'.'+ext); if(im) break; }
      if(!im) break; found.push(im);
    }
    if(found.length){ fileImgs[t.id]= found.length===1 ? variantsOf(t,found[0]) : found; fileImgs[t.id].base=found; any=true; continue; }
    if(EMBED[t.texFile]){ const im=await loadImg('embed:'+t.texFile, EMBED[t.texFile]); if(im){ fileImgs[t.id]=variantsOf(t,im); fileImgs[t.id].base=[im]; any=true; } }
  }
  if(any) refresh(false);
}
function readFile(f){ return new Promise((ok,no)=>{ const r=new FileReader(); r.onload=()=>ok(r.result); r.onerror=no; r.readAsDataURL(f); }); }
function downscale(src, max){ return new Promise(ok=>{ const im=new Image(); im.onload=()=>{ const s=Math.min(1, max/Math.max(im.width,im.height)); const c=document.createElement('canvas'); c.width=Math.round(im.width*s); c.height=Math.round(im.height*s); c.getContext('2d').drawImage(im,0,0,c.width,c.height); ok(c.toDataURL('image/jpeg',0.9)); }; im.onerror=()=>ok(null); im.src=src; }); }

/* ---------------- helpers ---------------- */
function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function hashStr(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function hash3(a,b,c){ let h=Math.imul(a|0,374761393) ^ Math.imul(b|0,668265263) ^ Math.imul(c|0,1274126177); h=Math.imul(h^(h>>>13),1274126177); return (h^(h>>>16))>>>0; }
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const bboxOf = rs => rs.reduce((b,r)=>[Math.min(b[0],r[0]),Math.min(b[1],r[1]),Math.max(b[2],r[2]),Math.max(b[3],r[3])],[1e9,1e9,-1e9,-1e9]);
function clipRects(rs,vA,vB){ return rs.map(r=>[r[0],Math.max(r[1],vA),r[2],Math.min(r[3],vB)]).filter(r=>r[3]-r[1]>1e-6 && r[2]-r[0]>1e-6); }
function interArea(x,y,w,h,rs){ let a=0; for(const r of rs){ const ix=Math.min(x+w,r[2])-Math.max(x,r[0]); const iy=Math.min(y+h,r[3])-Math.max(y,r[1]); if(ix>0&&iy>0) a+=ix*iy; } return a; }
const esc = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n,d=2) => n.toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d});

function zonesFor(s, c){
  if(s.paintOnly) return [{tile:'paint', vA:-1e9, vB:1e9, vFrom:0}];
  const sec = SECT[s.sec]; const a = c.assign[s.sec] || {lower:'paint', upper:'', split:120};
  if(!sec.split || !a.upper || a.upper===a.lower) return [{tile:a.lower, vA:-1e9, vB:1e9, vFrom:0}];
  const sp = clamp(+a.split||0, 0, H);
  return [{tile:a.lower, vA:-1e9, vB:sp, vFrom:0}, {tile:a.upper, vA:sp, vB:1e9, vFrom:sp}];
}

// iterate tile cells covering bbox; cb(row, col, x, y) with tile bottom-left at (x,y)
function forCells(t, bb, vFrom, cb){
  const g=(+t.grout||0)/10, pw=t.w+g, ph=t.h+g;
  if(t.layout==='half_v'){
    const c0=Math.floor(bb[0]/pw)-1, c1=Math.ceil(bb[2]/pw)+1;
    for(let c=c0;c<=c1;c++){
      const off=(((c%2)+2)%2)*0.5*ph;
      const r0=Math.floor((bb[1]-vFrom-off)/ph)-1, r1=Math.ceil((bb[3]-vFrom-off)/ph)+1;
      for(let r=r0;r<=r1;r++) cb(r,c,c*pw,vFrom+off+r*ph);
    }
    return;
  }
  const sh = t.layout==='half'?0.5 : t.layout==='third'?1/3 : 0;
  const r0=Math.floor((bb[1]-vFrom)/ph)-1, r1=Math.ceil((bb[3]-vFrom)/ph)+1;
  for(let r=r0;r<=r1;r++){
    const off=(((r*sh)%1)+1)%1*pw;
    const c0=Math.floor((bb[0]-off)/pw)-1, c1=Math.ceil((bb[2]-off)/pw)+1;
    for(let c=c0;c<=c1;c++) cb(r,c,off+c*pw,vFrom+r*ph);
  }
}

/* ---------------- tile faces ---------------- */
const faceCache = {};
function procFaces(t){
  const key=[t.color,t.look,t.w,t.h].join('|');
  if(faceCache[key]) return faceCache[key];
  const arr=[]; const L=256;
  const fw = t.w>=t.h ? L : Math.max(8,Math.round(L*t.w/t.h));
  const fh = t.w>=t.h ? Math.max(8,Math.round(L*t.h/t.w)) : L;
  for(let v=0; v<4; v++){
    const c=document.createElement('canvas'); c.width=fw; c.height=fh;
    const x=c.getContext('2d'); const rnd=mulberry(hashStr(key)+v*977);
    x.fillStyle=t.color; x.fillRect(0,0,fw,fh);
    if(t.look==='concrete'){
      for(let i=0;i<7;i++){ const gx=rnd()*fw, gy=rnd()*fh, gr=20+rnd()*90; const g=x.createRadialGradient(gx,gy,0,gx,gy,gr);
        const dark=rnd()<.5; g.addColorStop(0, dark?'rgba(0,0,0,.07)':'rgba(255,255,255,.08)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,fw,fh); }
      for(let i=0;i<fw*fh/30;i++){ x.fillStyle=rnd()<.5?'rgba(0,0,0,.09)':'rgba(255,255,255,.08)'; x.fillRect(rnd()*fw,rnd()*fh,1+rnd()*1.2,1+rnd()*1.2); }
    } else if(t.look==='marble'){
      for(let k=0;k<5;k++){
        x.beginPath(); const sx=rnd()*fw, sy=0, ex=rnd()*fw, ey=fh;
        x.moveTo(sx,sy); x.bezierCurveTo(rnd()*fw,rnd()*fh,rnd()*fw,rnd()*fh,ex,ey);
        const wide=k<2; x.lineWidth = wide? 6+rnd()*8 : 0.6+rnd()*1.8;
        x.strokeStyle = wide? 'rgba(150,145,138,.07)' : `rgba(118,112,104,${.18+rnd()*.25})`; x.stroke();
      }
      for(let i=0;i<fw*fh/60;i++){ x.fillStyle='rgba(120,115,108,.05)'; x.fillRect(rnd()*fw,rnd()*fh,1,1); }
    } else if(t.look==='zellige'){
      const g=x.createRadialGradient(fw*(.3+rnd()*.4),fh*(.3+rnd()*.4),2,fw/2,fh/2,Math.max(fw,fh)*.7);
      g.addColorStop(0,'rgba(255,255,255,.13)'); g.addColorStop(.6,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.18)');
      x.fillStyle=g; x.fillRect(0,0,fw,fh);
      for(let i=0;i<6;i++){ x.fillStyle=`rgba(0,0,0,${.03+rnd()*.05})`; x.beginPath(); x.ellipse(rnd()*fw,rnd()*fh,4+rnd()*fw*.2,3+rnd()*fh*.3,rnd()*3,0,7); x.fill(); }
    } else if(t.look==='wood'){
      const along = fw>=fh;  // grain runs along the long side
      const L2 = along?fw:fh, S2 = along?fh:fw;
      x.save(); if(!along){ x.translate(fw,0); x.rotate(Math.PI/2); }
      for(let i=0;i<70;i++){
        const y0=rnd()*S2, amp=1+rnd()*4, ph=rnd()*6, fq=(1+rnd()*2)/L2*Math.PI*2;
        x.beginPath(); for(let xx=0;xx<=L2;xx+=8){ const yy=y0+Math.sin(xx*fq+ph)*amp; xx?x.lineTo(xx,yy):x.moveTo(xx,yy); }
        const dark=rnd()<.7; x.lineWidth=.4+rnd()*1.8;
        x.strokeStyle= dark?`rgba(110,80,45,${.05+rnd()*.12})`:`rgba(255,250,235,${.06+rnd()*.1})`; x.stroke();
      }
      if(v%2===0){ const kx=L2*(.2+rnd()*.6), ky=S2*(.3+rnd()*.4);
        for(let r=1;r<6;r++){ x.beginPath(); x.ellipse(kx,ky,r*3.2,r*1.4,0,0,7); x.strokeStyle=`rgba(100,70,40,${.18-r*.025})`; x.lineWidth=1; x.stroke(); } }
      const g=x.createLinearGradient(0,0,L2,0); g.addColorStop(0,`rgba(0,0,0,${rnd()*.06})`); g.addColorStop(1,`rgba(255,255,255,${rnd()*.06})`);
      x.fillStyle=g; x.fillRect(0,0,L2,S2);
      x.restore();
    } else if(t.look==='relief'){
      const cs=fh/2;   // motif cell
      const motif=(dx,dy,col,lw)=>{
        x.strokeStyle=col; x.lineWidth=lw;
        for(let cy=cs/2; cy<fh; cy+=cs) for(let cx=cs/2; cx<fw+cs; cx+=cs){
          const px=cx+dx, py=cy+dy;
          x.beginPath(); x.arc(px,py,cs*.36,0,7); x.stroke();
          x.beginPath(); x.moveTo(px,py-cs*.5); x.lineTo(px+cs*.5,py); x.lineTo(px,py+cs*.5); x.lineTo(px-cs*.5,py); x.closePath(); x.stroke();
          x.beginPath(); x.arc(px,py,cs*.1,0,7); x.stroke();
        }
      };
      motif(1.4,1.4,'rgba(0,0,0,.13)',2.2);
      motif(-1,-1,'rgba(255,255,255,.75)',1.6);
      motif(0,0,'rgba(0,0,0,.035)',1.2);
    } else if(t.look==='patchwork'){
      const P=[['#2f4a6b','#ece3d0'],['#b5643c','#efe6d4'],['#c9a24a','#33475f'],['#8b8f8d','#f0e9da'],['#4f8f8e','#efe6d4'],['#ece3d0','#2f4a6b'],['#ece3d0','#b5643c'],['#6d7f93','#e9dfc8']];
      const n=3, cs=fw/n;
      for(let gy=0;gy<n;gy++) for(let gx=0;gx<n;gx++){
        const [bg,fg]=P[Math.floor(rnd()*P.length)], m=Math.floor(rnd()*5);
        const ox=gx*cs, oy=gy*cs, c=cs/2;
        x.save(); x.beginPath(); x.rect(ox,oy,cs,cs); x.clip();
        x.fillStyle=bg; x.fillRect(ox,oy,cs,cs); x.fillStyle=fg; x.strokeStyle=fg;
        x.translate(ox+c,oy+c);
        if(m===0){ x.beginPath(); x.arc(0,0,cs*.38,0,7); x.fill(); x.fillStyle=bg; x.beginPath(); x.arc(0,0,cs*.22,0,7); x.fill();
          x.fillStyle=fg; for(let k=0;k<8;k++){ x.save(); x.rotate(k*Math.PI/4); x.beginPath(); x.ellipse(0,cs*.3,cs*.05,cs*.1,0,0,7); x.fill(); x.restore(); } }
        else if(m===1){ x.rotate(Math.PI/4); x.fillRect(-cs*.33,-cs*.33,cs*.66,cs*.66); x.fillStyle=bg; x.fillRect(-cs*.18,-cs*.18,cs*.36,cs*.36); x.fillStyle=fg; x.fillRect(-cs*.07,-cs*.07,cs*.14,cs*.14); }
        else if(m===2){ [[-c,-c],[c,-c],[c,c],[-c,c]].forEach(([qx,qy])=>{ x.beginPath(); x.arc(qx,qy,cs*.45,0,7); x.fill(); }); x.fillStyle=bg; x.beginPath(); x.arc(0,0,cs*.12,0,7); x.fill(); }
        else if(m===3){ x.beginPath(); for(let k=0;k<16;k++){ const r=k%2?cs*.18:cs*.44, a=k*Math.PI/8; x.lineTo(Math.cos(a)*r,Math.sin(a)*r); } x.closePath(); x.fill(); }
        else { x.lineWidth=cs*.12; x.beginPath(); x.moveTo(-c,0); x.lineTo(c,0); x.moveTo(0,-c); x.lineTo(0,c); x.stroke(); x.lineWidth=cs*.05; x.strokeRect(-cs*.3,-cs*.3,cs*.6,cs*.6); }
        x.restore();
        x.strokeStyle='rgba(0,0,0,.12)'; x.lineWidth=1; x.strokeRect(ox+.5,oy+.5,cs-1,cs-1);
      }
      for(let i=0;i<fw*fh/25;i++){ x.fillStyle=rnd()<.5?'rgba(0,0,0,.05)':'rgba(255,255,255,.06)'; x.fillRect(rnd()*fw,rnd()*fh,1.3,1.3); }
    } else {
      const g=x.createLinearGradient(0,0,fw,fh); g.addColorStop(0,'rgba(255,255,255,.06)'); g.addColorStop(1,'rgba(0,0,0,.035)');
      x.fillStyle=g; x.fillRect(0,0,fw,fh);
    }
    arr.push(c);
  }
  faceCache[key]=arr; return arr;
}
const fileImgs={};  // tile id -> [image] from textures/<name>.jpg next to the page
// photos built into the page (cropped product photos), used when no texture file is found
// FLIP: plain-looking tiles get mirrored copies so neighbouring tiles don't look identical
const FLIP=new Set(['wall-main','floor']);
// ROT: square patterned tiles are laid in four rotations, like on site
const ROT=new Set(['floor-decor']);
function rots(im){ const out=[im]; [1,2,3].forEach(k=>{ const w=im.naturalWidth||im.width, h=im.naturalHeight||im.height; const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); x.translate(w/2,h/2); x.rotate(k*Math.PI/2); x.drawImage(im,-w/2,-h/2); out.push(c); }); return out; }
const variationOf=t=> t.variations || (ROT.has(t.texFile)?'rotate': FLIP.has(t.texFile)?'mirror':'none');
const variantsOf=(t,im)=> variationOf(t)==='rotate'? rots(im) : variationOf(t)==='mirror'? flips(im) : [im];
const varCache=new Map();
function flips(im){ const out=[im]; [[-1,1],[1,-1],[-1,-1]].forEach(([sx,sy])=>{ const c=document.createElement('canvas'); c.width=im.naturalWidth||im.width; c.height=im.naturalHeight||im.height; const x=c.getContext('2d'); x.translate(sx<0?c.width:0, sy<0?c.height:0); x.scale(sx,sy); x.drawImage(im,0,0); out.push(c); }); return out; }
const EMBED=EMBEDDED_TEXTURES;   // see src/embedded-textures.js
function facesOf(t){ const loaded=t.images.map(id=>imgs[id]).filter(Boolean);
  if(loaded.length===1 && variationOf(t)!=='none'){ const k=t.images.find(id=>imgs[id])+'|'+variationOf(t); if(!varCache.has(k)) varCache.set(k,variantsOf(t,loaded[0])); return varCache.get(k); }
  if(loaded.length) return loaded; if(fileImgs[t.id]) return fileImgs[t.id]; return procFaces(t); }
function jitterOf(t){ if(t.images.some(id=>imgs[id]) || fileImgs[t.id]) return 0.012; return {plain:.018, concrete:.035, marble:.015, zellige:.09, wood:.04, relief:.01, patchwork:.02}[t.look]||.02; }

function paintTiles(ctx, t, rs, vFrom, X, Y, seed){
  const zb=bboxOf(rs); const faces=facesOf(t); const jit=jitterOf(t);
  const g=(+t.grout||0)/10; const ins=Math.max(0,(0.34-g)/2);
  forCells(t, zb, vFrom, (r,c,x,y)=>{
    if(x>zb[2] || x+t.w<zb[0] || y>zb[3] || y+t.h<zb[1]) return;
    const h=hash3(r,c,seed);
    const px=X(x+ins), py=Y(y+t.h-ins), pw=(t.w-2*ins)*PX, ph=(t.h-2*ins)*PX;
    ctx.drawImage(faces[h%faces.length], px, py, pw, ph);
    const j=(((h>>>9)%1000)/1000*2-1)*jit;
    if(Math.abs(j)>0.002){ ctx.fillStyle = j>0?`rgba(255,255,255,${j})`:`rgba(0,0,0,${-j})`; ctx.fillRect(px,py,pw,ph); }
  });
}

/* ---------------- quantities ---------------- */
function computeQty(c){
  const per={};
  for(const s of SURF){
    for(const z of zonesFor(s,c)){
      const zr=clipRects(s.rects,z.vA,z.vB); if(!zr.length) continue;
      const area=zr.reduce((a,r)=>a+(r[2]-r[0])*(r[3]-r[1]),0);
      const id = tileById(z.tile) ? z.tile : 'paint';
      const e = per[id] || (per[id]={area:0, cells:new Map(), secs:new Set()});
      e.area += area; if(s.sec) e.secs.add(s.sec);
      if(id==='paint') continue;
      const t=tileById(id);
      forCells(t, bboxOf(zr), z.vFrom, (r,col,x,y)=>{
        const a=interArea(x,y,t.w,t.h,zr);
        if(a>0.05){ const k=s.plane+'|'+z.vFrom+'|'+r+'|'+col; e.cells.set(k,(e.cells.get(k)||0)+a); }
      });
    }
  }
  const out=[];
  for(const [id,e] of Object.entries(per)){
    if(id==='paint'){ out.push({id, paint:true, area:e.area/1e4, secs:e.secs}); continue; }
    const t=tileById(id); const ca=t.w*t.h;
    let fullN=0; e.cells.forEach(a=>{ if(a>=ca-0.02) fullN++; });
    const pieces=e.cells.size;
    const byArea=Math.ceil(e.area/ca*(1+(+t.waste||0)/100));
    const order=byArea;
    let ppb=+t.boxPcs||0; if(!ppb && +t.boxM2>0) ppb=Math.max(1,Math.round(t.boxM2/(ca/1e4)));
    const boxes = ppb? Math.ceil(order/ppb):null;
    out.push({id, t, area:e.area/1e4, pieces, fullN, cut:pieces-fullN, order, orderM2:order*ca/1e4, boxes, ppb, secs:e.secs, cost:(boxes!=null && +t.price>0)? boxes*t.price : null});
  }
  out.sort((a,b)=> (a.paint?1:0)-(b.paint?1:0) || b.area-a.area);
  return out;
}

/* ---------------- three.js scene ---------------- */
const canvas=$('#gl');
let renderer;
try{
  renderer=new THREE.WebGLRenderer({canvas, antialias:true});
}catch(e){
  $('#viewer').insertAdjacentHTML('beforeend','<div class="glerr">This browser could not start 3D graphics (WebGL). The quantities on the right still work.</div>');
}
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x1d2427);
const camera=new THREE.PerspectiveCamera(75,1,1,3000);
let dirty=true;
const surfMesh={};      // surface id -> mesh
const secMeshes={};     // section id -> [mesh]
let doorPivot=new THREE.Group();
const room=new THREE.Group(); scene.add(room);
let buildRoom=()=>{};
const sliders=[];        // shower door animation callbacks (0 closed → 1 open)
let showerOpen=false, showerAmt=0;

if(renderer){
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xffffff,0xb9b1a5,0.5));
  scene.add(new THREE.AmbientLight(0xffffff,0.2));
  const maxAniso=renderer.capabilities.getMaxAnisotropy();

  // materials
  const std=(c,r,mt,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r,metalness:mt||0},o||{}));
  const mCeramic=std(0xf5f5f3,.2), mWood=std(0x9c7a58,.62), mChrome=std(0xc8ccd1,.22,.75), mMirror=std(0xaab9c1,.04,.45),
        mGlass=std(0xbed4d6,.05,0,{transparent:true,opacity:.17,depthWrite:false}), mRad=std(0xf0f0ee,.35),
        mDoor=std(0xe8e4dc,.5), mDark=std(0x3a3f42,.4,.3), mHall=std(0x77756f,.9),
        mLamp=std(0xffffff,.4,0,{emissive:0xfff3dc,emissiveIntensity:.9}), mInner=std(0xe2e4e3,.15), mBlack=std(0x1c1d1f,.45,.4);
  window.__revealMat=std(0xebe8e1,.8);
  // material names carry into Blender
  Object.entries({Ceramic:mCeramic, Wood_Vanity:mWood, Chrome:mChrome, Mirror:mMirror, Glass_Shower:mGlass, Radiator:mRad, Door:mDoor, Drain:mDark, Hallway:mHall, Lamp_Emissive:mLamp, Basin_Inner:mInner, Black_Profile:mBlack}).forEach(([n,m])=>m.name=n);
  window.__revealMat.name='Paint_Reveal';
  // object names carry into Blender: <B1|B2>_<label>[_n]; fixtures set the label with F.label()
  let curLabel='Fixture'; const labelCount={};
  const pref=()=>R.id.toUpperCase();
  function nameIt(o){ const n=(labelCount[curLabel]=(labelCount[curLabel]||0)+1); o.name=`${pref()}_${curLabel}${n>1?'_'+n:''}`; return o; }
  function box(w,h,d,mat,x,y,z,parent){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; (parent||room).add(m); return nameIt(m); }
  function cyl(rt,rb,h,mat,x,y,z,sx,sz){ const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,40),mat); m.position.set(x,y,z); m.scale.set(sx||1,1,sz||1); m.castShadow=true; m.receiveShadow=true; room.add(m); return nameIt(m); }

  buildRoom=function(){
    // clear the previous build
    room.traverse(o=>{
      if(o.geometry) o.geometry.dispose();
      if(o.userData.surf){ o.material.map.dispose(); o.material.dispose(); }
      if(o.shadow && o.shadow.map){ o.shadow.map.dispose(); }
    });
    while(room.children.length) room.remove(room.children[0]);
    for(const k in labelCount) delete labelCount[k];
    for(const k in surfMesh) delete surfMesh[k];
    for(const k in secMeshes) delete secMeshes[k];
    hiSec=null;

    // six recessed ceiling spots (лунички), 2 rows × 3 columns, evenly spaced
    const SPOTS=[];
    [D/4, D*3/4].forEach(z=>[W/6, W/2, W*5/6].forEach(x=>SPOTS.push([x,z])));
    SPOTS.forEach(([x,z])=>{
      curLabel='CeilingSpot_Light';
      const sp=nameIt(new THREE.SpotLight(0xfff3e0,0.24,520,1.05,0.85,1));
      sp.position.set(x,H-1.5,z); sp.target.position.set(x,0,z);
      sp.castShadow=true; sp.shadow.mapSize.set(512,512); sp.shadow.camera.near=2; sp.shadow.camera.far=400; sp.shadow.bias=-0.003; sp.shadow.radius=3;
      room.add(sp); room.add(sp.target);
      curLabel='CeilingSpot'; cyl(4.6,4.6,.5,mCeramic,x,H-.25,z).castShadow=false;
      cyl(3.4,3.4,.6,mLamp,x,H-.35,z).castShadow=false;
    });
    curLabel='MirrorLight'; const mir=nameIt(new THREE.PointLight(0xfff3e2,0.22,320,1.4)); mir.position.set(R.mirrorX,Math.min(196,H-4),24); room.add(mir);
    curLabel='FillLight'; const fill=nameIt(new THREE.PointLight(0xfff6ea,0.18,700,1.2)); fill.position.set(W/2,H-30,D/2); room.add(fill);

    // tiled / painted surfaces
    for(const s of SURF){
      const bb=bboxOf(s.rects); const pos=[],uv=[],idx=[];
      const cr=[s.U[1]*s.V[2]-s.U[2]*s.V[1], s.U[2]*s.V[0]-s.U[0]*s.V[2], s.U[0]*s.V[1]-s.U[1]*s.V[0]];
      const flip=(cr[0]*s.N[0]+cr[1]*s.N[1]+cr[2]*s.N[2])<0;
      s.rects.forEach(r=>{
        const b=pos.length/3;
        [[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]].forEach(([u,v])=>{
          for(let k=0;k<3;k++) pos.push(s.O[k]+s.U[k]*u+s.V[k]*v);
          uv.push((u-bb[0])/(bb[2]-bb[0]), (v-bb[1])/(bb[3]-bb[1]));
        });
        if(flip) idx.push(b,b+2,b+1,b,b+3,b+2); else idx.push(b,b+1,b+2,b,b+2,b+3);
      });
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      geo.setIndex(idx); geo.computeVertexNormals();
      s._cv=document.createElement('canvas');
      const tex=new THREE.CanvasTexture(s._cv); tex.encoding=THREE.sRGBEncoding; tex.anisotropy=maxAniso;
      s._tex=tex;
      const mat=new THREE.MeshStandardMaterial({map:tex, roughness:.6, metalness:0, side:THREE.FrontSide});
      const m=new THREE.Mesh(geo,mat); m.receiveShadow=true; m.castShadow=(R.castSecs||[]).includes(s.sec); m.userData.surf=true;
      const secName=s.sec&&SECT[s.sec]?SECT[s.sec].name:'Ceiling';
      m.name=`${pref()}_Tiles_${s.id}`; mat.name=`${pref()}_Tiles_${s.id}`;
      m.userData.section=s.sec||'ceiling'; m.userData.sectionName=secName;
      room.add(m); surfMesh[s.id]=m;
      if(s.sec){ (secMeshes[s.sec]=secMeshes[s.sec]||[]).push(m); }
    }

    sliders.length=0;
    curLabel='Fixture';
    R.fixtures({box, cyl, label:l=>{ curLabel=l; }, m:{mCeramic,mWood,mChrome,mMirror,mGlass,mRad,mDark,mLamp,mInner,mBlack},
      variant: R.variants ? (RS().variant||'walkin') : null, glass: RS().glass||78,
      group:(x,y,z,parent)=>{ const g=nameIt(new THREE.Group()); g.position.set(x,y,z); (parent||room).add(g); return g; },
      anim:fn=>{ sliders.push(fn); fn(showerAmt); } });
    $('#showerBtn').hidden = !sliders.length;

    // door opening: reveals, casing, hallway, door leaf (opens inward, hinged at R.door.hinge)
    const DH=doorH(), rev=window.__revealMat, dx0=R.door.x0, dx1=R.door.x1, dw=dx1-dx0, dc=(dx0+dx1)/2;
    curLabel='DoorReveal';
    box(.5,DH,14,rev,dx0-.25,DH/2,D+7); box(.5,DH,14,rev,dx1+.25,DH/2,D+7); box(dw+1,.5,14,rev,dc,DH+.25,D+7);
    curLabel='DoorCasing'; box(6,DH+6,1.6,mDoor,dx0-3,(DH+6)/2,D-.8); box(6,DH+6,1.6,mDoor,dx1+3,(DH+6)/2,D-.8); box(dw+12,6,1.6,mDoor,dc,DH+3,D-.8);
    curLabel='Hallway'; box(dw+70,H,2,mHall,dc,H/2,D+22).castShadow=false;
    const sgn = R.door.hinge==='x0' ? 1 : -1;
    curLabel='Door_Pivot'; doorPivot=nameIt(new THREE.Group()); doorPivot.position.set(sgn>0?dx0:dx1,0,D); doorPivot.userData.sgn=sgn; doorPivot.rotation.y=doorAng*sgn; room.add(doorPivot);
    curLabel='Door'; box(dw-1,DH-2,4,mDoor,sgn*dw/2,(DH-2)/2,2,doorPivot);
    curLabel='DoorHandle'; box(13,2,2,mChrome,sgn*(dw-10),100,-2.2,doorPivot); box(5,5,1,mChrome,sgn*(dw-5),100,-.4,doorPivot);
    dirty=true;
  };
}

/* ---------------- textures ---------------- */
function drawSurface(s, c){
  const bb=bboxOf(s.rects);
  const cw=Math.ceil((bb[2]-bb[0])*PX), ch=Math.ceil((bb[3]-bb[1])*PX);
  const cv=s._cv; cv.width=cw; cv.height=ch;
  const ctx=cv.getContext('2d');
  const X=u=>(u-bb[0])*PX, Y=v=>(bb[3]-v)*PX;
  let rough=.85;
  const zs=zonesFor(s,c);
  zs.forEach((z,i)=>{
    const zr=clipRects(s.rects,z.vA,z.vB); if(!zr.length) return;
    ctx.save(); ctx.beginPath();
    zr.forEach(r=>ctx.rect(X(r[0]),Y(r[3]),(r[2]-r[0])*PX,(r[3]-r[1])*PX)); ctx.clip();
    const t=tileById(z.tile);
    if(!t){ ctx.fillStyle=c.paint||'#ebe8e1'; ctx.fillRect(0,0,cw,ch); if(i===0) rough=.9; }
    else{ ctx.fillStyle=t.groutColor; ctx.fillRect(0,0,cw,ch); paintTiles(ctx,t,zr,z.vFrom,X,Y,PLANE_NUM[s.plane]); if(i===0) rough=FINISH[t.finish]??.55; }
    ctx.restore();
  });
  s._tex.needsUpdate=true;
  surfMesh[s.id].material.roughness=rough;
}
function rebuildTextures(){
  if(!renderer) return;
  const c=combo();
  SURF.forEach(s=>drawSurface(s,c));
  if(window.__revealMat) window.__revealMat.color.set(c.paint||'#ebe8e1');
  dirty=true;
}

/* ---------------- camera & controls ---------------- */
const viewDef = k => k==='over' ? {mode:'over'} : Object.assign({mode:'in'}, R.views[k]);
let curView='over';
const view={mode:'over', pos:new THREE.Vector3(55,165,140), yaw:-0.32, pitch:-0.12, fov:75, oyaw:0.55, opitch:0.82, odist:560};
const target=new THREE.Vector3(133,100,78);
function setView(k){
  const v=viewDef(k); view.mode=v.mode; curView=k;
  if(v.mode==='in'){ view.pos.set(v.pos[0], Math.min(v.pos[1], H-15), v.pos[2]); view.yaw=v.yaw; view.pitch=v.pitch; view.fov=75; }
  else { view.oyaw=0.55; view.opitch=0.82; view.odist=Math.round(W*2.1); }
  document.querySelectorAll('#views button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.view===k)));
  dirty=true;
}
function updateCamera(){
  if(view.mode==='in'){
    camera.fov=view.fov; camera.position.copy(view.pos);
    const cp=Math.cos(view.pitch);
    camera.lookAt(view.pos.x-Math.sin(view.yaw)*cp, view.pos.y+Math.sin(view.pitch), view.pos.z-Math.cos(view.yaw)*cp);
  } else {
    camera.fov=45; target.set(W/2, H*0.36, D/2);
    const cp=Math.cos(view.opitch);
    camera.position.set(target.x+Math.sin(view.oyaw)*cp*view.odist, target.y+Math.sin(view.opitch)*view.odist, target.z+Math.cos(view.oyaw)*cp*view.odist);
    camera.lookAt(target);
  }
  camera.updateProjectionMatrix();
}
let drag=null;
canvas.addEventListener('pointerdown',e=>{ drag={x:e.clientX,y:e.clientY,id:e.pointerId}; canvas.setPointerCapture(e.pointerId); canvas.focus({preventScroll:true}); });
canvas.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y; drag.x=e.clientX; drag.y=e.clientY;
  if(view.mode==='in'){ view.yaw+=dx*0.0045; view.pitch=clamp(view.pitch+dy*0.0045,-1.35,1.35); }
  else { view.oyaw-=dx*0.006; view.opitch=clamp(view.opitch+dy*0.006,0.12,1.5); }
  dirty=true;
});
const endDrag=e=>{ if(drag&&drag.id===e.pointerId) drag=null; };
canvas.addEventListener('pointerup',endDrag); canvas.addEventListener('pointercancel',endDrag);
canvas.addEventListener('wheel',e=>{ e.preventDefault();
  if(view.mode==='in') view.fov=clamp(view.fov+e.deltaY*0.03,35,100); else view.odist=clamp(view.odist+e.deltaY*0.4,260,1000);
  dirty=true; },{passive:false});
const keys=new Set();
window.addEventListener('keydown',e=>{
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||'')) return;
  const k=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){ keys.add(k); if(document.activeElement===canvas) e.preventDefault(); }
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
function stepKeys(){
  if(!keys.size || view.mode!=='in') return;
  let f=0,r=0;
  if(keys.has('w')||keys.has('arrowup')) f+=1; if(keys.has('s')||keys.has('arrowdown')) f-=1;
  if(keys.has('d')) r+=1; if(keys.has('a')) r-=1;
  if(keys.has('arrowleft')) view.yaw+=0.03; if(keys.has('arrowright')) view.yaw-=0.03;
  const sp=1.6, sy=Math.sin(view.yaw), cy=Math.cos(view.yaw);
  view.pos.x=clamp(view.pos.x+(-sy*f+cy*r)*sp, 14, W-14);
  view.pos.z=clamp(view.pos.z+(-cy*f-sy*r)*sp, 14, D-14);
  dirty=true;
}
let doorOpen=false, doorAng=0;
$('#showerBtn').addEventListener('click',e=>{ showerOpen=!showerOpen; e.currentTarget.setAttribute('aria-pressed',String(showerOpen)); dirty=true; });
$('#doorBtn').addEventListener('click',e=>{ doorOpen=!doorOpen; e.currentTarget.setAttribute('aria-pressed',String(doorOpen)); dirty=true; });
$('#views').addEventListener('click',e=>{ const b=e.target.closest('button[data-view]'); if(b) setView(b.dataset.view); });
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resize(){
  if(!renderer) return;
  const r=$('#viewer').getBoundingClientRect();
  renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);
  camera.aspect=Math.max(1,r.width)/Math.max(1,r.height); dirty=true;
}
if(window.ResizeObserver) new ResizeObserver(resize).observe($('#viewer')); else window.addEventListener('resize',resize);
if(window.matchMedia('(hover:none)').matches) $('#hint').textContent='Drag to look around. Pick a viewpoint below.';

function loop(){
  requestAnimationFrame(loop);
  if(!renderer) return;
  stepKeys();
  const goal=doorOpen?1.45:0;
  if(Math.abs(doorAng-goal)>0.001){ doorAng = reduceMotion? goal : doorAng+(goal-doorAng)*0.15; if(Math.abs(doorAng-goal)<0.002) doorAng=goal; doorPivot.rotation.y=doorAng*(doorPivot.userData.sgn||1); dirty=true; }
  const sg=showerOpen?1:0;
  if(Math.abs(showerAmt-sg)>0.001){ showerAmt = reduceMotion? sg : showerAmt+(sg-showerAmt)*0.12; if(Math.abs(showerAmt-sg)<0.003) showerAmt=sg;
    sliders.forEach(fn=>fn(showerAmt)); dirty=true; }
  if(!dirty) return;
  dirty=false; updateCamera(); renderer.render(scene,camera);
}

/* ---------------- highlight ---------------- */
let hiSec=null;
function highlight(sec){
  if(hiSec===sec || !renderer) return;
  if(hiSec) (secMeshes[hiSec]||[]).forEach(m=>{ m.material.emissive.setHex(0); m.material.emissiveIntensity=1; });
  hiSec=sec;
  if(sec) (secMeshes[sec]||[]).forEach(m=>{ m.material.emissive.setHex(0x2b4ea2); m.material.emissiveIntensity=.35; });
  dirty=true;
}

/* ---------------- combination files (.json) ---------------- */
const FILE_FORMAT='bathroom-tile-planner.combination';
let comboMsg='';
function setMsg(m){ comboMsg=m; const el=$('#comboMsg'); if(el) el.textContent=m; }
const safeName = n => (String(n).replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim() || 'Combination');
function imgToDataURL(im){
  if(im.src && im.src.startsWith('data:')) return im.src;
  const c=document.createElement('canvas'); c.width=im.naturalWidth||im.width; c.height=im.naturalHeight||im.height;
  c.getContext('2d').drawImage(im,0,0); return c.toDataURL('image/jpeg',0.9);
}
function tileImages(t){
  const up=t.images.map(id=>imgs[id]).filter(Boolean);
  if(up.length) return {source:'uploaded photo', list:up};
  const f=fileImgs[t.id];
  if(f){ const base=f.base||[f[0]]; const builtIn=!!(base[0].src && base[0].src.startsWith('data:')); return {source: builtIn?'built-in product photo':'texture file', list:base}; }
  return {source:'none (colour preview)', list:[]};
}
function tileToFile(t){
  const im=tileImages(t); let ppb=+t.boxPcs||0; if(!ppb && +t.boxM2>0) ppb=Math.max(1,Math.round(t.boxM2/(t.w*t.h/1e4)));
  return {
    id:t.id, name:t.name, brand:t.brand||'', model:t.model||'',
    shop:{ url:t.url||'', productCode:t.shopCode||'', price:+t.price||0, currency:t.currency||'EUR',
           priceUnit: ppb===1?'piece':(t.priceUnit||'box'), priceCheckedAt:t.priceCheckedAt||'' },
    sizeCm:{ width:t.w, height:t.h },
    packaging:{ piecesPerBox: ppb||null, m2PerBox: +t.boxM2 || (ppb ? +(ppb*t.w*t.h/1e4).toFixed(3) : null) },
    laying:{ layout:t.layout, groutMm:+t.grout||0, groutColor:t.groutColor, wastePercent:+t.waste||0 },
    finish:t.finish, specs:t.specs||{},
    preview:{ color:t.color, look:t.look, variations:variationOf(t) },
    image:{ source:im.source, files:im.list.map(imgToDataURL) }
  };
}
async function saveFile(filename, data, mime){
  let dl=null;
  try{ if(window.claude && typeof window.claude.use==='function') dl=await window.claude.use('downloads'); }catch(e){ dl=null; }
  if(dl){
    try{ await dl.save({filename, data}); setMsg(`Saved ${filename}.`); }
    catch(err){ setMsg(err && err.code==='declined' ? 'Download cancelled.' : `Could not save ${filename}: ${(err && err.message) || 'downloads are unavailable here'}.`); }
    return;
  }
  const url=URL.createObjectURL(data instanceof Blob ? data : new Blob([data],{type:mime||'application/octet-stream'}));
  const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000); setMsg(`Downloaded ${filename}.`);
}
// minimal ZIP writer (stored, no compression): files = [{name, data:Uint8Array}]
const CRC_T=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
function crc32(u8){ let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=CRC_T[(c^u8[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function makeZip(files){
  const enc=new TextEncoder(), parts=[], central=[]; let off=0;
  const d=new Date(), dosT=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1), dosD=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  for(const f of files){
    const nm=enc.encode(f.name), crc=crc32(f.data), sz=f.data.length;
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true); lh.setUint16(8,0,true);
    lh.setUint16(10,dosT,true); lh.setUint16(12,dosD,true); lh.setUint32(14,crc,true); lh.setUint32(18,sz,true); lh.setUint32(22,sz,true);
    lh.setUint16(26,nm.length,true); lh.setUint16(28,0,true);
    parts.push(new Uint8Array(lh.buffer), nm, f.data);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true); ch.setUint16(10,0,true);
    ch.setUint16(12,dosT,true); ch.setUint16(14,dosD,true); ch.setUint32(16,crc,true); ch.setUint32(20,sz,true); ch.setUint32(24,sz,true);
    ch.setUint16(28,nm.length,true); ch.setUint32(42,off,true);
    central.push(new Uint8Array(ch.buffer), nm);
    off+=30+nm.length+sz;
  }
  const csz=central.reduce((a,b)=>a+b.length,0);
  const end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true); end.setUint16(8,files.length,true); end.setUint16(10,files.length,true); end.setUint32(12,csz,true); end.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(end.buffer)],{type:'application/zip'});
}
function comboData(withImages){
  const c=combo(); const q=computeQty(c);
  const used=[]; SECTIONS.forEach(sec=>{ const a=c.assign[sec.id]; if(!a) return; [a.lower,a.upper].forEach(id=>{ if(id && tileById(id) && !used.includes(id)) used.push(id); }); });
  let total=0;
  const data={
    format:FILE_FORMAT, version:1, exportedAt:new Date().toISOString(),
    name:c.name,
    room:Object.assign({ id:R.id, name:R.name, widthCm:W, depthCm:D, heightCm:H }, R.variants?{ variant:RS().variant||'walkin' }:{}, R.info(), { ceilingSpots:{ count:6, rows:2, columns:3 } }),
    paint:c.paint||'#ebe8e1',
    surfaces:Object.fromEntries(SECTIONS.map(sec=>{ const a=c.assign[sec.id]||{lower:'paint',upper:'',split:120};
      return [sec.id,{ name:sec.name, tile:a.lower||'paint', above: sec.split && a.upper ? a.upper : null, aboveFromCm: sec.split && a.upper ? +a.split||0 : null }]; })),
    tiles:used.map(id=>{ const t=tileToFile(tileById(id)); if(!withImages) t.image.files=[]; return t; }),
    quantities:q.map(e=> e.paint ? {tile:'paint', areaM2:+e.area.toFixed(2)} :
      (total+=e.cost||0, {tile:e.id, name:e.t.name, areaM2:+e.area.toFixed(2), orderPieces:e.order, worstCasePieces:e.pieces, boxes:e.boxes, cost:e.cost!=null?+e.cost.toFixed(2):null})),
    totalCost:+total.toFixed(2), currency:'EUR'
  };
  return data;
}
async function exportCombo(){
  const c=combo();
  await saveFile(safeName(c.name)+'.json', JSON.stringify(comboData(true),null,2), 'application/json');
}
// Export to Blender: a .zip with "<Bathroom> - <combination>.glb" (metres, named objects, tile textures,
// planner data in the root node's custom properties) and "<combination>.json" (the combination file, re-uploadable here)
async function exportBlender(){
  const GX = window.__GLTFExporter || THREE.GLTFExporter;
  if(!GX || !renderer){ setMsg('The 3D exporter could not be loaded, so Export to Blender is unavailable here.'); return; }
  const c=combo(), base=safeName(`${R.name} - ${c.name}`);
  setMsg('Preparing the Blender export…');
  const root=new THREE.Group(); root.name=base;
  root.scale.setScalar(0.01);                         // planner works in cm, Blender in metres
  const copy=room.clone(true); copy.name=`${R.id.toUpperCase()}_Room`; root.add(copy);
  const info=comboData(false);
  root.userData={ planner:JSON.stringify(info), bathroom:R.name, combination:c.name, units:'metres (planner cm × 0.01)' };
  const scene=new THREE.Scene(); scene.name=base; scene.add(root);
  let glb;
  try{
    glb = await new Promise((ok,no)=>{ try{ new GX().parse(scene, r=>ok(r), {binary:true, onlyVisible:true, maxTextureSize:4096}); }catch(e){ no(e); } });
  }catch(e){ setMsg(`The Blender export failed: ${e && e.message || e}.`); return; }
  const json=new TextEncoder().encode(JSON.stringify(comboData(true),null,2));
  const zip=makeZip([{name:base+'.glb', data:new Uint8Array(glb)}, {name:safeName(c.name)+'.json', data:json}]);
  await saveFile(base+'.zip', zip, 'application/zip');
}
async function importCombo(file){
  let data;
  try{ data=JSON.parse(await file.text()); }catch(e){ setMsg(`${file.name} is not valid JSON.`); return; }
  if(!data || data.format!==FILE_FORMAT || !Array.isArray(data.tiles) || !data.surfaces){ setMsg(`${file.name} is not a bathroom combination file.`); return; }
  const name=safeName(file.name.replace(/\.json$/i,'') || data.name);
  const rid=data.room && data.room.id;
  if(rid && ROOMS[rid] && rid!==R.id) enterRoom(rid);
  for(const ft of data.tiles){
    if(!ft || !ft.id) continue;
    const sh=ft.shop||{}, pk=ft.packaging||{}, ly=ft.laying||{}, pv=ft.preview||{}, sz=ft.sizeCm||{};
    let t=tileById(ft.id); if(!t){ t={id:String(ft.id), images:[]}; state.tiles.push(t); }
    Object.assign(t,{
      name:ft.name||t.name||ft.id, brand:ft.brand||'', model:ft.model||'',
      url:sh.url||'', shopCode:sh.productCode||'', price:+sh.price||0, currency:sh.currency||'EUR', priceUnit:sh.priceUnit||'box', priceCheckedAt:sh.priceCheckedAt||'',
      w:Math.max(1,+sz.width||t.w||30), h:Math.max(1,+sz.height||t.h||30),
      boxPcs: pk.piecesPerBox ? +pk.piecesPerBox : 0, boxM2: pk.piecesPerBox ? 0 : (+pk.m2PerBox||0),
      layout: LAYOUTS[ly.layout] ? ly.layout : 'grid', grout:+ly.groutMm||0, groutColor:ly.groutColor||'#d6d6d2', waste: ly.wastePercent!=null ? +ly.wastePercent : 10,
      finish: FINISH[ft.finish]!==undefined ? ft.finish : 'satin', specs:ft.specs||{},
      color:pv.color||'#d9d4cb', look: LOOKS[pv.look] ? pv.look : 'plain', variations:['none','mirror','rotate'].includes(pv.variations)?pv.variations:'none'
    });
    if(!Array.isArray(t.images)) t.images=[];
    const files=(ft.image && Array.isArray(ft.image.files)) ? ft.image.files.filter(u=>typeof u==='string' && u.startsWith('data:image/')) : [];
    if(files.length){
      t.images.forEach(idbDel); t.images=[];
      for(const src of files){ const id=uid('img'); await idbPut(id,src); if(await loadImg(id,src)) t.images.push(id); }
    }
  }
  const ok=id=> id==='paint' || !!tileById(id);
  const assign={};
  SECTIONS.forEach(sec=>{ const fs=data.surfaces[sec.id]; if(!fs) return;
    assign[sec.id]={ lower: ok(fs.tile)?fs.tile:'paint', upper: fs.above && ok(fs.above) ? fs.above : '', split: fs.aboveFromCm!=null ? clamp(+fs.aboveFromCm||0,0,400) : 120 };
  });
  let c=RS().combos.find(k=>k.name===name);
  if(c){ c.assign=assign; c.paint=data.paint||c.paint; }
  else { c={id:uid('c'), name, paint:data.paint||'#ebe8e1', assign}; RS().combos.push(c); }
  RS().active=c.id;
  const fv = data.room && (data.room.variant==='sliding' ? 'folding' : data.room.variant);
  const fg = data.room && data.room.shower && +data.room.shower.glassWallCm;
  if(R.glassOptions && R.glassOptions.includes(fg) && fv==='walkin') RS().glass=fg;
  if(R.variants && R.variants[fv] && (RS().variant!==fv || fv==='walkin')){ RS().variant=fv; buildRoom(); }
  const h=data.room && +data.room.heightCm;
  if(h && Math.round(h)!==H){ RS().height=H=clamp(Math.round(h),150,400); makeSurf(); buildRoom(); }
  setMsg(`Loaded “${name}” into ${R.name} with ${data.tiles.length} tiles and a ${H} cm ceiling.`);
  refresh();
}

/* ---------------- panel UI ---------------- */
const openTiles=new Set();
let pendingDel=null;
function tileOptions(sel, extra){
  let h=extra||'';
  state.tiles.forEach(t=>{ h+=`<option value="${esc(t.id)}"${t.id===sel?' selected':''}>${esc(t.name)}</option>`; });
  h+=`<option value="paint"${sel==='paint'?' selected':''}>Paint</option>`;
  return h;
}
function swatch(canvasEl, t){
  const ctx=canvasEl.getContext('2d'); const cw=canvasEl.width, ch=canvasEl.height;
  if(!t){ ctx.fillStyle=combo().paint||'#ebe8e1'; ctx.fillRect(0,0,cw,ch); return; }
  const g=(+t.grout||0)/10;
  const unitsH = Math.max(2*(t.h+g), (t.w+g)*1.4*ch/cw);
  const s = ch/unitsH;
  ctx.fillStyle=t.groutColor; ctx.fillRect(0,0,cw,ch);
  const faces=facesOf(t);
  forCells(t,[0,0,cw/s,ch/s],0,(r,c,x,y)=>{ const h=hash3(r,c,99); ctx.drawImage(faces[h%faces.length], x*s+.5, ch-(y+t.h)*s+.5, Math.max(1,t.w*s-1), Math.max(1,t.h*s-1)); });
}
function paintSwatches(){
  document.querySelectorAll('canvas[data-sw]').forEach(cv=>{
    const r=window.devicePixelRatio>1?2:1; const w=cv.clientWidth||60, h=cv.clientHeight||40;
    cv.width=w*r; cv.height=h*r; swatch(cv, tileById(cv.dataset.sw));
  });
}
function renderCombos(){
  const c=combo();
  $('#combos').innerHTML=RS().combos.map(k=>`<button data-combo="${esc(k.id)}" aria-pressed="${k.id===c.id}">${esc(k.name)}</button>`).join('');
  $('#comboCtl').innerHTML=
    `<input type="text" data-cf="name" value="${esc(c.name)}" aria-label="Combination name">`+
    `<label>Paint <input type="color" data-cf="paint" value="${esc(c.paint||'#ebe8e1')}"></label>`+
    `<button class="btn" data-act="dupCombo">Duplicate</button>`+
    `<button class="btn" data-act="exportCombo">Download JSON</button>`+
    `<button class="btn" data-act="exportBlender">Export to Blender</button>`+
    `<label class="upl">Upload JSON<input type="file" accept=".json,application/json" data-import="1"></label>`+
    (RS().combos.length>1?`<button class="btn danger" data-act="delCombo">${pendingDel==='combo:'+c.id?'Click again to delete':'Delete'}</button>`:'');
  $('#comboNow').textContent=c.name;
  $('#comboMsg').textContent=comboMsg;
}
function renderQty(){
  const q=computeQty(combo());
  let rows='', tiled=0, total=0, priced=true;
  q.forEach(e=>{
    const names=[...e.secs].map(s=>SECT[s]?.name).filter(Boolean).join(', ');
    if(e.paint){
      rows+=`<tr><td><div class="tname"><canvas data-sw="paint"></canvas>Paint</div></td><td>${fmt(e.area)}</td><td></td><td></td><td></td><td></td></tr>`+
            `<tr class="sub"><td colspan="6">Walls above the tiles and the ceiling.</td></tr>`;
      return;
    }
    tiled+=e.area; if(e.cost==null) priced=false; else total+=e.cost;
    rows+=`<tr><td><div class="tname"><canvas data-sw="${esc(e.id)}"></canvas>${esc(e.t.name)}</div></td>`+
          `<td>${fmt(e.area)}</td><td>${e.pieces}</td><td class="order">${e.order}</td><td>${e.boxes??'–'}</td><td>${e.cost!=null?fmt(e.cost):'–'}</td></tr>`+
          `<tr class="sub"><td colspan="6">${e.fullN} full and ${e.cut} cut pieces in the layout${e.pieces>e.order?`, so ordering ${e.pieces} would cover the case where no offcut can be reused`:''}. Order covers ${fmt(e.orderM2)} m²${e.ppb?(e.ppb===1?', sold per piece':`, ${e.ppb} per box`):', add box size in the library'}. Used on: ${esc(names)}.</td></tr>`;
  });
  $('#qty').innerHTML=`<table class="qt"><thead><tr><th>Tile</th><th>m²</th><th>Pieces</th><th>Order</th><th>Boxes</th><th>€</th></tr></thead><tbody>${rows}</tbody></table>`+
    `<p class="note">Tiled area ${fmt(tiled)} m²${total?`, tiles about ${fmt(total)} €${priced?'':' (some prices missing)'}`:''}. Order is the tiled area plus each tile's waste allowance, assuming offcuts are reused where they fit. Pieces is the worst case, where every cut piece uses a new tile.</p>`;
}
function renderSurfaces(){
  const c=combo();
  $('#surfaces').innerHTML=SECTIONS.map(sec=>{
    const a=c.assign[sec.id]||{lower:'paint',upper:'',split:120};
    let h=`<div class="srow" data-sec="${sec.id}"><div class="sname"><b>${esc(sec.name)}</b><span>${esc(sec.note)}</span></div><div class="sctl">`+
          `<select data-k="lower" aria-label="${esc(sec.name)} tile">${tileOptions(a.lower)}</select>`;
    if(sec.split){
      h+=`<span>above</span><input type="number" data-k="split" min="0" max="${H}" step="1" value="${+a.split||120}" ${a.upper?'':'disabled'} aria-label="Height in cm"><span>cm</span>`+
         `<select data-k="upper" aria-label="${esc(sec.name)} above">${tileOptions(a.upper,`<option value=""${!a.upper?' selected':''}>same to the ceiling</option>`)}</select>`;
    }
    return h+'</div></div>';
  }).join('');
}
function renderTiles(){
  const used=new Set(); allCombos().forEach(c=>Object.values(c.assign).forEach(a=>{ used.add(a.lower); if(a.upper) used.add(a.upper); }));
  $('#tiles').innerHTML=state.tiles.map(t=>{
    const thumbs=t.images.map(id=>imgs[id]?`<div class="thumb"><img src="${imgs[id].src}" alt="Photo of ${esc(t.name)}"><button data-act="delImg" data-tile="${esc(t.id)}" data-img="${esc(id)}" aria-label="Remove photo">×</button></div>`:'').join('');
    const ppbHint = (!+t.boxPcs && +t.boxM2>0) ? ` = ${Math.max(1,Math.round(t.boxM2/(t.w*t.h/1e4)))} pcs` : '';
    return `<details class="tile" data-tile="${esc(t.id)}"${openTiles.has(t.id)?' open':''}>
      <summary><canvas data-sw="${esc(t.id)}"></canvas><div class="ti"><b>${esc(t.name)}</b><span>${t.w} × ${t.h} cm, ${LAYOUTS[t.layout]?.toLowerCase()||''}${used.has(t.id)?'':', not used yet'}</span></div><span class="chev" aria-hidden="true">›</span></summary>
      <div class="ted">
        <label>Name</label><div class="f"><input type="text" data-f="name" value="${esc(t.name)}" style="flex:1"></div>
        <label>Size (cm)</label><div class="f"><input type="number" data-f="w" min="1" step="0.1" value="${t.w}" aria-label="Width cm"> × <input type="number" data-f="h" min="1" step="0.1" value="${t.h}" aria-label="Height cm"><button class="btn" data-act="swap" data-tile="${esc(t.id)}">Rotate</button></div>
        <label>Layout</label><div class="f"><select data-f="layout">${Object.entries(LAYOUTS).map(([k,v])=>`<option value="${k}"${k===t.layout?' selected':''}>${v}</option>`).join('')}</select></div>
        <label>Grout</label><div class="f"><input type="number" data-f="grout" min="0" max="20" step="0.5" value="${t.grout}" aria-label="Grout mm"> mm <input type="color" data-f="groutColor" value="${esc(t.groutColor)}" aria-label="Grout colour"></div>
        <label>Finish</label><div class="f"><select data-f="finish">${Object.keys(FINISH).map(k=>`<option value="${k}"${k===t.finish?' selected':''}>${k[0].toUpperCase()+k.slice(1)}</option>`).join('')}</select></div>
        <label>Photos</label><div class="f"><div class="thumbs">${thumbs}</div><label class="upl">Add photos<input type="file" accept="image/*" multiple data-upl="${esc(t.id)}"></label></div>
        <label>Preview</label><div class="f"><input type="color" data-f="color" value="${esc(t.color)}" aria-label="Preview colour"><select data-f="look" aria-label="Preview texture">${Object.entries(LOOKS).map(([k,v])=>`<option value="${k}"${k===t.look?' selected':''}>${v}</option>`).join('')}</select></div>
        <label>Per box</label><div class="f"><input type="number" data-f="boxPcs" min="0" step="1" value="${t.boxPcs||''}" placeholder="pcs" aria-label="Pieces per box"> pcs or <input type="number" data-f="boxM2" min="0" step="0.01" value="${t.boxM2||''}" placeholder="m²" aria-label="Square metres per box"> m²${ppbHint}</div>
        <label>Price</label><div class="f"><input type="number" data-f="price" min="0" step="0.01" value="${t.price||''}" placeholder="€" aria-label="Price per box"> € per box${t.url?` <a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer nofollow">product page</a>`:''}</div>
        ${t.texFile?`<label>Texture file</label><div class="f" style="color:var(--muted)">textures/${esc(t.texFile)}.jpg${fileImgs[t.id]?((fileImgs[t.id][0].src||'').startsWith('data:')?', using the built-in product photo':', loaded'):''}</div>`:''}
        <label>Variations</label><div class="f"><select data-f="variations" aria-label="Face variations">${[['none','Same photo on every tile'],['mirror','Mirror the photo'],['rotate','Rotate the photo (square tiles)']].map(([k,v])=>`<option value="${k}"${k===variationOf(t)?' selected':''}>${v}</option>`).join('')}</select></div>
        <label>Waste</label><div class="f"><input type="number" data-f="waste" min="0" max="50" step="1" value="${t.waste}" aria-label="Waste percent"> %</div>
        <div class="full f"><button class="btn danger" data-act="delTile" data-tile="${esc(t.id)}">${pendingDel==='tile:'+t.id?'Click again to delete':'Delete tile'}</button></div>
      </div></details>`;
  }).join('');
}
function renderTabs(){
  $('#roomTabs').innerHTML=ROOM_ORDER.map(id=>`<button role="tab" data-room-tab="${id}" aria-selected="${id===R.id}">${esc(ROOMS[id].name)}</button>`).join('');
  $('#assume').innerHTML=R.assumptions().map(t=>`<li>${esc(t)}</li>`).join('');
}
function enterRoom(id){
  state.activeRoom=id; useRoom(id); H=clamp(Math.round(+RS().height||280),150,400);
  makeSurf(); buildRoom(); setView(curView);
}
function withRoom(id, fn){
  const keep={R, W, D, H, SECTIONS, SECT, SURF};
  useRoom(id); H=clamp(Math.round(+state.rooms[id].height||280),150,400); makeSurf();
  try{ return fn(); }
  finally{ R=keep.R; W=keep.W; D=keep.D; H=keep.H; SECTIONS=keep.SECTIONS; SECT=keep.SECT; SURF=keep.SURF; }
}
function renderQtyAll(){
  const parts=ROOM_ORDER.map(id=>{ const rs=state.rooms[id]; const c=rs.combos.find(k=>k.id===rs.active)||rs.combos[0];
    return {id, c, q:withRoom(id,()=>computeQty(c))}; });
  const pool={};
  parts.forEach(p=>p.q.forEach(e=>{ if(e.paint) return;
    const x=pool[e.id]||(pool[e.id]={t:e.t, area:0, sepOrder:0, sepBoxes:0, sepCost:0, rooms:0}); x.area+=e.area; x.sepOrder+=e.order; x.sepBoxes+=e.boxes||0; x.sepCost+=e.cost||0; x.rooms++; }));
  let rows='', tot=0, sepTot=0;
  Object.entries(pool).sort((a,b)=>b[1].area-a[1].area).forEach(([id,x])=>{
    const t=x.t, ca=t.w*t.h/1e4; let ppb=+t.boxPcs||0; if(!ppb && +t.boxM2>0) ppb=Math.max(1,Math.round(t.boxM2/ca));
    const order=Math.ceil(x.area/ca*(1+(+t.waste||0)/100)), boxes=ppb?Math.ceil(order/ppb):null, cost=(boxes!=null && +t.price>0)?boxes*t.price:0;
    tot+=cost; sepTot+=x.sepCost;
    rows+=`<tr><td><div class="tname"><canvas data-sw="${esc(id)}"></canvas>${esc(t.name)}</div></td><td>${fmt(x.area)}</td><td class="order">${order}</td><td>${boxes??'–'}</td><td>${cost?fmt(cost):'–'}</td></tr>`+
      `<tr class="sub"><td colspan="5">${x.rooms>1 ? (x.sepBoxes>(boxes||0) ? `Ordered for each bathroom separately: ${x.sepBoxes} ${ppb===1?'pieces':'boxes'}, ${fmt(x.sepCost)} €.` : 'Same amount as ordering for each bathroom separately.') : 'Used in one bathroom only.'}</td></tr>`;
  });
  const names=parts.map(p=>`${ROOMS[p.id].name}: ${esc(p.c.name)}`).join('; ');
  $('#qtyAll').innerHTML=`<table class="qt"><thead><tr><th>Tile</th><th>m²</th><th>Order</th><th>Boxes</th><th>€</th></tr></thead><tbody>${rows}`+
    `<tr class="tot"><td>Total</td><td></td><td></td><td></td><td>${fmt(tot)}</td></tr></tbody></table>`+
    `<p class="note">Uses the combination selected in each bathroom (${names}). One order for both rounds boxes and adds waste once${sepTot-tot>0.005?`, saving about ${fmt(sepTot-tot)} € compared with two separate orders`:''}.</p>`;
}
function renderRoom(){
  $('#roomCtl').innerHTML=[260,270,280].map(h=>`<button class="btn hbtn" data-h="${h}" aria-pressed="${H===h}">${h} cm</button>`).join('')+
    `<label>Other <input type="number" data-room="height" min="150" max="400" step="1" value="${H}" aria-label="Ceiling height in cm"> cm</label>`;
  $('#roomSize').textContent=`${W} × ${D} cm floor, ${H} cm to the ceiling`;
  $('#layoutBlk').hidden=!R.variants;
  if(R.variants){ const cur=RS().variant||'walkin';
    const gl=RS().glass||78;
    $('#layoutCtl').innerHTML=Object.entries(R.variants).map(([k,v])=>{
      if(k==='walkin' && R.glassOptions){
        return `<select class="vsel${cur==='walkin'?' on':''}" data-glass="1" aria-label="Walk-in, fixed glass">`+
          (cur!=='walkin'?`<option value="" selected>Walk-in, fixed glass…</option>`:'')+
          R.glassOptions.map(g=>`<option value="${g}"${cur==='walkin'&&g===gl?' selected':''}>Walk-in, glass ${g} / ${g-20} cm, entry ${118-g} cm</option>`).join('')+`</select>`;
      }
      return `<button class="btn hbtn" data-variant="${k}" aria-pressed="${k===cur}">${esc(v)}</button>`;
    }).join(''); }
}
function setHeight(h){
  h=clamp(Math.round(+h||H),150,400); if(h===H){ renderRoom(); return; }
  RS().height=H=h; makeSurf(); buildRoom();
  if(view.mode==='in') view.pos.y=Math.min(view.pos.y,H-15);
  refresh();
}
function renderPanel(){ renderTabs(); renderRoom(); renderCombos(); renderQty(); renderQtyAll(); renderSurfaces(); renderTiles(); paintSwatches(); }
function refresh(doSave=true){ rebuildTextures(); renderPanel(); if(doSave) save(); }

const panel=$('#panel');
panel.addEventListener('toggle',e=>{ const d=e.target; if(d.matches&&d.matches('details.tile')){ d.open?openTiles.add(d.dataset.tile):openTiles.delete(d.dataset.tile); if(d.open) paintSwatches(); } },true);
panel.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.roomTab){ if(b.dataset.roomTab!==R.id){ pendingDel=null; enterRoom(b.dataset.roomTab); refresh(); } return; }
  if(b.dataset.variant){ if(RS().variant!==b.dataset.variant){ RS().variant=b.dataset.variant; buildRoom(); refresh(); } return; }
  if(b.dataset.h){ setHeight(+b.dataset.h); return; }
  if(b.dataset.combo){ RS().active=b.dataset.combo; pendingDel=null; refresh(); return; }
  const act=b.dataset.act; if(!act) return;
  const c=combo();
  if(act!=='delCombo'&&act!=='delTile') pendingDel=null;
  if(act==='exportCombo'){ exportCombo(); return; }
  if(act==='exportBlender'){ exportBlender(); return; }
  if(act==='dupCombo'){ const n=JSON.parse(JSON.stringify(c)); n.id=uid('c'); n.name=c.name+' copy'; RS().combos.push(n); RS().active=n.id; refresh(); }
  else if(act==='delCombo'){ const k='combo:'+c.id; if(pendingDel!==k){ pendingDel=k; renderCombos(); return; } pendingDel=null; RS().combos=RS().combos.filter(x=>x.id!==c.id); RS().active=RS().combos[0].id; refresh(); }
  else if(act==='swap'){ const t=tileById(b.dataset.tile); [t.w,t.h]=[t.h,t.w]; refresh(); }
  else if(act==='delTile'){ const id=b.dataset.tile, k='tile:'+id; if(pendingDel!==k){ pendingDel=k; renderTiles(); paintSwatches(); return; }
    pendingDel=null; const t=tileById(id); t.images.forEach(idbDel); state.tiles=state.tiles.filter(x=>x.id!==id);
    allCombos().forEach(cc=>Object.values(cc.assign).forEach(a=>{ if(a.lower===id) a.lower='paint'; if(a.upper===id) a.upper='paint'; }));
    openTiles.delete(id); refresh(); }
  else if(act==='delImg'){ const t=tileById(b.dataset.tile); t.images=t.images.filter(x=>x!==b.dataset.img); idbDel(b.dataset.img); delete imgs[b.dataset.img]; refresh(); }
});
panel.addEventListener('change',async e=>{
  const el=e.target;
  if(el.dataset.room==='height'){ setHeight(el.value); return; }
  if(el.dataset.glass){ const g=+el.value; if(!g) return; RS().variant='walkin'; RS().glass=g; buildRoom(); refresh(); return; }
  if(el.dataset.import){ const f=el.files&&el.files[0]; el.value=''; if(f) importCombo(f); return; }
  if(el.dataset.cf){ const c=combo(); c[el.dataset.cf]=el.value; refresh(); return; }
  const row=el.closest('.srow');
  if(row && el.dataset.k){ const c=combo(); const a=c.assign[row.dataset.sec]||(c.assign[row.dataset.sec]={lower:'paint',upper:'',split:120});
    a[el.dataset.k] = el.dataset.k==='split' ? clamp(+el.value||0,0,H) : el.value; refresh(); return; }
  if(el.dataset.upl){ const t=tileById(el.dataset.upl); const files=[...el.files];
    for(const f of files){ try{ const src=await downscale(await readFile(f),1000); if(!src) continue; const id=uid('img'); await idbPut(id,src); await loadImg(id,src); t.images.push(id); }catch(err){} }
    openTiles.add(t.id); refresh(); return; }
  const det=el.closest('details.tile');
  if(det && el.dataset.f){ const t=tileById(det.dataset.tile); const f=el.dataset.f;
    const num=['w','h','grout','boxPcs','boxM2','waste','price'];
    if(num.includes(f)){ let v=parseFloat(el.value); if(!isFinite(v)) v=0; if(f==='w'||f==='h') v=Math.max(1,v); t[f]=v; }
    else t[f]=el.value;
    if(f==='variations' && fileImgs[t.id] && fileImgs[t.id].base && fileImgs[t.id].base.length===1){ const base=fileImgs[t.id].base; fileImgs[t.id]=Object.assign(variantsOf(t,base[0]),{base}); }
    refresh(); }
});
panel.addEventListener('pointerover',e=>{ const r=e.target.closest('.srow'); highlight(r?r.dataset.sec:null); });
panel.addEventListener('pointerleave',()=>highlight(null));
panel.addEventListener('focusin',e=>{ const r=e.target.closest('.srow'); highlight(r?r.dataset.sec:null); });
$('#addTile').addEventListener('click',()=>{
  const t={id:uid('t'), name:'New tile 30 × 30', w:30, h:30, grout:2, groutColor:'#d6d6d2', layout:'grid', finish:'satin', color:'#d9d4cb', look:'plain', boxPcs:0, boxM2:0, waste:10, images:[]};
  state.tiles.push(t); openTiles.add(t.id); refresh();
  const d=document.querySelector(`details.tile[data-tile="${t.id}"]`); if(d) d.scrollIntoView({block:'nearest',behavior:reduceMotion?'auto':'smooth'});
});

/* ---------------- start ---------------- */
resize();
buildRoom();
setView('over');
refresh(false);
loadAllImages();
loop();
})();
