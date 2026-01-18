
(function(){
  const ZONES={
    "text-first":{header:{y:0,h:0.32},body:{y:0.32,h:0.43},footer:{y:0.75,h:0.25}},
    "image-led":{hero:{y:0,h:0.65},support:{y:0.65,h:0.20},footer:{y:0.85,h:0.15}},
    "split-hero":{left:{x:0,w:0.5},right:{x:0.5,w:0.5}},
    "minimal":{focus:{y:0.15,h:0.7}},
    "dense":{header:{y:0,h:0.2},grid:{y:0.2,h:0.6},footer:{y:0.8,h:0.2}}
  };
  function getZones(f){return ZONES[f]||ZONES["text-first"];}
  try{if(typeof module!=="undefined")module.exports={getZones};
      if(typeof window!=="undefined")window.NexoraZones={getZones};}catch(_){}
})();
