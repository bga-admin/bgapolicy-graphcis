import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {test} from 'node:test';
const require=createRequire(new URL('../../bga-budget-snapshots-astro/package.json',import.meta.url));
const {load}=require('cheerio');
const source=readFileSync(new URL('../custom-graphics.html',import.meta.url),'utf8');
const context=vm.createContext({TextEncoder,Blob});
vm.runInContext(source.match(/<script id="graphics-core">([\s\S]*?)<\/script>/)[1]+'\nthis.api=CustomGraphics;',context);
const api=context.api;
const config={type:'column',title:'Budget & workforce <2027>',subtitle:'A comparison',xTitle:'Year',yTitle:'Dollars',format:'currency',decimals:1,height:360,palette:'snapshot',source:'Source: Test data',note:'Values are illustrative.',legend:true,values:true};
const grid=[['Year','Spent','Unspent'],['2024','1000000','250000'],['2025','1200000','300000'],['2026','1300000','200000']];
const plain=value=>JSON.parse(JSON.stringify(value));

test('spreadsheet parser preserves quoted tabs, newlines, quotes, currency, Unicode and single-column ranges',()=>{
 assert.deepEqual(plain(api.parseDelimited('\uFEFFYear,Account,Amount\r\n2026,"A, B","$1,234.50"\r\n2027,"Say ""hello""",0\r\n')),[['Year','Account','Amount'],['2026','A, B','$1,234.50'],['2027','Say "hello"','0']]);
 assert.deepEqual(plain(api.parseDelimited('Account\tValue\n"Line one\nLine two"\t5\n"Tab\there"\t0')),[['Account','Value'],['Line one\nLine two','5'],['Tab\there','0']]);
 assert.deepEqual(plain(api.parseDelimited('2024\n2025\n2026')),[['2024'],['2025'],['2026']]);
 assert.throws(()=>api.parseDelimited('Label,Value\n"Unclosed,5'),/closing quote/);
});

test('numeric input preserves missing values and true zeros and rejects partial numbers',()=>{
 for(const value of ['', ' ', 'N/A','—'])assert.equal(api.number(value),null);
 assert.equal(api.number('$1,234.50'),1234.5);assert.equal(api.number('($2,000)'),-2000);assert.equal(api.number('12.5%'),12.5);assert.equal(api.number('0'),0);assert.equal(api.number('1e3'),1000);
 for(const value of ['123abc','1,2','Infinity','=SUM(B1:B2)','1e999'])assert.throws(()=>api.number(value));
 assert.throws(()=>api.model(config,[['Year','Budget'],['2026','oops']]),/Row 2, Budget/);
 assert.throws(()=>api.model(config,[['Year','Budget'],['','1']]),/enter a category/);
});

test('all nine chart types generate valid SVG with matching values and no invalid coordinates',()=>{
 for(const type of api.types){const data=type==='scatter'?[['Positions','Spend'],['10','500'],['40','900'],['25','600']]:grid;
 const output=api.render({...config,type},data);const $=load(output.svg,{xmlMode:true});
 assert.equal($('svg').length,1,type);assert.ok(output.height>(type==='table'?150:360),type);assert.doesNotMatch(output.svg,/NaN|Infinity/);assert.equal($('script').length,1,type);
 new vm.Script($('script').text().replace('<![CDATA[','').replace(']]>',''));
 if(type!=='table')assert.ok($('[data-tip]').length>0,type);
 assert.equal($('#graphic-title').text(),config.title);
 assert.match($('metadata').text(),/1300000|Positions/);
 }
});

test('line and area charts break at missing data instead of bridging gaps',()=>{
 const missing=[['Year','Budget'],['2024','10'],['2025',''],['2026','0'],['2027','20']];
 for(const type of ['line','area']){const $=load(api.render({...config,type,legend:false},missing).svg,{xmlMode:true});assert.equal($('path[fill="none"]').length,2);assert.equal($('circle[data-tip]').length,3);assert.match($('svg').text(),/missing data/);}
});

test('diverging charts retain negatives and show focusable true zero marks',()=>{
 for(const type of ['column','stacked','bar','line','area']){const $=load(api.render({...config,type},[['Account','Change'],['Up','20'],['Down','-10'],['Zero','0']]).svg,{xmlMode:true});assert.equal($('[data-tip]').length,3,type);assert.match($('[data-tip]').eq(1).attr('aria-label'),/−\$10/);assert.equal($('[tabindex="0"]').length,3);}
});

test('stacked charts leave incomplete categories as gaps and 100% rejects negatives',()=>{
 const data=[['Month','Filled','Vacant'],['Jan','8','2'],['Feb','5',''],['Mar','0','0']];
 for(const type of ['stacked','percent']){const $=load(api.render({...config,type},data).svg,{xmlMode:true});assert.equal($('[data-tip]').length,type==='stacked'?4:2);assert.match($('svg').text(),/Missing components/);}
 assert.throws(()=>api.render({...config,type:'percent'},[['X','Y'],['A','-5']]),/nonnegative/);
 assert.throws(()=>api.render({...config,type:'stacked'},[['X','Y','Z'],['A','1e308','1e308']]),/too large/);
});

test('donut uses the first series, handles one whole circle and rejects impossible totals',()=>{
 const $=load(api.render({...config,type:'donut'},[['Category','Budget','Unused'],['A','10','999'],['B','0','999'],['C','','999']]).svg,{xmlMode:true});
 assert.equal($('[data-tip]').length,1);assert.equal(($('path').attr('d').match(/ A /g)||[]).length,4);assert.match($('svg').text(),/first value column/);
 for(const value of ['0','-1'])assert.throws(()=>api.render({...config,type:'donut'},[['X','Y'],['A',value]]));
});

test('scatter validates and spaces numeric X coordinates independently of row order',()=>{
 const data=[['X','Y'],['1','5'],['100','8'],['50','6']];const $=load(api.render({...config,type:'scatter'},data).svg,{xmlMode:true});
 const xs=$('circle').map((_,el)=>Number($(el).attr('cx'))).get();assert.ok(xs[0]<xs[2]&&xs[2]<xs[1]);
 assert.throws(()=>api.render({...config,type:'scatter'},[['X','Y'],['Name','5']]),/numeric/);
});

test('HTML export is standalone, escapes editorial text and retains chart interactions without a data section',()=>{
 const hostile={...config,title:'<script>alert("x")</script> & "Title"',source:'Source: <img src=x onerror=alert(1)>'};
 const html=api.htmlExport(hostile,grid);const $=load(html);
 assert.equal($('title').first().text(),hostile.title);assert.equal($('img').length,0);assert.equal($('script').length,1);assert.equal($('[src]').length,0);assert.equal($('link').length,0);
 assert.equal($('details, table, a[download]').length,0);assert.equal($('[data-tip]').length,6);
 new vm.Script($('script').text());assert.doesNotMatch($('script').text(),/fetch\(|CustomGraphics/);
});

test('CSV prevents formula execution and quotes delimiters, linebreaks and Unicode',()=>{
 const csv=api.csv([['Name','Value'],['=SUM(A1:A2)','-20'],['A, "B"\nÉ','0']]);
 assert.match(csv,/"'=SUM\(A1:A2\)"/);assert.match(csv,/"-20"/);assert.match(csv,/"A, ""B""\nÉ"/);
});

test('large tables retain every category and long labels expand SVG height',()=>{
 const rows=[['Account','Value'],...Array.from({length:62},(_,i)=>['Long descriptive appropriation account number '+i,String(i)])];
 const {svg,height}=api.render({...config,type:'bar'},rows),$=load(svg,{xmlMode:true});assert.equal($('[data-tip]').length,62);assert.ok(height>2500);
 assert.throws(()=>api.rectangular(Array.from({length:502},()=>['A','1'])),/at most/);
});

test('editor scripts parse and every offered chart type is supported',()=>{
 const $=load(source);for(const el of $('script').toArray())new vm.Script($(el).text());
 assert.deepEqual($('#type option').map((_,el)=>$(el).attr('value')).get(),plain(api.types));
 assert.equal($('input[data-row]').length,0,'grid is generated from project data');
});

// Exercise the actual editor handlers with a parsed DOM. Geometry is verified above;
// this adapter covers state changes, paste, persistence and downloaded artifacts.
function editor(html=source) {
 const $=load(html),cache=new WeakMap(),downloads=[],copied=[],clipboardFormats=[],stored=new Map();
 class Element {
  constructor(node){this.node=node;this.listeners={};}
  get value(){if(this._value!==undefined)return this._value;if(this.node.tagName==='textarea')return $(this.node).text();if(this.node.tagName==='select'){let option=$(this.node).find('option[selected]').first();if(!option.length)option=$(this.node).find('option').first();return option.attr('value')??option.text();}return $(this.node).attr('value')??'';}
  set value(value){this._value=String(value);}
  get ownerDocument(){return doc;}
  get viewBox(){const a=String(this.getAttribute('viewBox')).split(' ').map(Number);return {baseVal:{width:a[2],height:a[3]}};}
  getBBox(){return {x:100,y:200,width:180,height:20};}
  get type(){return $(this.node).attr('type')||this.node.tagName;}
  get checked(){return this._checked??$(this.node).attr('checked')!==undefined;}
  set checked(value){this._checked=value;}
  get dataset(){return Object.fromEntries(Object.entries(this.node.attribs||{}).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v]));}
  set innerHTML(value){$(this.node).html(value);}get innerHTML(){return $(this.node).html();}
  set textContent(value){$(this.node).text(value);}get textContent(){return $(this.node).text();}
  set className(value){$(this.node).attr('class',value);}
  get classList(){return {toggle:(name)=>{$(this.node).toggleClass(name);return $(this.node).hasClass(name);}};}
  setAttribute(k,v){$(this.node).attr(k,String(v));}getAttribute(k){return $(this.node).attr(k);}
  querySelector(s){return wrap($(this.node).find(s)[0]);}querySelectorAll(s){return $(this.node).find(s).toArray().map(wrap);}
  matches(s){return $(this.node).is(s);}closest(s){return wrap($(this.node).closest(s)[0]);}
  addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
  fire(name,event={}){for(const fn of this.listeners[name]||[])fn({target:this,...event});this['on'+name]?.({target:this,...event});}
  replaceChildren(){ $(this.node).empty();}focus(){}select(){}
  append(child){$(this.node).append(child.node);}remove(){$(this.node).remove();}
  click(){if(this.node.tagName==='a')downloads.push({name:this.download,blob:blobs.get(this.href)});else this.fire('click');}
 }
 function wrap(node){if(!node)return null;if(!cache.has(node))cache.set(node,new Element(node));return cache.get(node);}
 const doc={getElementById:id=>wrap($('#'+id)[0]),querySelectorAll:s=>$(s).toArray().map(wrap),createElement:tag=>wrap($('<'+tag+'></'+tag+'>')[0]),body:wrap($('body')[0])};
 doc.createElementNS=(_,tag)=>doc.createElement(tag);
 const blobs=new Map();class TestURL extends URL{static createObjectURL(blob){const url='blob:'+blobs.size;blobs.set(url,blob);return url;}static revokeObjectURL(){}}
 const timers=[];const sandbox=vm.createContext({document:doc,localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},ClipboardItem:class {constructor(data){this.data=data;}},navigator:{clipboard:{write:async items=>{for(const item of items){clipboardFormats.push(Object.keys(item.data));copied.push(await item.data['text/plain'].text());}},writeText:async value=>{copied.push(value);}}},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{},URL:TestURL,Blob,TextEncoder,console});
 sandbox.window=sandbox;
 for(const el of $('script').toArray())vm.runInContext($(el).text(),sandbox);
 return {get:id=>doc.getElementById(id),downloads,copied,clipboardFormats,stored,flush:()=>{timers.splice(0).forEach(fn=>fn());}};
}

test('editor pastes a single column without overwriting its neighbor, expands ranges, and blocks invalid export',async()=>{
 const app=editor();assert.match(app.get('status').textContent,/5 categories/);
 const before=app.get('sheet').querySelector('[data-row="1"][data-col="1"]').value;
 const cell=app.get('sheet').querySelector('[data-row="1"][data-col="0"]');
 app.get('sheet').fire('paste',{target:cell,clipboardData:{getData:()=> '2030\n2031'},preventDefault(){}});
 assert.equal(app.get('sheet').querySelector('[data-row="1"][data-col="0"]').value,'2030');
 assert.equal(app.get('sheet').querySelector('[data-row="1"][data-col="1"]').value,before);
 const numeric=app.get('sheet').querySelector('[data-row="1"][data-col="1"]');numeric.value='not a number';app.get('sheet').fire('input',{target:numeric});
 assert.equal(app.get('exportHtml').disabled,true);assert.match(app.get('status').textContent,/Row 2/);
 numeric.value='0';app.get('sheet').fire('input',{target:numeric});assert.equal(app.get('exportHtml').disabled,false);
 app.get('exportHtml').click();assert.doesNotMatch(await app.downloads.at(-1).blob.text(),/View chart data/);
 app.get('exportSvg').click();const svg=await app.downloads.at(-1).blob.text();assert.match(svg,/<!\[CDATA\[/);assert.equal(load(svg,{xmlMode:true})('[data-tip]').length,10);
 app.flush();assert.ok(app.stored.has('bga-custom-graphics-v1'));
});

test('editor replacement, add/remove controls, project export and iframe escaping use current state',async()=>{
 const app=editor();app.get('pasteData').value='Account\tBudget\nSalaries\t100\nServices\t50';app.get('replaceData').click();assert.match(app.get('status').textContent,/2 categories · 1 series/);
 app.get('addColumn').click();assert.ok(app.get('sheet').querySelector('[data-row="0"][data-col="2"]'));
 const button=app.get('sheet').querySelector('[data-delete-column="2"]');app.get('sheet').fire('click',{target:button});assert.equal(app.get('sheet').querySelector('[data-row="0"][data-col="2"]'),null);
 app.get('addRow').click();assert.ok(app.get('sheet').querySelector('[data-row="3"][data-col="0"]'));
 app.get('title').value='A "quoted" <title>';app.get('title').fire('input');app.get('embedUrl').value='https://example.org/chart.html?x=1&y=2';app.get('embedUrl').fire('input');
 const embed=load(app.get('embedCode').value);assert.equal(embed('iframe').attr('src'),'https://example.org/chart.html?x=1&y=2');assert.equal(embed('iframe').attr('title'),'A "quoted" <title>');
 app.get('embedUrl').value='javascript:alert(1)';app.get('embedUrl').fire('input');assert.equal(app.get('copyEmbed').disabled,true);
 app.get('saveProject').click();const saved=JSON.parse(await app.downloads.at(-1).blob.text());assert.equal(saved.config.title,'A "quoted" <title>');assert.equal(saved.grid[1][1],'100');
});


test('Live Server reload injection stays outside the core and the editor still renders',()=>{
 const parsed=load(source);const core=parsed('#graphics-core').text();
 assert.doesNotMatch(core,/<\/?(?:script|body|head)\b/i,'export strings must not look like injection points');
 for(const tag of ['body','head']){
  const served=source.replace(new RegExp('</'+tag+'>','i'),'<script>window.__liveReload = true;</script></'+tag+'>');
  const $=load(served);assert.equal($('script').length,3);
  for(const script of $('script').toArray())assert.doesNotThrow(()=>new vm.Script($(script).text()));
  const app=editor(served);assert.match(app.get('status').textContent,/5 categories/);
  app.get('type').value='bar';app.get('type').fire('input');assert.equal(app.get('exportHtml').disabled,false);
 }
});

test('supplied 39-department percentage data works through paste, horizontal bars, and both exports',async()=>{
 const csv=readFileSync(new URL('fixtures/department-budget-share-change.csv',import.meta.url),'utf8');
 const rows=api.parseDelimited(csv);assert.equal(rows.length,40);
 const app=editor();app.get('pasteData').value=csv;app.get('replaceData').click();
 for(const [key,value] of Object.entries({type:'bar',format:'percent',decimals:'1',xTitle:'Average change (%)',yTitle:'Department'})){app.get(key).value=value;app.get(key).fire('input');}
 app.get('legend').checked=false;app.get('legend').fire('input');
 assert.match(app.get('status').textContent,/39 categories · 1 series/);assert.equal(app.get('exportSvg').disabled,false);
 const svg=load(app.get('preview').innerHTML,{xmlMode:true});assert.equal(svg('[data-tip]').length,39);
 assert.match(svg('[data-tip]').first().attr('aria-label'),/CPD, .*5\.9%/);
 assert.match(svg('[data-tip]').last().attr('aria-label'),/AVIATION, .*−2\.0%/);
 assert.equal(svg('line[data-tip]').length,21,'provided zero values remain focusable marks');
 app.get('exportSvg').click();assert.equal(load(await app.downloads.at(-1).blob.text(),{xmlMode:true})('[data-tip]').length,39);
 app.get('exportHtml').click();const html=load(await app.downloads.at(-1).blob.text());assert.equal(html('[data-tip]').length,39);assert.equal(html('details, table, a[download]').length,0);assert.equal(html('script').length,1);assert.doesNotThrow(()=>new vm.Script(html('script').text()));
});

test('column label rotation reserves footer space, exports the angle, and persists in projects',async()=>{
 const data=[['Department','Value'],['PUBLIC SAFETY ADMINISTRATION','12'],['PLANNING AND DEVELOPMENT','15'],['ADMINISTRATIVE HEARINGS','10']];
 for(const type of ['column','stacked','percent'])for(const angle of [-90,-60,-45,-30,30,45,60,90]){
  const rotated=api.render({...config,type,labelAngle:angle},data),$=load(rotated.svg,{xmlMode:true});
  assert.equal($('[data-column-label]').length,3);
  assert.ok($('[data-column-label]').first().attr('transform').endsWith(`rotate(${angle})`));
  assert.doesNotMatch(rotated.svg,/NaN|Infinity/);
  const lastLabel=$('[data-column-label]').last();const y=Number(lastLabel.attr('transform').match(/translate\([^ ]+ ([^)]+)\)/)[1]);
  const xTitle=$('text').filter((_,el)=>$(el).text()===config.xTitle).last();assert.ok(Number(xTitle.attr('y'))>y+50);
 }
 assert.equal(load(api.render({...config,type:'bar',labelAngle:45},data).svg,{xmlMode:true})('[data-column-label]').length,0);
 const app=editor();app.get('labelAngle').value='-45';app.get('labelAngle').fire('input');
 assert.equal(load(app.get('preview').innerHTML,{xmlMode:true})('[data-column-label]').length,5);
 app.get('exportHtml').click();assert.match(await app.downloads.at(-1).blob.text(),/rotate\(-45\)/);
 app.get('saveProject').click();assert.equal(JSON.parse(await app.downloads.at(-1).blob.text()).config.labelAngle,'-45');
 app.get('type').value='bar';app.get('type').fire('input');assert.equal(app.get('labelAngle').disabled,true);
});

async function unzipStored(blob){
 const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),decoder=new TextDecoder(),files={};let offset=0;
 while(view.getUint32(offset,true)===0x04034b50){
  assert.equal(view.getUint16(offset+8,true),0,'ZIP uses standard stored entries');
  const size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true);
  const name=decoder.decode(bytes.slice(offset+30,offset+30+nameLength)),start=offset+30+nameLength+extraLength;
  files[name]=decoder.decode(bytes.slice(start,start+size));offset=start+size;
 }
 assert.equal(view.getUint32(offset,true),0x02014b50);return files;
}

test('Astro ZIP includes a compatible manifest, executable fragment, valid component and editable project',async()=>{
 const c={...config,graphicId:'custom-budget',labelAngle:-45};const result=api.astroFiles(c,grid);const files=await unzipStored(api.zipFiles(result.files));
 assert.equal(Object.keys(files).length,10);const prefix='custom-budget/';const manifest=JSON.parse(files[prefix+'manifest.json']);
 assert.equal(manifest.graphics[0].placeholder,'[budget-graphic id="custom-budget"]');assert.equal(manifest.graphics[0].html,'custom-budget.html');
 const $=load(files[prefix+'custom-budget.html']);assert.equal($('svg[data-budget-graphic="custom-budget"]').length,1);assert.equal($('details, a[download]').length,0);
 assert.equal($('script').length,1);assert.doesNotThrow(()=>new vm.Script($('script').text()));assert.doesNotMatch($('script').text(),/fetch\(/);
 assert.equal($('#custom-budget-title').text(),config.title);assert.match($('[data-column-label]').first().attr('transform'),/rotate\(-45\)/);
 assert.equal(JSON.parse(files[prefix+'custom-budget.json']).config.labelAngle,-45);assert.match(files[prefix+'custom-budget.csv'],/1300000/);
 const {transform}=await import('../../bga-budget-snapshots-astro/node_modules/@astrojs/compiler-rs/dist/index.mjs');
 const compiled=transform(files[prefix+'custom-budget.astro'],{filename:'custom-budget.astro'});assert.ok(compiled.code);assert.match(compiled.code,/custom-budget\.html\?raw/);
 new vm.Script(files[prefix+'budget-tooltips.js']);
 assert.match(files[prefix+'README.txt'],/Keep the existing budget-graphics.css and budget-tooltips.js/);
 assert.throws(()=>api.astroFiles({...config,graphicId:'../escape'},grid),/graphic ID/);
});

test('Astro export button downloads the current graphic and validates its ID',async()=>{
 const app=editor();app.get('graphicId').value='custom-edited';app.get('graphicId').fire('input');app.get('exportAstro').click();
 const zip=app.downloads.at(-1);assert.equal(zip.name,'custom-edited-astro.zip');assert.equal(zip.blob.type,'application/zip');
 const files=await unzipStored(zip.blob);assert.ok(files['custom-edited/manifest.json']);assert.match(app.get('notice').textContent,/budget-graphic id="custom-edited"/);
 await app.get('copyGraphicId').onclick();assert.equal(app.copied.at(-1),'custom-edited');
 await app.get('copyAstroMarker').onclick();assert.equal(app.copied.at(-1),'[budget-graphic id="custom-edited"]');assert.equal(app.get('astroMarker').value,app.copied.at(-1));assert.deepEqual(app.clipboardFormats,[['text/plain'],['text/plain']]);
 app.get('graphicId').value='Bad ID';app.get('graphicId').fire('input');assert.equal(app.get('exportAstro').disabled,true);assert.equal(app.get('copyGraphicId').disabled,true);assert.equal(app.get('copyAstroMarker').disabled,true);assert.equal(app.get('exportHtml').disabled,false);
});

test('Astro package loads through the actual snapshot marker importer without project changes',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {basename,join}=await import('node:path');const {fileURLToPath}=await import('node:url');
 const {insertBudgetGraphics}=await import('../../bga-budget-snapshots-astro/src/lib/graphics.js');
 const project=fileURLToPath(new URL('../../bga-budget-snapshots-astro/',import.meta.url));const directory=await mkdtemp(join(project,'src/graphics/custom-export-test-'));const previous=process.cwd();
 try{
  const {files}=api.astroFiles({...config,graphicId:'custom-budget'},grid);
  for(const [name,text] of Object.entries(files))await writeFile(join(directory,basename(name)),text);
  process.chdir(project);
  const output=await insertBudgetGraphics({introHtml:'<p>[budget-graphic id="custom-budget"]</p>',sections:[]},basename(directory));
  assert.equal(output.count,1);const $=load(output.structured.introHtml);assert.equal($('[data-tip]').length,6);assert.equal($('script').length,1);assert.equal($('details').length,0);new vm.Script(output.script);new vm.Script($('script').text());
 }finally{process.chdir(previous);await rm(directory,{recursive:true,force:true});}
});

test('stacked tooltips show raw totals and every component, with shares for normalized stacks',()=>{
 const data=[['Year','Filled','Persistent','Other'],['2026','120','14','16'],['2027','0','-3','8'],['2028','1','','2']];
 const c={...config,type:'stacked',format:'number',decimals:0};const $=load(api.render(c,data).svg,{xmlMode:true});
 const marks=$('[data-tip]');assert.equal(marks.length,6,'incomplete stacks stay missing');
 for(let i=0;i<3;i++){assert.equal(marks.eq(i).attr('data-tip-value'),'150');assert.equal(marks.eq(i).attr('data-tip-detail'),'Filled: 120\nPersistent: 14\nOther: 16');assert.match(marks.eq(i).attr('aria-label'),/Total: 150/);}
 assert.equal(marks.eq(3).attr('data-tip-value'),'5');assert.match(marks.eq(3).attr('data-tip-detail'),/Persistent: −3/);
 assert.match($('svg').text(),/Total: 150/);assert.match($('svg').text(),/Total: 5/);
 const percent=load(api.render({...c,type:'percent'},data.slice(0,2)).svg,{xmlMode:true});assert.equal(percent('[data-tip]').first().attr('data-tip-value'),'150');assert.match(percent('[data-tip]').first().attr('data-tip-detail'),/Filled: 120 \(80\.0%\)/);
 const hidden=load(api.render({...c,values:false},data).svg,{xmlMode:true});assert.equal(hidden('text').filter((_,el)=>hidden(el).text().startsWith('Total:')).length,0);
});

test('tooltip runtime shows the generator title/value/detail hierarchy and dismisses with Escape',()=>{
 const app=editor();app.get('type').value='stacked';app.get('type').fire('input');
 const svg=app.get('preview').querySelector('svg'),mark=svg.querySelector('[data-tip]'),box=svg.querySelector('[data-tooltip-box]');
 mark.fire('focus');assert.equal(box.getAttribute('visibility'),'visible');
 assert.equal(box.querySelector('.yr').textContent,'2022 · Total');assert.equal(box.querySelector('.yr').getAttribute('font-weight'),'700');
 assert.equal(box.querySelector('.amt').textContent,'$14,000,000.0');assert.equal(box.querySelector('.amt').getAttribute('font-size'),'18');
 assert.match(box.querySelector('.agency').textContent,/Budget spent: \$11,000,000.0/);assert.equal(box.querySelector('.detail-label').getAttribute('font-weight'),'700');assert.equal(box.querySelector('.detail-value').getAttribute('fill'),'#ffffff');assert.equal(box.querySelector('.detail-value').getAttribute('font-weight'),'400');assert.match(box.querySelector('text').getAttribute('style'),/lining-nums tabular-nums/);
 svg.fire('keydown',{key:'Escape'});assert.equal(box.getAttribute('visibility'),'hidden');
});
