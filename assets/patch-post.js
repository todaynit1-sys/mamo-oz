/* 오존 핫스팟 진단기 — 지도 도구 패치 (후행, app.js 뒤에 실행)
 * 배경지도 선택 드롭다운 · 회색/밝기 조절(CSS 필터) · 거리 측정 · 축척 막대 · 좌표 표시
 * 스타일은 assets/map-tools.css 에 있다.
 */
(function(){
  'use strict';
  var TILES = window.__TILES__ || [];
  var KEY_T = 'ozoneDx.tileIdx', KEY_G = 'ozoneDx.gray', KEY_B = 'ozoneDx.bright';
  var refLayer = null, measOn = false, measPts = [], measLayer = null;

  function ls(k, v){ try{ if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){ return null; } }

  /* ---------- 배경 타일 회색도·밝기 (타일 서버와 무관하게 CSS 로 처리) ---------- */
  function applyFilter(){
    var g = +(document.getElementById('grayR')||{}).value;
    var b = +(document.getElementById('brightR')||{}).value;
    if (isNaN(g)) g = 55; if (isNaN(b)) b = 105;
    var pane = document.querySelector('.leaflet-tile-pane');
    if (pane) pane.style.filter = 'grayscale(' + (g/100) + ') brightness(' + (b/100) + ')';
    var gv = document.getElementById('grayV'), bv = document.getElementById('brightV');
    if (gv) gv.textContent = g + '%';
    if (bv) bv.textContent = b + '%';
    ls(KEY_G, g); ls(KEY_B, b);
  }

  /* ---------- 라벨 오버레이 (위성 등) ---------- */
  function syncRef(){
    try{
      if (refLayer && S.map){ S.map.removeLayer(refLayer); refLayer = null; }
      if (S.tileOffline) return;
      var s = TILES[S.tileIdx];
      if (s && s.ref && S.map) refLayer = L.tileLayer(s.ref, {zIndex:350, maxZoom:19}).addTo(S.map);
    }catch(e){}
  }

  function syncSelect(){
    var sel = document.getElementById('tilePick');
    if (sel) sel.value = S.tileOffline ? 'off' : String(S.tileIdx);
    var badge = document.getElementById('tileBadge');
    if (badge) badge.style.display = S.tileOffline ? '' : 'none';
  }

  /* 앱 내부의 자동 대체 호출까지 잡기 위해 전역 함수를 감싼다 */
  var origAdd = window.addTileLayer;
  window.addTileLayer = function(){
    var r = origAdd.apply(this, arguments);
    try{
      syncRef(); syncSelect(); applyFilter();
      if (!S.tileOffline) ls(KEY_T, String(S.tileIdx));
    }catch(e){}
    return r;
  };

  function clearOffline(){
    try{
      S.tileOffline = false;
      if (S.offlineLayer && S.map){ S.map.removeLayer(S.offlineLayer); S.offlineLayer = null; }
      var md = document.getElementById('map');
      if (md) md.style.background = '';
    }catch(e){}
  }

  /* ---------- 거리 측정 ---------- */
  function fmtDist(m){ return m < 1000 ? Math.round(m) + ' m' : (m/1000).toFixed(2) + ' km'; }

  function measClear(){
    measPts = [];
    if (measLayer && S.map){ S.map.removeLayer(measLayer); }
    measLayer = null;
    var mi = document.getElementById('measInfo');
    if (mi){ mi.style.display = 'none'; mi.textContent = ''; }
  }

  function measDraw(){
    if (!S.map) return;
    if (measLayer) S.map.removeLayer(measLayer);
    measLayer = L.layerGroup().addTo(S.map);
    var tot = 0;
    measPts.forEach(function(p, i){
      L.circleMarker(p, {radius:4, color:'#d64541', weight:2, fillColor:'#fff', fillOpacity:1}).addTo(measLayer);
      if (i > 0) tot += S.map.distance(measPts[i-1], p);
    });
    if (measPts.length > 1){
      L.polyline(measPts, {color:'#d64541', weight:2, dashArray:'5,4'}).addTo(measLayer);
      L.marker(measPts[measPts.length-1], {icon:L.divIcon({className:'', html:
        '<div style="background:#d64541;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;white-space:nowrap;">'
        + fmtDist(tot) + '</div>', iconAnchor:[0,26]})}).addTo(measLayer);
    }
    var mi = document.getElementById('measInfo');
    if (mi){
      mi.style.display = 'block';
      mi.textContent = measPts.length < 2 ? '시작점 선택됨 · 다음 지점 클릭'
        : (measPts.length + '개 지점 · 누적 ' + fmtDist(tot));
    }
  }

  function onMapClick(e){ if (!measOn) return; measPts.push(e.latlng); measDraw(); }

  function measToggle(){
    measOn = !measOn;
    var btn = document.getElementById('measBtn');
    if (btn){ btn.classList.toggle('on', measOn); btn.textContent = measOn ? '📏 측정 종료 (ESC)' : '📏 거리 측정'; }
    var c = document.getElementById('map');
    if (c) c.style.cursor = measOn ? 'crosshair' : '';
    if (!measOn) measClear();
  }

  /* ---------- 지도 위 도구 패널 ---------- */
  function buildPanel(){
    var mapDiv = document.getElementById('map');
    if (!mapDiv || document.getElementById('mapPanel')) return;
    if (getComputedStyle(mapDiv).position === 'static') mapDiv.style.position = 'relative';
    var g = ls(KEY_G) || 55, b = ls(KEY_B) || 105;
    var d = document.createElement('div');
    d.id = 'mapPanel'; d.className = 'mapTool';
    d.innerHTML =
      '<div class="ttl">지도 도구</div>' +
      '<label>회색 <input type="range" id="grayR" min="0" max="100" value="' + g + '"><span class="v" id="grayV"></span></label>' +
      '<label>밝기 <input type="range" id="brightR" min="70" max="140" value="' + b + '"><span class="v" id="brightV"></span></label>' +
      '<button id="measBtn">📏 거리 측정</button>' +
      '<div id="measInfo"></div>' +
      '<div class="hint">회색·밝기를 올리면 측정점 색이 더 잘 보입니다. 설정은 다음에 열 때도 유지됩니다.</div>';
    mapDiv.appendChild(d);
    L.DomEvent.disableClickPropagation(d);
    L.DomEvent.disableScrollPropagation(d);
    document.getElementById('grayR').addEventListener('input', applyFilter);
    document.getElementById('brightR').addEventListener('input', applyFilter);
    document.getElementById('measBtn').addEventListener('click', measToggle);
    applyFilter();
  }

  function buildSelect(){
    var badge = document.getElementById('tileBadge');
    if (!badge || document.getElementById('tilePick')) return;
    var sel = document.createElement('select');
    sel.id = 'tilePick'; sel.title = '배경지도 선택';
    TILES.forEach(function(t, i){
      var o = document.createElement('option'); o.value = String(i); o.textContent = t.name; sel.appendChild(o);
    });
    var o2 = document.createElement('option'); o2.value = 'off'; o2.textContent = '오프라인 격자'; sel.appendChild(o2);
    sel.addEventListener('change', function(){
      try{
        if (sel.value === 'off'){
          if (typeof enableOfflineBackground === 'function') enableOfflineBackground();
          if (refLayer && S.map){ S.map.removeLayer(refLayer); refLayer = null; }
          var bg = document.getElementById('tileBadge');
          if (bg){ bg.style.display = ''; bg.innerHTML = '🗺 오프라인 격자 배경 (직접 선택)'; }
          return;
        }
        clearOffline();
        addTileLayer(parseInt(sel.value, 10));
      }catch(e){}
    });
    badge.parentNode.insertBefore(sel, badge.nextSibling);
  }

  function buildMapControls(){
    if (!S.map || S.map.__v164) return;
    S.map.__v164 = true;
    L.control.scale({imperial:false, position:'bottomleft', maxWidth:140}).addTo(S.map);
    var Coord = L.Control.extend({
      options:{position:'bottomleft'},
      onAdd:function(){
        var el = L.DomUtil.create('div', 'mapCoord');
        el.textContent = '위도, 경도';
        this._el = el; return el;
      }
    });
    var cc = new Coord(); cc.addTo(S.map);
    S.map.on('mousemove', function(e){
      if (cc._el) cc._el.textContent = e.latlng.lat.toFixed(5) + ', ' + e.latlng.lng.toFixed(5);
    });
    S.map.on('click', onMapClick);
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && measOn) measToggle();
    });
  }

  function restore(){
    try{
      var v = parseInt(ls(KEY_T), 10);
      if (!isNaN(v) && v >= 0 && v < TILES.length && v !== S.tileIdx && !S.tileOffline) addTileLayer(v);
    }catch(e){}
  }

  var inited = false;
  function init(){
    try{
      buildSelect(); buildPanel(); buildMapControls();
      if (!inited && typeof S !== 'undefined' && S.map){ inited = true; restore(); }
      syncRef(); syncSelect(); applyFilter();
    }catch(e){}
  }
  init();
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 600);
  setTimeout(init, 1800);
})();