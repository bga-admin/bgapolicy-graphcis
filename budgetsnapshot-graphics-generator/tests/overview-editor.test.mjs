import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(new URL('../../bga-budget-snapshots-astro/package.json',import.meta.url));
const {load}=require('cheerio');
const html=readFileSync(new URL('../previews/2027-overview/index.html',import.meta.url),'utf8');

test('Live Server injects reload code after the complete overview scripts',()=>{
 const served=html.replace(/<\/body>/i,'<script>window.__liveReload = true;</script></body>');
 const $=load(served);
 assert.equal($('script').length,5);
 assert.match($('#overview-core').text(),/return \{basisGrid,render,fragment,htmlExport,astroFiles,mount,priceRuntime\};\s*\}\)\(\);\s*$/);
 for(const script of $('script').toArray()){
  if($(script).attr('type')!=='application/json')assert.doesNotThrow(()=>new vm.Script($(script).text()));
 }
 assert.equal($('body > script').last().text(),'window.__liveReload = true;');
});

// Execute the actual editor and exports with a DOM adapter. Browser layout is
// excluded; data editing, switches, validation, clipboard and downloads run.
function editor(){
 const $=load(html),cache=new WeakMap(),downloads=[],copied=[],blobs=new Map(),storage=new Map();
 class Element {
  constructor(node){this.node=node;this.listeners={};this.style={};}
  get textContent(){return $(this.node).text();}set textContent(v){$(this.node).text(v);}
  get innerHTML(){return $(this.node).html();}set innerHTML(v){$(this.node).html(v);}
  get outerHTML(){return $.html(this.node);}
  get dataset(){return Object.fromEntries(Object.entries(this.node.attribs||{}).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v]));}
  get value(){return this._value??$(this.node).val()??'';}set value(v){this._value=String(v);$(this.node).val(String(v));}
  get hidden(){return $(this.node).attr('hidden')!==undefined;}set hidden(v){v?this.setAttribute('hidden',''):this.removeAttribute('hidden');}
  get disabled(){return $(this.node).attr('disabled')!==undefined;}set disabled(v){v?this.setAttribute('disabled',''):this.removeAttribute('disabled');}
  get checked(){return this._checked??$(this.node).attr('checked')!==undefined;}set checked(v){this._checked=v;}
  get classList(){return {toggle:(name,value)=>{const next=value??!$(this.node).hasClass(name);$(this.node).toggleClass(name,next);return next;}};}
  get ownerDocument(){return document;}
  get ownerSVGElement(){return wrap($(this.node).closest('svg')[0]);}
  setAttribute(k,v){$(this.node).attr(k,String(v));}getAttribute(k){return $(this.node).attr(k)??null;}removeAttribute(k){$(this.node).removeAttr(k);}
  querySelector(s){return wrap($(this.node).find(s)[0]);}querySelectorAll(s){return $(this.node).find(s).toArray().map(wrap);}
  matches(s){return $(this.node).is(s);}closest(s){return wrap($(this.node).closest(s)[0]);}
  append(...nodes){$(this.node).append(...nodes.map(n=>n.node));}remove(){$(this.node).remove();}
  replaceChildren(){$(this.node).empty();}focus(){}select(){}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  dispatchEvent(event){event.target??=this;event.preventDefault??=()=>{};for(const fn of this.listeners[event.type]||[])fn(event);if(event.bubbles&&this.node.parent)wrap(this.node.parent)?.dispatchEvent(event);return true;}
  fire(type,options={}){return this.dispatchEvent({type,target:this,bubbles:true,...options});}
  click(){if(this.disabled)return;this.onclick?.({target:this});this.fire('click');if(this.node.name==='a'&&this.href?.startsWith('blob:'))downloads.push({name:this.download,blob:blobs.get(this.href)});}
 }
 function wrap(node){if(!node||node.type==='root')return null;if(!cache.has(node))cache.set(node,new Element(node));return cache.get(node);}
 const document={getElementById:id=>wrap($('#'+id)[0]),querySelector:s=>wrap($(s)[0]),querySelectorAll:s=>$(s).toArray().map(wrap),createElement:tag=>wrap($('<'+tag+'>')[0]),createElementNS:(_,tag)=>wrap($('<'+tag+'>')[0]),body:wrap($('body')[0])};
 const context=vm.createContext({document,TextEncoder,Blob,structuredClone,console,CustomEvent:class{constructor(type,init){this.type=type;Object.assign(this,init);}},URL:{createObjectURL(blob){const id='blob:'+blobs.size;blobs.set(id,blob);return id;},revokeObjectURL(){}},setTimeout(){},navigator:{clipboard:{async writeText(text){copied.push(text);}}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
 for(const script of $('script').toArray())if($(script).attr('type')!=='application/json')vm.runInContext($(script).text(),context);
 return {document,$,context,downloads,copied,storage,el:s=>document.querySelector(s)};
}
async function unzip(blob){
 const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),decoder=new TextDecoder(),files=new Map();let offset=0;
 while(view.getUint32(offset,true)===0x04034b50){const size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true),start=offset+30+nameLength+extra;const name=decoder.decode(bytes.slice(offset+30,offset+30+nameLength));files.set(name,decoder.decode(bytes.slice(start,start+size)));offset=start+size;}
 return files;
}

test('editor starts with the article set, source titles, and four optional charts',()=>{
 const e=editor();
 assert.equal(e.$('#article-graphics [data-chart]').length,20);
 assert.equal(e.$('#optional-graphics [data-chart]').length,4);
 assert.equal(e.$('#article-graphics [data-include][checked]').length,20);
 assert.equal(e.$('#optional-graphics [data-include][checked]').length,0);
 assert.match(e.el('#selection-count').textContent,/20 graphics/);
 assert.equal(e.$('[data-chart] .status:not([hidden])').length,0);
});

test('overview presentation uses distinct revenue colors, gray proposed positions, rounded amounts and percentages',()=>{
 const e=editor(),$=e.$;
 const funding=$('#overview-2027-department-funding-sources .chart-wrap');
 assert.deepEqual(funding.find('rect').slice(1,4).map((i,node)=>$(node).attr('fill')).get(),['#3e6f8c','#8eafc3','#e9b84a']);
 assert.ok(funding.find('rect[data-tip][fill="#8eafc3"]').length>0);
 assert.ok(funding.find('rect[data-tip][fill="#e9b84a"]').length>0);
 const overspend=$('#overview-2027-department-actuals .chart-wrap');
 assert.deepEqual(overspend.find('rect').slice(1,4).map((i,node)=>$(node).attr('fill')).get(),['#3e6f8c','#b34d4d','#e9b84a']);
 for(const [series,color] of [['CPD','#3e6f8c'],['CFD','#b34d4d'],['CCHR','#e9b84a']]){
  const marks=overspend.find('rect[data-tip]').filter((i,node)=>$(node).attr('data-tip-detail')===series);
  assert.ok(marks.length>0);
  assert.ok(marks.toArray().every(node=>$(node).attr('fill')===color));
 }
 const summary=$('#overview-2027-summary .chart-wrap');
 assert.equal(summary.find('title').first().text(),'Budget Overview Snapshot: Appropriation & Staffing Changes from 2026 Budget');
 const titleLines=summary.find('text[font-size="28"]');
 assert.ok(titleLines.length>=2);
 assert.equal(Number(titleLines.eq(1).attr('y'))-Number(titleLines.eq(0).attr('y')),32);
 const revenue=$('#overview-2027-personal-property-lease-tax circle[data-tip]');
 assert.equal(new Set(revenue.map((i,node)=>$(node).attr('fill')).get()).size,3);
 assert.ok(revenue.toArray().every(node=>!$(node).attr('data-tip-value').endsWith('.0%')));
 const positions=$('#overview-2027-positions-history circle[data-tip]');
 assert.equal(positions.last().attr('fill'),'#929ca3');
 assert.notEqual(positions.first().attr('fill'),'#929ca3');
 assert.equal($('#overview-2027-positions-history path[stroke="#929ca3"]').length,1);
 assert.ok($('#overview-2027-department-positions rect[data-tip]').toArray().every(node=>$(node).attr('fill')==='#929ca3'));
 const appropriations=$('#overview-2027-department-appropriations .chart-wrap');
 assert.match(appropriations.find('[data-tip]').first().attr('data-tip-value'),/^\$[\d,]+ \(20\.3%\)$/);
 assert.match(appropriations.find('text').text(),/20\.3%/);
 const changes=$('#overview-2027-fringe-share-change .chart-wrap');
 assert.ok(changes.find('[data-tip]').toArray().every(node=>$(node).attr('data-tip-value').endsWith('%')));
 assert.match(changes.find('text').text(),/%/);
 const fringe=$('#overview-2027-appropriations-with-fringe [data-tip]').first();
 assert.match(fringe.attr('data-tip-value'),/^\$[\d,]+$/);
 assert.doesNotMatch(fringe.attr('data-tip-detail'),/\$[\d,]+\.\d/);
});

test('price switch survives editing, HTML export, Astro export and project save/reopen',async()=>{
 const e=editor(),id='overview-2027-appropriations-nominal-real',card=e.el('#'+id),button=card.querySelector('[data-overview-price-toggle]');
 assert.equal(button.getAttribute('aria-checked'),'false');button.click();
 assert.equal(button.getAttribute('aria-checked'),'true');
 assert.equal(card.querySelector('[data-overview-basis="original"]').hidden,true);
 assert.equal(card.querySelector('[data-overview-basis="adjusted"]').hidden,false);
 assert.equal(card.querySelectorAll('[data-overview-basis="adjusted"] circle[data-tip]').length,15);
 const title=card.querySelector('[data-config="title"]');title.value='Edited total <appropriations>';title.fire('change');
 const note=card.querySelector('[data-config="note"]');note.value='Editorial note retained in both views.';note.fire('change');
 assert.equal(card.querySelector('[data-overview-price-toggle]').getAttribute('aria-checked'),'true');
 card.querySelector('[data-action="html"]').click();
 const standalone=await e.downloads.at(-1).blob.text(),$=load(standalone);
 assert.equal($('[data-overview-price-toggle]').attr('aria-checked'),'true');
 assert.equal($('[data-overview-basis="original"][hidden]').length,1);
 assert.equal($('title').first().text(),'Edited total <appropriations>');
 for(const basis of ['original','adjusted'])assert.doesNotMatch($(`[data-overview-basis="${basis}"]`).text(),/Editorial note retained in both views/);
 assert.equal($('link,[src]').length,0,'standalone exports must work offline');
 for(const s of $('script').toArray())new vm.Script($(s).text().replace('<![CDATA[','').replace(']]>',''));
 // Exercise the exact switch runtime embedded in standalone/Astro exports.
 card.querySelector('.chart-wrap').innerHTML=$('main').html();
 const saved=e.document.currentScript;e.document.currentScript=card.querySelector('figure > script');
 const runtime=$('script').last().text();vm.runInContext(runtime,e.context);
 card.querySelector('[data-overview-price-toggle]').click();
 assert.equal(card.querySelector('[data-overview-price-toggle]').getAttribute('aria-checked'),'false');
 assert.equal(card.querySelector('[data-overview-basis="original"]').hidden,false);
 assert.equal(card.querySelector('[data-overview-basis="adjusted"]').hidden,true);
 e.document.currentScript=saved;
 card.querySelector('[data-action="astro"]').click();
 const files=await unzip(e.downloads.at(-1).blob);
 assert.ok(files.has(`${id}/${id}-original.svg`));assert.ok(files.has(`${id}/${id}-adjusted.svg`));
 assert.match(files.get(`${id}/${id}.html`),/data-overview-price-toggle/);
 e.el('#save-all').click();const project=JSON.parse(await e.downloads.at(-1).blob.text());
 const reopened=editor();reopened.el('#project-file').files=[{text:async()=>JSON.stringify(project)}];await reopened.el('#project-file').onchange();
 assert.equal(reopened.el('#'+id+' [data-config="title"]').value,'Edited total <appropriations>');
 assert.equal(reopened.el('#'+id+' [data-overview-price-toggle]').getAttribute('aria-checked'),'false');
});

test('bulk exports exclude optional charts until selected and retain both toggle views',async()=>{
 const e=editor();e.el('#export-all').click();let files=await unzip(e.downloads.at(-1).blob);
 assert.equal([...files.keys()].filter(n=>n.endsWith('/manifest.json')).length,20);
 assert.ok(files.has('overview-2027-summary/overview-2027-summary.html'));
 assert.ok(files.has('overview-2027-department-actuals/overview-2027-department-actuals.html'));
 assert.equal(files.has('overview-2027-department-share-all-funds/manifest.json'),false);
 const optional=e.el('#optional-graphics [data-include]');optional.checked=true;optional.fire('change');
 e.el('#export-all').click();files=await unzip(e.downloads.at(-1).blob);
 assert.equal([...files.keys()].filter(n=>n.endsWith('/manifest.json')).length,21);
});

test('data edits update legend labels and numbers, block invalid exports, and reset cleanly',()=>{
 const e=editor(),card=e.el('#overview-2027-citywide-vacancies');
 const label=card.querySelector('[data-row="0"][data-col="1"]');label.value='Filled Positions, edited';label.fire('change');
 assert.match(card.querySelector('.chart-wrap').textContent,/Filled Positions, edited/);
 const cell=card.querySelector('[data-row="1"][data-col="1"]');cell.value='bad';cell.fire('change');
 assert.equal(card.querySelector('[data-action="astro"]').disabled,true);
 assert.match(card.querySelector('.status').textContent,/not a number/);
 card.querySelector('[data-action="reset"]').click();
 assert.equal(e.el('#overview-2027-citywide-vacancies [data-action="astro"]').disabled,false);
 assert.equal(e.el('#overview-2027-citywide-vacancies [data-row="0"][data-col="1"]').value,'Filled Positions');
});

test('section filter, phone preview and plain-text markers work',async()=>{
 const e=editor();e.el('#section-filter').value='Vacancies';e.el('#section-filter').fire('change');
 assert.equal(e.$('#article-graphics [data-chart]:not([hidden])').length,3);
 e.el('#phone-all').click();assert.equal(e.$('.chart-wrap.phone').length,24);
 const card=e.el('#overview-2027-citywide-vacancies');card.querySelector('[data-action="copy"]').click();
 await Promise.resolve();assert.equal(e.copied.at(-1),'[budget-graphic id="overview-2027-citywide-vacancies"]');
});
