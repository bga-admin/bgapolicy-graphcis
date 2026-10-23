import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const output=new URL('../../bga-budget-snapshots-astro/src/graphics/2027/budget-overview/',import.meta.url);
const require=createRequire(new URL('../../bga-budget-snapshots-astro/package.json',import.meta.url));
const {load}=require('cheerio');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const catalog=await json(new URL('catalog.json',output));
const source=await json(new URL('data/2027-overview-source.json',root));
const projects=new Map(await Promise.all(catalog.graphics.map(async chart=>[chart.id,await json(new URL(`${chart.id}/${chart.id}.json`,output))])));
const project=suffix=>projects.get('overview-2027-'+suffix);
const numeric=row=>row.slice(1).map(Number);

test('article coverage and optional workbook charts have unique valid exports',async()=>{
 const expected=source.metadata.sheets.flatMap(sheet=>(sheet.charts||[]).map(chart=>chart.chartId));
 const article=await json(new URL('data/2027-overview-article.json',root));
 assert.equal(expected.length,22);
 assert.deepEqual(catalog.graphics.filter(c=>c.sourceChartId!==null).map(c=>c.sourceChartId).sort(),[...expected,432790276].sort());
 assert.equal(new Set(catalog.graphics.map(c=>c.id)).size,24);
 const main=catalog.graphics.filter(c=>!c.optional);
 assert.equal(main.length,20);
 assert.equal(main[0].kind,'summary');
 assert.deepEqual(main.slice(1).map(c=>c.sourceChartId),article.charts.map(c=>c.chartId));
 for(const chart of catalog.graphics){
  const manifest=await json(new URL(`${chart.id}/manifest.json`,output));
  assert.equal(manifest.generator,'BGA Custom Graphics');
  const fragment=await readFile(new URL(`${chart.id}/${chart.id}.html`,output),'utf8');
  const $=load(fragment,{xmlMode:true});
  assert.equal($(`svg[data-budget-graphic="${chart.id}"]`).length,chart.kind==='price-toggle'?2:1);
  if(chart.kind!=='summary')assert.ok($('[data-tip][tabindex="0"]').length>0);
  assert.equal($('[id]').map((i,el)=>$(el).attr('id')).get().every(id=>id.startsWith(chart.id)),true);
  for(const script of $('script').toArray())new vm.Script($(script).text().replace('<![CDATA[','').replace(']]>',''));
  assert.doesNotMatch(fragment,/="(?:NaN|Infinity|-Infinity)"/);
  assert.equal(manifest.graphics[0].placeholder,chart.marker);
 }
});

test('appropriation series preserve source totals and the actual inflation cutoff',()=>{
 const nominal=project('appropriations-history').grid;
 const original=source.sheets.AppsHistory.values;
 nominal.slice(1).forEach((row,i)=>assert.equal(numeric(row).reduce((a,b)=>a+b),original[3][i+1]));
 assert.equal(numeric(nominal.at(-1)).reduce((a,b)=>a+b),19612341299);
 const real=project('appropriations-real-history').grid;
 assert.equal(real.at(-1)[0],'2025');
 assert.deepEqual(project('appropriations-nominal-real').grid.slice(-2).map(r=>r[2]),['','']);
 project('appropriations-by-fund').grid.slice(1).forEach((row,i)=>assert.equal(numeric(row).reduce((a,b)=>a+b),original[3][i+1]));
});

test('department funding components reconcile, share charts cover 100%, and fringe points retain their unit',()=>{
 const funding=project('department-funding-sources').grid;
 funding.slice(1).forEach((row,i)=>assert.equal(numeric(row).reduce((a,b)=>a+b),source.sheets['dept apps by fund type'].values[i+1][5]));
 for(const suffix of ['all-funds','local-funds','corporate-fund']){
  assert.equal(project('department-share-'+suffix).config.legend,true,'donut slices need visible department labels');
  const sum=project('department-share-'+suffix).grid.slice(1).reduce((sum,row)=>sum+Number(row[1]),0);
  assert.ok(Math.abs(sum-100)<1e-9);
 }
 assert.ok(Math.abs(Number(project('fringe-share-change').grid[1][1])-7.020050322636048)<1e-12);
});

test('vacancy rates use disjoint counts and budgeted positions without double-counting',()=>{
 const data=project('department-vacancy-rates').grid;
 const doit=data.find(r=>r[0]==='DOIT');
 assert.ok(Math.abs(Number(doit[1])-33/144*100)<1e-12);
 assert.ok(Math.abs(Number(doit[2])-11/144*100)<1e-12);
 for(const r of data.slice(1)){assert.ok(Number(r[1])+Number(r[2])<=100);}
 for(const row of project('citywide-vacancies').grid.slice(1))assert.equal(numeric(row).reduce((a,b)=>a+b),34232);
 assert.match(project('citywide-vacancies').config.note,/7\.3%/);
});

test('department vacancy counts and rates stack horizontally without normalizing to 100%',async()=>{
 for(const suffix of ['department-vacancies','department-vacancy-rates']){
  const chart=project(suffix),id=chart.config.graphicId;
  assert.equal(chart.config.type,'stacked');
  assert.equal(chart.config.orientation,'horizontal');
  const $=load(await readFile(new URL(`${id}/${id}.svg`,output),'utf8'),{xmlMode:true});
  const segments=$('rect[data-tip-title="DOIT · Total"]');
  assert.equal(segments.length,2);
  const first=segments.eq(0),second=segments.eq(1);
  assert.equal(first.attr('y'),second.attr('y'));
  assert.equal(first.attr('height'),second.attr('height'));
  assert.ok(Math.abs(Number(first.attr('x'))+Number(first.attr('width'))-Number(second.attr('x')))<1e-8);
  assert.ok(Math.abs(Number(first.attr('width'))/Number(second.attr('width'))-3)<1e-8);
  assert.match(first.attr('data-tip-detail'),/Persistent|Nonpersistent/i);
  if(suffix.endsWith('rates')){
   assert.equal(first.attr('data-tip-value'),'30.6%');
   assert.notEqual(first.attr('data-tip-value'),'100%');
  }else assert.equal(first.attr('data-tip-value'),'44');
 }
});

test('all markers import together through the existing Astro article importer',async()=>{
 const {insertBudgetGraphics}=await import('../../bga-budget-snapshots-astro/src/lib/graphics.js');
 const original=process.cwd();
 try{
  process.chdir(fileURLToPath(new URL('../../bga-budget-snapshots-astro/',import.meta.url)));
  const inserted=await insertBudgetGraphics({introHtml:catalog.graphics.map(c=>`<p>${c.marker}</p>`).join(''),sections:[]});
  assert.equal(inserted.count,24);
  assert.equal(inserted.css,'');
  assert.equal(inserted.script,'');
  assert.doesNotMatch(inserted.structured.introHtml,/\[budget-graphic/);
  const $=load(inserted.structured.introHtml);
  const ids=$('[id]').map((i,el)=>$(el).attr('id')).get();
  assert.equal(new Set(ids).size,ids.length);
 }finally{process.chdir(original);}
});

test('department overspend matches the article chart, legends and verified 2025 amounts',()=>{
 const chart=project('department-actuals'),grid=chart.grid;
 assert.equal(chart.config.title,'Departmental Net Overspend (Local Funds), 2022-2025');
 assert.deepEqual(grid[0],['Year','CPD','CFD','CCHR']);
 assert.deepEqual(grid.at(-1),['2025','145766930','62311590','35070']);
 assert.equal(grid[1][2],'','unobserved historical marks must stay blank');
});

test('summary keeps currency, positions and percentage formats; source legend labels are retained',async()=>{
 const id='overview-2027-summary';
 const $=load(await readFile(new URL(`${id}/${id}.svg`,output),'utf8'),{xmlMode:true});
 assert.match($('svg').text(),/\$19,612,341,299/);
 assert.match($('svg').text(),/36,037/);
 assert.match($('svg').text(),/5\.1%/);
 assert.equal($('text').filter((i,node)=>$(node).text()==='Metric').length,1);
 const increase=$('text').filter((i,node)=>$(node).text()==='5.1%');
 const decrease=$('text').filter((i,node)=>$(node).text()==='-0.1%');
 assert.equal(increase.attr('fill'),'#3e6f8c');
 assert.equal(decrease.attr('fill'),'#8b6472');
 assert.equal(increase.attr('font-size'),'16');
 assert.deepEqual(project('local-fund-actuals').grid[0].slice(1),['Budget Spent','Budget Unspent','Overbudget']);
 assert.deepEqual(project('citywide-vacancies').grid[0].slice(1),['Filled Positions','Nonpersistent Vacancies','Persistent Vacancies']);
 assert.deepEqual(project('appropriations-nominal-real').grid[0].slice(1),['Total Appropriations','Total Appropriations in 2025 Dollars']);
});
