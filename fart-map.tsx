import { useEffect, useRef, useState, type ComponentType } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

// Les types de WebView ne suivent pas encore React 19 : on les assouplit ici
const WV = WebView as unknown as ComponentType<any>;

import { kindInfo, type Fart } from '@/lib/types';

/**
 * Carte OpenStreetMap (Leaflet) dans une WebView : aucune clé API à configurer,
 * même rendu sur iPhone et Android.
 * Pour un gros lancement, remplacer TILE_URL par un fournisseur de tuiles (MapTiler, Stadia…).
 */
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
 html,body,#map{margin:0;height:100%;background:#FFF8EC}
 .pin{font-size:26px;line-height:26px;text-align:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}
 .pin span{display:block;border-radius:50%;width:34px;height:34px;line-height:34px}
 .me span{background:#7BC043}.friend span{background:#F4A62A}.victim span{background:#D9534F}
 .leaflet-popup-content{font:14px -apple-system,Roboto,sans-serif;color:#3B2A1A}
 .act{display:inline-block;margin-top:6px;color:#4E8A22;font-weight:700}
 .you{width:16px;height:16px;border-radius:50%;background:#2a7ef4;border:3px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.4)}
</style></head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false}).setView([46.6,2.4],5);
L.tileLayer('${TILE_URL}',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
var layer=L.layerGroup().addTo(map), meMarker=null, centered=false;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function send(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))}
window.setFarts=function(list){
  layer.clearLayers();
  list.forEach(function(f){
    var icon=L.divIcon({className:'pin '+f.cls,html:'<span>'+esc(f.emoji)+'</span>',iconSize:[34,34],iconAnchor:[17,17]});
    var html='<b>'+esc(f.emoji+' '+f.who+' — '+f.kind)+'</b><br>💪 '+f.power+'/5 · 👃 '+f.smell+'/5 · 🤫 '+f.discretion+'/5'
      +(f.victim?'<br><b>Oups, sur '+esc(f.victim)+' xD</b>':'')
      +(f.note?'<br><i>« '+esc(f.note)+' »</i>':'')
      +'<br><small>'+esc(f.date)+'</small><br><a class="act" href="#" onclick="send({action:\\'fart\\',id:'+f.id+'});return false;">'+(f.mine?'Supprimer…':'Signaler…')+'</a>';
    L.marker([f.lat,f.lng],{icon:icon}).bindPopup(html).addTo(layer);
  });
};
window.setMe=function(lat,lng){
  if(meMarker)meMarker.setLatLng([lat,lng]);
  else meMarker=L.marker([lat,lng],{icon:L.divIcon({className:'',html:'<div class="you"></div>',iconSize:[22,22]})}).addTo(map);
  if(!centered){centered=true;map.setView([lat,lng],14);}
};
send({action:'ready'});
</script></body></html>`;

type Props = {
  farts: Fart[];
  me: string;
  myPosition: { lat: number; lng: number } | null;
  onFartPress: (f: Fart) => void;
};

export function FartMap({ farts, me, myPosition, onFartPress }: Props) {
  const ref = useRef<{ injectJavaScript: (js: string) => void } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const data = farts.map((f) => {
      const k = kindInfo(f.kind);
      return {
        id: f.id,
        lat: f.lat,
        lng: f.lng,
        emoji: k.emoji,
        kind: k.label,
        who: f.user_id === me ? 'Toi' : (f.author?.display_name ?? 'Un ami'),
        cls: f.victim_id === me ? 'victim' : f.user_id === me ? 'me' : 'friend',
        mine: f.user_id === me,
        power: f.power,
        smell: f.smell,
        discretion: f.discretion,
        note: f.note,
        victim: f.victim_id === me ? 'toi 😱' : (f.victim_name ?? (f.victim_id ? 'un ami' : null)),
        date: new Date(f.created_at).toLocaleString('fr-FR'),
      };
    });
    ref.current?.injectJavaScript(`window.setFarts(${JSON.stringify(data)});true;`);
  }, [ready, farts, me]);

  useEffect(() => {
    if (ready && myPosition) {
      ref.current?.injectJavaScript(`window.setMe(${myPosition.lat},${myPosition.lng});true;`);
    }
  }, [ready, myPosition]);

  function onMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.action === 'ready') setReady(true);
      if (msg.action === 'fart') {
        const f = farts.find((x) => x.id === msg.id);
        if (f) onFartPress(f);
      }
    } catch {}
  }

  return (
    <WV
      ref={ref}
      style={StyleSheet.absoluteFill}
      originWhitelist={['*']}
      source={{ html: HTML, baseUrl: 'https://proutmap.local/' }}
      onMessage={onMessage}
      javaScriptEnabled
    />
  );
}
