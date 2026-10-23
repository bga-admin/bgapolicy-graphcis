// Reuses the browser generator itself: no second chart renderer or export format.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, resolve, relative} from 'node:path';
import vm from 'node:vm';

const root=dirname(fileURLToPath(import.meta.url));
const source=JSON.parse(await readFile(resolve(root,'data/2027-overview-source.json'),'utf8'));
const editor=await readFile(resolve(root,'custom-graphics.html'),'utf8');
const snapshotTool=await readFile(resolve(root,'index.html'),'utf8');
const context=vm.createContext({TextEncoder,Blob});
vm.runInContext(editor.match(/<script id="graphics-core">([\s\S]*?)<\/script>/)[1]+'\nthis.api=CustomGraphics;',context);
const api=context.api;
const overviewCore=await readFile(resolve(root,'overview-graphics-core.js'),'utf8');
vm.runInContext(overviewCore+'\nthis.overview=OverviewGraphics;',context);
const overview=context.overview;
const article=JSON.parse(await readFile(resolve(root,'data/2027-overview-article.json'),'utf8'));
const overspend=JSON.parse(await readFile(resolve(root,'data/2027-overview-overspend.json'),'utf8'));
const destination=resolve(root,'../bga-budget-snapshots-astro/src/graphics/2027/budget-overview');
const previews=resolve(root,'previews/2027-overview');
const sheets=source.sheets;
const rows=name=>sheets[name].values;
const chartSpecs=source.metadata.sheets.flatMap(sheet=>(sheet.charts||[]).map(chart=>({...chart,sheet:sheet.properties.title})));
const charts=[];
const asText=grid=>grid.map(row=>row.map(value=>value==null?'':String(value)));
function add(sheet,index,id,type,grid,options={}) {
 const original=chartSpecs.filter(chart=>chart.sheet===sheet)[index];
 if(!original)throw Error(`Missing source chart: ${sheet} #${index}`);
 const config={type,title:original.spec.title,subtitle:'',xTitle:'',yTitle:'',format:'number',decimals:1,height:400,palette:'snapshot',source:'',note:'2027 figures are proposed; prior budget comparisons use the 2026 ordinance.',legend:grid[0].length>2,values:type==='bar'||type==='donut',labelAngle:['column','stacked','percent'].includes(type)?'-60':'0',...options,graphicId:'overview-2027-'+id};
 charts.push({sheet,sourceRange:sheets[sheet].range,sourceChartId:original.chartId,sourceTitle:original.spec.title,config,grid:asText(grid)});
}
// Transpose only the selected exact-value rows, never the rounded display tables.
function history(name,indices,count,scale=1) {
 const data=rows(name);return [['Year',...indices.map(i=>data[i][0])],...data[0].slice(1,count+1).map((year,j)=>[year,...indices.map(i=>data[i][j+1]==null||data[i][j+1]===''?null:data[i][j+1]*scale)])];
}
const app=rows('AppsHistory');
add('AppsHistory',0,'appropriations-nominal-real','line',[['Year',app[3][0],app[9][0]],...app[0].slice(1,18).map((year,j)=>[year,app[3][j+1],app[9][j+1]??null])],{format:'currency',yTitle:'Appropriations',note:'Inflation-adjusted data ends in 2025. No 2026 or 2027 CPI adjustment is supplied. 2027 is proposed.'});
charts.at(-1).kind='price-toggle';
add('AppsHistory',1,'appropriations-history','stacked',history('AppsHistory',[2,1],17),{format:'currency',yTitle:'Appropriations'});
add('AppsHistory',2,'appropriations-real-history','stacked',history('AppsHistory',[8,7],15),{title:'Inflation-adjusted Appropriations, City of Chicago Budgets 2011–2025',format:'currency',yTitle:'Appropriations in 2025 dollars',note:'The source chart title says 2011–2027; supplied inflation-adjusted values end in 2025.'});
add('PosHistory',0,'positions-history','line',history('PosHistory',[1],17),{decimals:0,yTitle:'Positions and FTEs'});
const actuals=rows('Actuals');
add('Actuals',0,'local-fund-actuals','stacked',[['Year',...actuals.slice(7,10).map(r=>r[0])],...actuals[0].slice(1,5).map((year,j)=>[year,...actuals.slice(7,10).map(r=>r[j+1])])],{format:'currency',labelAngle:'0',note:'Actuals include encumbrances. Citywide average spend is 86.6%; this differs from the article’s departmental average of 87.5%.'});
const vacancies=rows('Vacancies');
add('Vacancies',0,'citywide-vacancies','stacked',[['Month',...vacancies.slice(7,10).map(r=>r[0])],...vacancies[0].slice(1,10).map((month,j)=>[month,vacancies[7][j+1],vacancies[8][j+1],vacancies[9][j+1]])],{decimals:0,palette:'contrast',note:'January–September 2026. Persistent means vacant in every month. 2,489 / 34,232 budgeted positions = 7.3% persistent vacancies; overall average vacancy rate is 11.2%.'});
const fringe=rows('Fringe');
add('Fringe',0,'appropriations-with-fringe','stacked',[['Department',...fringe[0].slice(2,5)],...fringe.slice(1).map(r=>[r[1],r[2],r[3],r[4]])],{format:'currency',height:520,palette:'contrast',note:'Fringe estimates are supplied by BGA Policy; amounts retain the workbook’s full precision.'});
add('fringe diff',0,'fringe-share-change','bar',[['Department','Change in share (percentage points)'],...rows('fringe diff').slice(1).map(r=>[r[1],r[2]*100])],{format:'percent',xTitle:'Percentage point change',note:'Differences between departmental shares with and without estimated fringe; units are percentage points.'});
add('pers prop lease tax',0,'personal-property-lease-tax','line',history('pers prop lease tax',[1,2,3],12,100),{format:'percent',decimals:2,yTitle:'Tax rate',note:'Blank source cells stay missing. Vehicle-specific values are supplied only for 2026–2027. 2027 rates are proposed.'});
const funds=history('app by fund type',[1,2,3],17);
// The sheet’s rounded block explicitly supplies zero CDBG after its 2026 merger.
for(let i=16;i<=17;i++)funds[i][3]=rows('app by fund type')[9][i]*1e9;
add('app by fund type',0,'appropriations-by-fund','stacked',funds,{format:'currency',palette:'contrast',yTitle:'Appropriations',note:'CDBG becomes part of the grant category in 2026. The source’s rounded block explicitly records zero separate CDBG for 2026–2027.'});
add('dept apps by fund type',0,'department-funding-sources','percent',[['Department',...rows('dept apps by fund type')[0].slice(2,5)],...rows('dept apps by fund type').slice(1).map(r=>[r[1],r[2]??0,r[3]??0,r[4]??0])],{format:'currency',orientation:'horizontal',height:500,palette:'contrast',colors:['#3e6f8c','#8eafc3','#e9b84a'],note:'Includes Finance General, matching the source tab. Blank funding components are absent fund categories and contribute zero; each row reconciles to its supplied total.'});
add('dept apps',0,'department-appropriations','bar',[['Department','2027 proposed appropriations'],...rows('dept apps').slice(1).map(r=>[r[1],r[2]])],{format:'currency',xTitle:'Appropriations',showShare:true});
for(const [sheet,id,index] of [['dept apps','department-share-all-funds',1],['dept apps local funds','department-share-local-funds',0],['dept apps corp fund','department-share-corporate-fund',0]]){
 add(sheet,index,id,'donut',[['Department','Share of departmental appropriations'],...rows(sheet).slice(1).filter(r=>r[5]).map(r=>[r[5],r[6]*100])],{format:'percent',height:450,legend:true,note:'Uses the source tab’s grouped share table, including its “All Other Depts” category. 2027 proposed budget.'});
}
for(const [sheet,id,label,value,format,xTitle] of [
 ['dept apps net change','appropriations-net-change',3,4,'currency','Change in appropriations'],
 ['dept apps pct change','appropriations-percent-change',4,5,'percent','Change from 2026 ordinance'],
 ['dept pos','department-positions',1,2,'number','Positions and FTEs'],
 ['dept pos net change','positions-net-change',3,4,'number','Change in positions and FTEs'],
 ['dept pos pct change','positions-percent-change',4,5,'percent','Change from 2026 ordinance']
 ])add(sheet,0,id,'bar',[['Department',xTitle],...rows(sheet).slice(1).map(r=>[r[label],r[value]*(format==='percent'?100:1)])],{format,xTitle,decimals:format==='number'?0:1});
const sept=rows('dept sept vacan');
add('dept sept vacan',0,'department-vacancies','stacked',sept,{orientation:'horizontal',values:true,decimals:0,note:'September 30, 2026. Persistent and nonpersistent vacancies are disjoint components; add them for each department’s total.'});
const counts=new Map(sept.slice(1).map(r=>[r[0],r]));
add('dept pct vacan',0,'department-vacancy-rates','stacked',[['Department',...rows('dept pct vacan')[0].slice(4,6)],...rows('dept pct vacan').slice(1).map(r=>{const c=counts.get(r[3]);if(!c)throw Error('Missing vacancy counts: '+r[3]);return [r[3],c[1]/r[0]*100,c[2]/r[0]*100];})],{format:'percent',orientation:'horizontal',values:true,xTitle:'Share of budgeted annual positions',note:'Persistent and non-persistent rates are disjoint; add them for total September vacancies. Recalculated from “dept sept vacan” counts and budgeted positions to avoid the source percentage table’s double-counting.'});

// The article's missing chart lives in a different, inaccessible workbook. The
// checked-in FOIA data contains the underlying department budgets and spend.
const foiaName='2025 FOIA response actuals.xlsx - formatted.csv';
vm.runInContext(snapshotTool.match(/function parseCsv\(text\)\{[\s\S]*?\n\}/)[0]+'\nthis.parseCsv=parseCsv;',context);
const foia=context.parseCsv(await readFile(resolve(root,foiaName),'utf8'));
const departments=new Map();
for(const r of foia.slice(1)){
 if(!r[2]?.trim())continue;
 const code=Number(r[2]);if(code===99)continue;
 const value=departments.get(code)||{code,name:r[3].trim(),budget:0,spent:0};
 const number=v=>String(v).trim()==='-'?0:(api.number(v)||0);
 value.budget+=number(r[6]);value.spent+=number(r[7])+number(r[8]);departments.set(code,value);
}
for(const [column,code] of [[1,57],[2,59],[3,45]]){const d=departments.get(code);if(d.spent-d.budget!==Number(overspend.grid.at(-1)[column]))throw Error('2025 overspend does not match FOIA data.');}
charts.push({sheet:'Article embedded chart / '+foiaName,sourceRange:'Embedded chart 432790276; 2025 totals independently verified against FOIA department aggregates',sourceChartId:overspend.sourceChartId,sourceTitle:overspend.title,config:{...charts.find(c=>c.sheet==='Actuals').config,title:overspend.title,type:'bar',graphicId:'overview-2027-department-actuals',palette:'contrast',colors:['#3e6f8c','#b34d4d','#e9b84a'],legend:true,values:true,source:'',note:'Values from the article’s embedded chart; 2025 verified against the checked-in FOIA response. Actual spend includes encumbrances. Source years without a visible mark remain blank.'},grid:overspend.grid});
const summaryGrid=rows('bloc').map((r,i)=>r.map((v,j)=>i&&j>=4&&typeof v==='number'?v*100:v));
summaryGrid[0][0]='Metric';
charts.push({kind:'summary',sheet:'bloc',sourceRange:sheets.bloc.range,sourceChartId:null,sourceTitle:'Snapshot: Appropriation & Staffing Changes from 2026 Budget',config:{...charts[0].config,type:'table',title:'Budget Overview Snapshot: Appropriation & Staffing Changes from 2026 Budget',graphicId:'overview-2027-summary',format:'number',legend:false,note:'Summary rates are the analyst-supplied workbook values.',source:''},grid:asText(summaryGrid)});
const articleOrder=new Map(article.charts.map((chart,i)=>[chart.chartId,{...chart,order:i+1}]));
for(const chart of charts){const match=articleOrder.get(chart.sourceChartId);chart.optional=!match&&chart.kind!=='summary';chart.section=chart.kind==='summary'?'Summary':match?.heading||'Additional workbook charts';chart.order=chart.kind==='summary'?0:match?.order??100;}
for(const chart of charts){
 chart.config.hideNotes=true;
 if(chart.section==='Revenues')chart.config.colors=['#3e6f8c','#b27616','#96536f'];
 if(chart.section==='Overall Positions & Year-to-Year Growth')chart.config.categoryColors=Object.fromEntries(chart.grid.slice(1).filter(row=>/2027/.test(row[0])||chart.config.graphicId==='overview-2027-department-positions').map(row=>[row[0],'#929ca3']));
}
charts.sort((a,b)=>a.order-b.order);
const defaultCharts=charts.filter(c=>!c.optional);
if(defaultCharts.length!==article.charts.length+1)throw Error('Article graphics coverage is incomplete.');

await mkdir(destination,{recursive:true});await mkdir(previews,{recursive:true});
const allFiles={},catalog=[];
for(const chart of charts){
 const exported=overview.astroFiles(chart);
 for(const [name,content] of Object.entries(exported.files)){const path=resolve(destination,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,content);if(!chart.optional)allFiles[name]=content;}
 catalog.push({id:exported.id,title:chart.config.title,sheet:chart.sheet,sourceChartId:chart.sourceChartId,sourceRange:chart.sourceRange,marker:exported.marker,kind:chart.kind||'chart',section:chart.section,optional:chart.optional});
}
await writeFile(resolve(destination,'catalog.json'),JSON.stringify({source:source.spreadsheetId,retrieved:source.retrieved,graphics:catalog},null,2));
const template=await readFile(resolve(root,'overview-tool-template.html'),'utf8');
const catalogHtml=template
 .replace('/*__BASE_STYLES__*/',()=>snapshotTool.match(/<style>([\s\S]*?)<\/style>/)[1])
 .replace('__OVERVIEW_DATA__',()=>JSON.stringify(charts).replaceAll('<','\\u003c'))
 .replace('__GRAPHICS_CORE__',()=>editor.match(/<script id="graphics-core">([\s\S]*?)<\/script>/)[1])
 .replace('__OVERVIEW_CORE__',()=>overviewCore);
await writeFile(resolve(previews,'index.html'),catalogHtml);
const comparison=`# Document comparison\n\nThe article contains ${article.charts.length} charts and one summary table. The default export contains these ${defaultCharts.length} graphics in document order.\n\n| Order | Document graphic | Export ID |\n| --- | --- | --- |\n${defaultCharts.map((c,i)=>`| ${i+1} | ${c.config.title} | ${c.config.graphicId} |`).join('\n')}\n\n## Sheet charts absent from the document\n\nThese four charts stay in the optional section and are excluded from the default export:\n\n${charts.filter(c=>c.optional).map(c=>`- ${c.config.title} (${c.config.graphicId})`).join('\n')}\n\nThe missing Departmental Net Overspend chart is linked from a second workbook. Its values were recovered from the image embedded in the document; its 2025 values were checked against the local FOIA response. The summary table comes from the workbook's bloc tab.\n`;
await writeFile(resolve(previews,'comparison.md'),comparison);
allFiles['catalog.json']=JSON.stringify({source:source.spreadsheetId,graphics:catalog.filter(c=>!c.optional)},null,2);
allFiles['README-OVERVIEW.md']=await readFile(resolve(root,'2027-OVERVIEW.md'),'utf8');
allFiles['2027-overview-source.json']=JSON.stringify(source,null,2);
allFiles['2027-overview-article.json']=JSON.stringify(article,null,2);
allFiles['2027-overview-overspend.json']=JSON.stringify(overspend,null,2);
allFiles['comparison.md']=comparison;
await writeFile(resolve(previews,'2027-overview-astro.zip'),new Uint8Array(await api.zipFiles(allFiles).arrayBuffer()));
console.log(`Built ${defaultCharts.length} article graphics and ${charts.length-defaultCharts.length} optional workbook charts in ${relative(root,destination)}.\nPreview: ${relative(root,resolve(previews,'index.html'))}`);
