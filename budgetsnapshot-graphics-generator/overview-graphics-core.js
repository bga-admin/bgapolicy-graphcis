/* Shared by the overview editor, standalone exports, and the batch builder. */
'use strict';
const OverviewGraphics = (() => {
 const api=CustomGraphics,esc=api.escape;
 const priceStyle=`[data-overview-basis][hidden]{display:none!important}.overview-price-switch{display:inline-flex;align-items:center;gap:10px;border:0;background:transparent;padding:12px 28px;color:#213747;font:600 13px Synthese,Arial,sans-serif;cursor:pointer}.overview-price-track{position:relative;width:42px;height:24px;border-radius:20px;background:#b6c2ca}.overview-price-track:after{content:'';position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:white}.overview-price-switch[aria-checked=true] .overview-price-track{background:#3e6f8c}.overview-price-switch[aria-checked=true] .overview-price-track:after{transform:translateX(18px)}.overview-price-switch:focus-visible{outline:2px solid #3e6f8c;outline-offset:2px}`;
 function priceRuntime(root){
  const button=root.querySelector('[data-overview-price-toggle]');if(!button)return;
  button.addEventListener('click',()=>{
   const adjusted=button.getAttribute('aria-checked')!=='true';
   button.setAttribute('aria-checked',String(adjusted));
   root.querySelectorAll('[data-overview-basis]').forEach(panel=>{panel.hidden=panel.getAttribute('data-overview-basis')!==(adjusted?'adjusted':'original');});
   // Editors can keep exports in sync with the visible basis.
   root.dispatchEvent(new CustomEvent('overview-basis-change',{bubbles:true,detail:{basis:adjusted?'adjusted':'original'}}));
  });
 }
 function basisGrid(chart,basis){
  if(chart.kind!=='price-toggle')return chart.grid;
  const column=basis==='adjusted'?2:1;
  return [[chart.grid[0][0],chart.grid[0][column]],...chart.grid.slice(1).map(row=>[row[0],row[column]])];
 }
 function namespaced(svg,id){return svg.replace('<svg ',`<svg data-budget-graphic="${id}" `).replaceAll('graphic-title',id+'-title').replaceAll('graphic-description',id+'-description');}
 function summary(chart){
  const {grid,config}=chart,W=1100,pad=28,widths=[160,170,170,145,105,150,144],positions=widths.map((_,i)=>pad+widths.slice(0,i).reduce((a,b)=>a+b,0));
  const text=(x,y,value,size=12,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${esc(value)}</text>`;
  const lines=(x,y,values,size=12,extra='',lineHeight=17)=>values.map((v,i)=>text(x,y+i*lineHeight,v,size,extra)).join('');
  const title=api.wrap(config.title,65);let y=38;
  let content=lines(pad,y,title,28,'font-weight="700"',32);y+=title.length*32+18;
  if(config.subtitle){const sub=api.wrap(config.subtitle,120);content+=lines(pad,y,sub,14,'fill="#6f808b"');y+=sub.length*18+14;}
  const headers=grid[0].map((h,i)=>api.wrap(h||'Metric',Math.floor(widths[i]/8)-1));const headerHeight=Math.max(...headers.map(h=>h.length))*17+18;
  headers.forEach((header,i)=>{content+=lines(positions[i]+8,y,header,14,'font-weight="700" fill="#294f68"');});y+=headerHeight;
  content+=`<line x1="28" x2="1072" y1="${y-14}" y2="${y-14}" stroke="#d8e1e6"/>`;
  grid.slice(1).forEach((row,i)=>{
   content+=`<rect x="28" y="${y-6}" width="1044" height="62" fill="${i%2?'#f7fafc':'white'}"/>`;
   row.forEach((value,j)=>{
    let display=String(value);if(j>0){const n=api.number(value);display=n===null?'N/A':j>=4?n.toLocaleString('en-US',{maximumFractionDigits:1})+'%':(i===0?'$':'')+n.toLocaleString('en-US',{maximumFractionDigits:0});}
    const change=j>=3?api.number(value):null;
    const color=change===null?'#213747':change>0?'#3e6f8c':change<0?'#8b6472':'#6f808b';
    content+=text(positions[j]+8,y+29,display,16,j===0?'font-weight="600" fill="#294f68"':`fill="${color}"${j>=3?' font-weight="700"':''}`);
   });y+=62;
  });
  for(const value of [config.source,config.hideNotes?null:config.note].filter(Boolean)){const parts=api.wrap(value,142);content+=lines(pad,y+28,parts,11,'fill="#6f808b"');y+=parts.length*17+17;}
  const height=y+32;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-labelledby="graphic-title graphic-description" style="width:100%;height:auto;background:white;font-family:Synthese,Helvetica Neue,Arial,sans-serif;fill:#213747"><title id="graphic-title">${esc(config.title)}</title><desc id="graphic-description">${esc(grid.map(r=>r.join(': ')).join('; '))}</desc><metadata>${esc(JSON.stringify({generator:'BGA Custom Graphics',config,grid}))}</metadata><rect width="100%" height="100%" fill="white"/>${content}</svg>`;
  return {svg,width:W,height};
 }
 function render(chart,basis=chart.basis||'original'){
  if(chart.kind==='summary')return summary(chart);
  return api.render({...chart.config,tooltipDecimals:chart.config.format==='percent'?1:0,tooltipTrimZeros:true,...(chart.kind==='price-toggle'?{legend:true,note:(basis==='adjusted'?'Values in 2025 dollars. ':'Values in original dollars. ')+(chart.config.note||'')}:{} ),...(chart.config.hideNotes?{note:''}:{})},basisGrid(chart,basis));
 }
 function fragment(chart){
  const id=api.astroId(chart.config);
  if(chart.kind!=='price-toggle')return `<figure class="bga-custom-graphic" data-budget-figure="${id}" style="margin:24px 0;width:100%">${namespaced(render(chart).svg,id)}</figure>`;
  const basis=chart.basis||'original';
  const panels=['original','adjusted'].map(view=>`<div data-overview-basis="${view}"${view!==basis?' hidden':''}>${namespaced(render(chart,view).svg,id+'-'+view).replace(`data-budget-graphic="${id}-${view}"`,`data-budget-graphic="${id}"`)}</div>`).join('');
  return `<figure class="bga-custom-graphic" data-budget-figure="${id}" style="margin:24px 0;width:100%"><style>${priceStyle}</style><button type="button" class="overview-price-switch" data-overview-price-toggle role="switch" aria-checked="${basis==='adjusted'}" aria-label="Inflation adjusted (2025 dollars)"><span class="overview-price-track" aria-hidden="true"></span>Inflation adjusted (2025 dollars)</button>${panels}\x3Cscript>(${priceRuntime.toString()})(document.currentScript.closest('figure'));<`+`/script></figure>`;
 }
 function htmlExport(chart){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(chart.config.title)}</title><style>body{margin:0;color:#213747;background:white}main{max-width:1100px;margin:auto}svg{display:block;width:100%;height:auto}</style></head><body><main>${fragment(chart)}</main>\x3C/body>\x3C/html>`;}
 function summaryFiles(chart){
  const row=(id,index)=>{const values=chart.grid[index];return {id,label:values[0],previous:api.number(values[1]),current:api.number(values[2]),net:api.number(values[3]),percent:api.number(values[4]),averageRatePct:api.number(values[5]),inflationRatePct:api.number(values[6])};};
  return {
   'manifest.json':JSON.stringify({schemaVersion:1,generator:'BGA Overview Graphics',graphics:[]},null,2),
   'summary.json':JSON.stringify({schemaVersion:1,previousYear:2026,currentYear:2027,rows:[row('appropriations',1),row('positions',2)]},null,2)
  };
 }
 function astroFiles(chart){
  const exported=api.astroFiles(chart.config,chart.grid),{id,files}=exported,prefix=id+'/';
  files[prefix+id+'.html']=fragment(chart);
  files[prefix+'preview.html']=htmlExport(chart);
  files[prefix+id+'.svg']=namespaced(render(chart).svg,id);
  files[prefix+id+'.json']=JSON.stringify({version:1,config:chart.config,grid:chart.grid,overview:{kind:chart.kind||'chart',basis:chart.basis||'original',sourceChartId:chart.sourceChartId}},null,2);
  if(chart.kind==='price-toggle')for(const basis of ['original','adjusted'])files[prefix+id+'-'+basis+'.svg']=namespaced(render(chart,basis).svg,id+'-'+basis);
  const manifest=JSON.parse(files[prefix+'manifest.json']);
  manifest.graphics[0].kind=chart.kind||'chart';
  if(chart.kind==='price-toggle')manifest.graphics[0].views={original:id+'-original.svg',adjusted:id+'-adjusted.svg'};
  files[prefix+'manifest.json']=JSON.stringify(manifest,null,2);
  files[prefix+'README.txt']+='\nEdit this chart in the 2027 Overview Graphics tool. HTML and Astro exports preserve the price switch and both data views when present. SVG exports contain the selected view; both price-view SVGs are included in this ZIP.\n';
  if(chart.kind==='summary')Object.assign(files,summaryFiles(chart));
  return exported;
 }
 function mount(root,chart){
  root.innerHTML=fragment(chart);
  root.querySelectorAll('svg').forEach(api.tooltipRuntime);
  priceRuntime(root.querySelector('figure'));
 }
 return {basisGrid,render,fragment,htmlExport,astroFiles,mount,priceRuntime};
})();
