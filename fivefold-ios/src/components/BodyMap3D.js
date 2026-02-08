/**
 * BodyMap3D — Uses locally-bundled GLB models (no network needed),
 * sends to WebView via chunked base64 for Three.js rendering with muscle coloring.
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// Embedded model data — bundled in the app, zero network dependency
import FEMALE_MODEL_B64 from '../assets/femaleModelB64';
import MALE_MODEL_B64 from '../assets/maleModelB64';

const CHUNK_SIZE = 256 * 1024; // 256KB per chunk

function buildHTML(scores, selectedMuscle) {
  const scoresJSON = JSON.stringify(scores || {});

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0}
body{overflow:hidden;background:transparent;touch-action:none}
canvas{display:block}
#loader{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui;gap:12px;z-index:10}
.spin{width:32px;height:32px;border:3px solid rgba(255,255,255,0.08);border-top-color:#7C3AED;border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
#status{font-size:12px;color:rgba(255,255,255,0.35);text-align:center;max-width:80%}
</style>
</head><body>
<div id="loader"><div class="spin"></div><div id="status">Initializing...</div></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js"><\/script>

<script>
(function(){
var statusEl=document.getElementById('status');
var loaderEl=document.getElementById('loader');
var scores=${scoresJSON};
var selectedMuscle='${selectedMuscle || ''}';

function log(msg){statusEl.textContent=msg;}
function showLoader(){loaderEl.style.display='flex';}
function hideLoader(){loaderEl.style.display='none';}

// Score → base color (untrained = null → use natural skin tone)
function sc(s){
  if(s>=70)return[0.063,0.725,0.506];
  if(s>=35)return[0.961,0.620,0.043];
  if(s>=10)return[0.937,0.267,0.267];
  return null; // untrained → natural skin color
}

// Per-muscle hue tint — stronger offsets so adjacent groups are clearly distinct
var muscleTint={
  chest:[0.05,-0.04,0.08], traps:[0.08,0.02,-0.06],
  frontDelts:[-0.06,0.06,0.04], rearDelts:[0.06,0.02,-0.07],
  sideDelts:[-0.04,0.07,0.0],
  biceps:[0.07,-0.05,0.02], triceps:[-0.07,0.04,0.06],
  forearms:[0.04,0.06,-0.07],
  lats:[-0.06,-0.04,0.09], upperBack:[0.06,-0.07,0.02],
  abs:[0.0,0.08,-0.06], obliques:[-0.07,0.02,0.08],
  lowerBack:[0.08,-0.02,-0.06], glutes:[-0.04,0.07,-0.04],
  quads:[0.06,-0.07,0.04], hamstrings:[-0.07,0.06,-0.02],
  calves:[0.04,-0.06,0.07]
};
function getMusc(id){
  var d=scores[id];var base=d&&d.score!==undefined?sc(d.score):null;
  if(!base)return SKIN; // untrained = natural skin color, no tint
  var t=muscleTint[id];
  if(t)return[
    Math.max(0,Math.min(1,base[0]+t[0])),
    Math.max(0,Math.min(1,base[1]+t[1])),
    Math.max(0,Math.min(1,base[2]+t[2]))
  ];
  return base;
}
var SKIN=[0.22,0.18,0.25];

if(typeof THREE==='undefined'){log('Three.js failed');return;}
log('Scene ready');

var W=window.innerWidth,H=window.innerHeight;
var renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setSize(W,H);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
document.body.appendChild(renderer.domElement);

var scene=new THREE.Scene();
var camera=new THREE.PerspectiveCamera(30,W/H,0.01,100);
camera.position.set(0,1,3.5);

scene.add(new THREE.AmbientLight(0xd0c8e0,0.65));
var d1=new THREE.DirectionalLight(0xffffff,1.6);d1.position.set(3,5,5);scene.add(d1);
var d2=new THREE.DirectionalLight(0x9090cc,0.4);d2.position.set(-4,3,-3);scene.add(d2);
var d3=new THREE.DirectionalLight(0xffffff,0.55);d3.position.set(0,4,-5);scene.add(d3);
var d4=new THREE.DirectionalLight(0x554466,0.25);d4.position.set(0,-3,2);scene.add(d4);

var ctrl=new THREE.OrbitControls(camera,renderer.domElement);
ctrl.enableDamping=true;ctrl.dampingFactor=0.07;ctrl.enablePan=false;
ctrl.minDistance=1.5;ctrl.maxDistance=6;ctrl.autoRotate=true;ctrl.autoRotateSpeed=0.5;
ctrl.target.set(0,0.9,0);ctrl.minPolarAngle=Math.PI*0.1;ctrl.maxPolarAngle=Math.PI*0.9;

var shadow=new THREE.Mesh(
  new THREE.CircleGeometry(0.4,32),
  new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:0.08})
);
shadow.rotation.x=-Math.PI/2;scene.add(shadow);

// We use ABSOLUTE world coords instead of bbox-normalised, because
// the T-pose arms inflate the bbox width and skew nx values.
// On first model load we measure the torso width from the mesh
// itself and store reference values.
var bodyRef=null; // {cy,minY,maxY,torsoHW,torsoHD,centerX,centerZ}

function measureBody(meshes,bbox){
  // Sample all vertices and find torso width (only vertices in the
  // vertical middle band where torso lives, excluding arms)
  var h=bbox.max.y-bbox.min.y;
  var cx=(bbox.max.x+bbox.min.x)/2;
  var cz=(bbox.max.z+bbox.min.z)/2;
  var torsoMinX=Infinity,torsoMaxX=-Infinity;
  var torsoMinZ=Infinity,torsoMaxZ=-Infinity;
  var wp=new THREE.Vector3();
  for(var mi=0;mi<meshes.length;mi++){
    var pos=meshes[mi].geometry.attributes.position;
    for(var i=0;i<pos.count;i++){
      wp.set(pos.getX(i),pos.getY(i),pos.getZ(i));
      meshes[mi].localToWorld(wp);
      var ny=(wp.y-bbox.min.y)/h;
      // Only sample the mid-torso band (navel area) to get true torso width
      if(ny>0.50&&ny<0.60){
        if(wp.x<torsoMinX)torsoMinX=wp.x;
        if(wp.x>torsoMaxX)torsoMaxX=wp.x;
        if(wp.z<torsoMinZ)torsoMinZ=wp.z;
        if(wp.z>torsoMaxZ)torsoMaxZ=wp.z;
      }
    }
  }
  var thw=Math.max((torsoMaxX-torsoMinX)/2,0.01);
  var thd=Math.max((torsoMaxZ-torsoMinZ)/2,0.01);
  return{minY:bbox.min.y,maxY:bbox.max.y,h:h,centerX:cx,centerZ:cz,torsoHW:thw,torsoHD:thd};
}

function muscleForVertex(x,y,z){
  if(!bodyRef)return null;
  var ny=(y-bodyRef.minY)/bodyRef.h;
  // Normalise X and Z relative to TORSO width, not full bbox
  var nx=(x-bodyRef.centerX)/bodyRef.torsoHW;
  var nz=(z-bodyRef.centerZ)/bodyRef.torsoHD;
  var anx=Math.abs(nx);

  // Head + neck (top ~13%)
  if(ny>0.87)return null;

  // Arms — anything outside the torso silhouette
  // torsoHW is measured from the waist, so anx > 1.0 = outside torso
  // Use graduated thresholds: shoulders are wider than waist
  var armT;
  if(ny>0.76)armT=1.35;      // shoulder joint area (wider)
  else if(ny>0.68)armT=1.20; // armpit level
  else if(ny>0.55)armT=1.10; // waist level
  else armT=1.40;            // hip level (wider pelvis)

  if(anx>armT){
    if(ny>0.76)return nz>0?'frontDelts':'rearDelts';
    if(ny>0.60)return nz>0?'biceps':'triceps';
    if(ny>0.40)return'forearms';
    return null; // hands
  }

  // --- TORSO & LEGS (anx <= armT) ---

  // Trap / neck region
  if(ny>0.80){
    if(nz<-0.15)return'traps';
    if(anx>1.0)return nz>0?'frontDelts':'rearDelts';
    return nz>0.15?'chest':'traps';
  }

  // Upper chest (pecs) / upper back — nipple line to shoulders
  if(ny>0.68){
    if(nz>0.15)return'chest';
    if(nz<-0.15)return'upperBack';
    if(anx>0.85)return'lats';
    return nz>0?'chest':'upperBack';
  }

  // Abs / obliques / lower back — below pecs to hip crease
  if(ny>0.48){
    if(nz>0.0){
      // Front: abs or obliques
      return anx>0.70?'obliques':'abs';
    }
    if(nz<0.0){
      // Back: lower back
      return anx>0.70?'obliques':'lowerBack';
    }
    return'abs';
  }

  // Hip / glutes
  if(ny>0.42){
    return nz<0?'glutes':'glutes';
  }

  // Upper legs — quads (front) / hamstrings (back)
  if(ny>0.22){
    if(nz>0.0)return'quads';
    return'hamstrings';
  }

  // Calves
  if(ny>0.05)return'calves';
  return null; // feet
}

var modelCache={};var activeKey=null;var activeMeshes=[];var activeBBox=null;
var desiredKey=null; // tracks which model the user actually wants displayed

function applyColors(){
  if(!bodyRef||activeMeshes.length===0)return;
  for(var m=0;m<activeMeshes.length;m++){
    var mesh=activeMeshes[m];var geo=mesh.geometry;var pos=geo.attributes.position;
    var count=pos.count;var colors=new Float32Array(count*3);var wp=new THREE.Vector3();
    for(var i=0;i<count;i++){
      wp.set(pos.getX(i),pos.getY(i),pos.getZ(i));mesh.localToWorld(wp);
      var mid=muscleForVertex(wp.x,wp.y,wp.z);
      var c=mid?getMusc(mid):SKIN;
      colors[i*3]=c[0];colors[i*3+1]=c[1];colors[i*3+2]=c[2];
    }
    geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    mesh.material.vertexColors=true;mesh.material.needsUpdate=true;
  }
}

function showModel(key){
  if(activeKey&&modelCache[activeKey])modelCache[activeKey].obj.visible=false;
  var c=modelCache[key];if(!c)return;
  c.obj.visible=true;activeKey=key;activeMeshes=c.meshes;activeBBox=c.bbox;
  bodyRef=measureBody(c.meshes,c.bbox);
  shadow.position.y=c.bbox.min.y;
  var mc2=new THREE.Vector3();c.bbox.getCenter(mc2);ctrl.target.copy(mc2);
  applyColors();hideLoader();
}

var gltfLoader=new THREE.GLTFLoader();
if(typeof THREE.DRACOLoader!=='undefined'){
  var dl=new THREE.DRACOLoader();
  dl.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  dl.setDecoderConfig({type:'js'});gltfLoader.setDRACOLoader(dl);
}

function b64toAB(b64){var raw=atob(b64);var ab=new ArrayBuffer(raw.length);var u8=new Uint8Array(ab);for(var i=0;i<raw.length;i++)u8[i]=raw.charCodeAt(i);return ab;}

var chunkBuf={};

function processChunks(key){
  var buf=chunkBuf[key];if(!buf)return;
  log('Assembling '+key+'...');
  var b64=buf.parts.join('');delete chunkBuf[key];
  log('Parsing '+key+' ('+Math.round(b64.length/1024)+'KB)...');
  var buffer=b64toAB(b64);
  gltfLoader.parse(buffer,'',function(gltf){
    var model=gltf.scene;
    var box=new THREE.Box3().setFromObject(model);
    var size=new THREE.Vector3();box.getSize(size);
    var s=1.8/Math.max(size.y,0.001);model.scale.set(s,s,s);
    box.setFromObject(model);
    var c2=new THREE.Vector3();box.getCenter(c2);
    model.position.sub(c2);model.position.y+=0.9;
    var bbox=new THREE.Box3().setFromObject(model);
    var meshes=[];
    model.traverse(function(child){
      if(child.isMesh){
        child.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.50,metalness:0.05,color:0xFFFFFF});
        meshes.push(child);
      }
    });

    model.visible=false;scene.add(model);
    modelCache[key]={obj:model,bbox:bbox,meshes:meshes};
    // Only show this model if it's the one the user wants
    if(key===desiredKey||!activeKey)showModel(key);
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'modelReady',key:key}));}catch(e){}
  },function(err){
    log(key+' parse error: '+(err&&err.message||err));statusEl.style.color='#EF4444';
  });
}

window._handleB3D=function(d){
  try{
    var m=JSON.parse(d);
    if(m.type==='chunkStart'){
      chunkBuf[m.key]={total:m.total,parts:[],received:0};
      log('Loading '+m.key+'...');
    }
    else if(m.type==='chunk'){
      var buf=chunkBuf[m.key];
      if(buf){buf.parts[m.i]=m.d;buf.received++;
        var pct=Math.round(buf.received/buf.total*100);
        log('Loading '+m.key+'... '+pct+'%');
      }
    }
    else if(m.type==='chunkEnd'){processChunks(m.key);}
    else if(m.type==='switchTo'){
      desiredKey=m.key;
      if(modelCache[m.key]){showModel(m.key);}
      else{showLoader();log('Loading '+m.key+'...');}
    }
    else if(m.type==='updateScores'){scores=m.scores||{};applyColors();}
    else if(m.type==='selectMuscle'){selectedMuscle=m.muscleId||'';}
  }catch(e){log('Error: '+e.message);}
};
window.addEventListener('message',function(e){window._handleB3D(e.data);});
document.addEventListener('message',function(e){window._handleB3D(e.data);});

var raycaster=new THREE.Raycaster();var pointer=new THREE.Vector2();var pDown=null;
renderer.domElement.addEventListener('pointerdown',function(e){pDown={x:e.clientX,y:e.clientY,t:Date.now()};ctrl.autoRotate=false;});
renderer.domElement.addEventListener('pointerup',function(e){
  if(!pDown)return;var dx=e.clientX-pDown.x,dy=e.clientY-pDown.y;
  if(Math.sqrt(dx*dx+dy*dy)>14||Date.now()-pDown.t>350){pDown=null;return;}
  pDown=null;pointer.x=(e.clientX/W)*2-1;pointer.y=-(e.clientY/H)*2+1;
  raycaster.setFromCamera(pointer,camera);
  var hits=raycaster.intersectObjects(activeMeshes,true);
  if(hits.length>0&&bodyRef){var pt=hits[0].point;var mid=muscleForVertex(pt.x,pt.y,pt.z);
    if(mid){selectedMuscle=mid;try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'muscleTapped',muscleId:mid}));}catch(e){}}
  }
});
var idleT;ctrl.addEventListener('end',function(){clearTimeout(idleT);idleT=setTimeout(function(){ctrl.autoRotate=true;},4000);});

try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));}catch(e){}

function animate(){requestAnimationFrame(animate);ctrl.update();renderer.render(scene,camera);}
animate();
window.addEventListener('resize',function(){var w=window.innerWidth,h=window.innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);});
})();
<\/script>
</body></html>`;
}

const MODEL_DATA = {
  male: MALE_MODEL_B64,
  female: FEMALE_MODEL_B64,
};

const BodyMap3D = ({ scores = {}, gender = 'male', selectedMuscle, onMusclePress, height = 480 }) => {
  const webviewRef = useRef(null);
  const initialHTML = useRef(buildHTML(scores, selectedMuscle));
  const ready = useRef(false);
  const sentModels = useRef({});
  const currentGender = useRef(gender);

  const send = useCallback((msg) => {
    const js = `try{window._handleB3D(${JSON.stringify(JSON.stringify(msg))})}catch(e){}true;`;
    webviewRef.current?.injectJavaScript(js);
  }, []);

  // Send model base64 in chunks to WebView
  const sendModelChunks = useCallback((key) => {
    const b64 = MODEL_DATA[key];
    if (!b64) return;

    const total = Math.ceil(b64.length / CHUNK_SIZE);
    console.log(`[BodyMap3D] Sending ${key} in ${total} chunks (${Math.round(b64.length / 1024)}KB)`);

    send({ type: 'chunkStart', key, total });

    let i = 0;
    function sendNext() {
      if (i >= total) {
        send({ type: 'chunkEnd', key });
        sentModels.current[key] = true;
        return;
      }
      const chunk = b64.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const js = `try{window._handleB3D(JSON.stringify({type:'chunk',key:'${key}',i:${i},d:'${chunk}'}))}catch(e){}true;`;
      webviewRef.current?.injectJavaScript(js);
      i++;
      setTimeout(sendNext, 16);
    }
    sendNext();
  }, [send]);

  const loadModel = useCallback((key, preload = false) => {
    if (!preload) {
      // Tell WebView this is the desired model to display
      send({ type: 'switchTo', key });
    }
    if (!sentModels.current[key]) {
      sendModelChunks(key);
    }
  }, [send, sendModelChunks]);

  const handleMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        ready.current = true;
        loadModel(currentGender.current, false);
        // Preload other gender in background (won't auto-display)
        const other = currentGender.current === 'male' ? 'female' : 'male';
        setTimeout(() => loadModel(other, true), 2000);
      }
      if (msg.type === 'muscleTapped' && msg.muscleId) {
        onMusclePress?.(msg.muscleId);
      }
    } catch (e) {}
  }, [onMusclePress, loadModel]);

  useEffect(() => {
    currentGender.current = gender;
    if (!ready.current) return;
    loadModel(gender);
  }, [gender, loadModel]);

  useEffect(() => { send({ type: 'updateScores', scores }); }, [scores, send]);
  useEffect(() => { send({ type: 'selectMuscle', muscleId: selectedMuscle || '' }); }, [selectedMuscle, send]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webviewRef}
        source={{ html: initialHTML.current }}
        style={styles.webview}
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        originWhitelist={['*']}
        mixedContentMode="always"
        androidLayerType="hardware"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        allowsLinkPreview={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', overflow: 'hidden', borderRadius: 20 },
  webview: { flex: 1, backgroundColor: 'transparent' },
});

export default BodyMap3D;
