/* 오존 핫스팟 진단기 — 배경지도 패치 (선행, app.js 보다 먼저 실행)
 * 검증 결과(시화 지역 줌 17~19 실측):
 *   - CARTO 기본지도      : API 키 요구 → 타일에 "API KEY REQUIRED" 인쇄
 *   - OSM 공식 타일서버   : file:// 로컬 파일 요청을 403 차단
 *   - Esri 일반지도/지형도: 국내 고배율 타일 없음 → "Map data not yet available"
 *   - VWorld(국토지리정보원), Esri World_Imagery : 정상 (줌 19까지)
 * 그래서 아래 목록만 남기고, 앱이 선언하는 CARTO 목록은 무시한다.
 */
(function(){
  'use strict';
  var RET  = !!(L.Browser && L.Browser.retina);
  var MNZ  = RET ? 18 : 19;   /* detectRetina 는 요청 줌을 +1 하므로 상한을 한 단계 낮춘다 */
  var V    = 'https://xdworld.vworld.kr/2d/';
  var TILES = [
    {name:'VWorld 일반지도', url:V+'Base/service/{z}/{x}/{y}.png',
     sub:'', attr:'&copy; VWorld (국토지리정보원)', mnz:MNZ},
    {name:'VWorld 항공사진', url:V+'Satellite/service/{z}/{x}/{y}.jpeg',
     ref:V+'Hybrid/service/{z}/{x}/{y}.png',
     sub:'', attr:'&copy; VWorld (국토지리정보원)', mnz:MNZ},
    {name:'위성 영상 (Esri)',
     url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
     sub:'', attr:'Tiles &copy; Esri', mnz:MNZ},
    {name:'OSM (웹 배포용)', url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
     sub:'', attr:'&copy; OpenStreetMap contributors', mnz:MNZ}
  ];
  window.__TILES__ = TILES;

  try{
    Object.defineProperty(window, 'TILE_SOURCES', {
      configurable:true, get:function(){ return TILES; }, set:function(){}
    });
  }catch(e){}

  try{
    var orig = L.tileLayer;
    var wrap = function(url, opts){
      opts = opts || {};
      for (var i=0;i<TILES.length;i++){
        if (TILES[i].url === url || TILES[i].ref === url){
          opts.maxNativeZoom = TILES[i].mnz;
          opts.detectRetina  = true;
          break;
        }
      }
      return orig(url, opts);
    };
    for (var k in orig){ if (Object.prototype.hasOwnProperty.call(orig,k)) wrap[k]=orig[k]; }
    L.tileLayer = wrap;
  }catch(e){}
})();
/* 대기배출사업장 마커: 농도(원형)와 구분되도록 공장 아이콘 사각형으로 표출 */
(function(){
  'use strict';
  var cache = {};
  var SVG = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">'
          + '<path fill="#fff" d="M1 15V8l4 2.5V8l4 2.5V8l4 2.5V2h2v13z"/></svg>';
  window.facIcon = function(color){
    if (!cache[color]){
      cache[color] = L.divIcon({
        className: 'fac-ic',
        html: '<div class="fac-ic-box" style="background:'+color+'">'+SVG+'</div>',
        iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10]
      });
    }
    return cache[color];
  };
})();
