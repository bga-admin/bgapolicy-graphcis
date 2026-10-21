import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';

const require = createRequire(new URL('../../bga-budget-snapshots-astro/package.json', import.meta.url));
const { load } = require('cheerio');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// A small DOM adapter runs the real generator and input handlers against parsed HTML.
// Layout and live API requests are excluded; SVG geometry, tooltips, and exports run normally.
function generator({preserveDefaultCycle=false}={}) {
  const $ = load(html), wrappers = new WeakMap();
  class Node {
    constructor(element) { this.element = element; this.style = {}; this.dataset = {}; this.listeners = {}; }
    get textContent() { return $(this.element).text(); }
    set textContent(value) { $(this.element).text(value); }
    get innerHTML() { return $(this.element).html(); }
    set innerHTML(value) { $(this.element).html(value); }
    get outerHTML() { return $.html(this.element); }
    get attributes() { return Object.entries(this.element.attribs || {}).map(([name, value]) => ({ name, value })); }
    get children() { return $(this.element).children().toArray().map(wrap); }
    get classList() { return { contains: value => $(this.element).hasClass(value), add: value => $(this.element).addClass(value), remove: value => $(this.element).removeClass(value) }; }
    get id() { return this.getAttribute('id'); }
    set id(value) { this.setAttribute('id', value); }
    get className() { return this.getAttribute('class') || ''; }
    set className(value) { this.setAttribute('class', value); }
    get value() { return this._value ?? this.getAttribute('value') ?? ''; }
    set value(value) { this._value = String(value); }
    get valueAsNumber() { return this.value.trim() ? Number(this.value) : NaN; }
    get hidden() { return this.getAttribute('hidden') !== undefined; }
    set hidden(value) { value ? this.setAttribute('hidden', '') : this.removeAttribute('hidden'); }
    get disabled() { return this.getAttribute('disabled') !== undefined; }
    set disabled(value) { value ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }
    setAttribute(name, value) { $(this.element).attr(name, String(value)); }
    getAttribute(name) { return $(this.element).attr(name); }
    removeAttribute(name) { $(this.element).removeAttr(name); }
    querySelector(selector) { return wrap($(this.element).find(selector)[0]); }
    querySelectorAll(selector) { return $(this.element).find(selector).toArray().map(wrap); }
    closest(selector) { return wrap($(this.element).closest(selector)[0]); }
    append(...nodes) { $(this.element).append(...nodes.map(node => node.element)); }
    after(...nodes) { $(this.element).after(...nodes.map(node => node.element)); }
    insertBefore(node, reference) { $(reference.element).before(node.element); }
    replaceChildren() { $(this.element).empty(); }
    remove() { $(this.element).remove(); }
    cloneNode() { return wrap($(this.element).clone()[0]); }
    addEventListener(type, handler) { (this.listeners[type] ??= []).push(handler); }
    fire(type) { for (const handler of this.listeners[type] || []) handler({ target: this }); }
    setCustomValidity(message) { this.validationMessage = message; }
    getBoundingClientRect() { return { width: 760, height: 300, left: 0, top: 0, bottom: 300 }; }
  }
  function wrap(element) {
    if (!element) return null;
    if (!wrappers.has(element)) wrappers.set(element, new Node(element));
    return wrappers.get(element);
  }
  const docListeners = {};
  const document = {
    addEventListener(type,handler){(docListeners[type]??=[]).push(handler)},
    fire(type,event){for(const handler of docListeners[type]||[])handler(event)},
    getElementById: id => wrap($('#' + id)[0]),
    querySelector: selector => wrap($(selector)[0]),
    querySelectorAll: selector => $(selector).toArray().map(wrap),
    createElement: tag => wrap($(`<${tag}></${tag}>`)[0]),
    createElementNS: (_, tag) => wrap($(`<${tag}></${tag}>`)[0]),
    body: wrap($('body')[0])
  };
  const context = {
    preserveDefaultCycle, document, Element: Node, window: { innerWidth:800, innerHeight:620, addEventListener() {} },
    MutationObserver: class { observe() {} },
    XMLSerializer: class { serializeToString(node) { return node.outerHTML; } },
    structuredClone, Blob, TextEncoder, URL, setTimeout, clearTimeout, console,
    location: { protocol: 'http:' }
  };
  const script = $('script').text().replace(/\ninitialize\(\);\n\}\)\(\);/, `
  // Existing numeric fixtures describe the 2026 recommendation cycle.
  if(!preserveDefaultCycle) activeCycle=BUDGET_CYCLES['2026-recommendation'];
  globalThis.api={resolveDataset,resolvePositionDataset,cycleYears,stage,loadPositionChanges,chartDataTable,chartCsv,csvCell,workbookFile,downloadAllData,downloadChartData,build,buildWorkforce,buildLargestAppropriations,proposalRangeLabel,getCycle:()=>activeCycle.key,getDepartment:()=>selectedDepartment,setDepartmentOptions(rows){departments=rows;populateDepartmentSelect()},VACANCY_AGGREGATE_2026_CSV,VACANCY_AGGREGATE_2026,vacancyAggregate2026FromCsv,parseCsv,PERSISTENT_VACANCIES_2026_CSV,persistentVacanciesForDepartment,loadVacancies,buildVacancies,buildPersistentVacancies,getPersistent:()=>lastPersistentVacanciesData,selectDepartment(code,name){selectedDepartment={code,name}},ACTUAL_SPEND_2025_CSV,ACTUAL_SPEND_2025_ROWS,actualSpendRowsFromCsv,actualSpendForDepartment,foiaMoney,buildActualSpendCategories,getActualSpend:()=>lastActualSpendCategoriesData,editorStates,normalizeEditedData,clearRenderedData,refreshExportControls,
    averageAnnualChange,inflationAdjustedRate,DOLLAR_2024_FACTORS,DOLLAR_2025_FACTORS,loadYear,loadWorkforceYear,departmentMatch,positionContribution,loadAppropriationChanges,setAppropriationRows(rowsByYear){
      resolveDataset=async year=>({id:String(year)});
      resolvePositionDataset=async year=>({id:String(year)});
      fetchAllRows=async id=>rowsByYear[id];
    },exportForAstro,availableExports,setDownload(fn){downloadFile=fn},budgetTooltipRuntime,EXPORT_CSS,frozenGraphic,EXPORT_CHARTS,renderChart,renderSummaryTable,syncEditorText,
    setPreviewCycle(key){activeCycle=BUDGET_CYCLES[key]},FRINGE_ROWS,fringeRowsFromCsv,fringeForDepartment,includeFringeDepartments,buildFringe,renderFringeChart,
    seed(){
      selectedDepartment={code:'01',name:'Treasurer'};
      lastData=[{year:2025,available:true,amount:1000000},{year:2026,available:true,amount:1200000}];
      lastWorkforceData=[{year:2025,available:true,positions:10,components:{annualPositions:10}},{year:2026,available:true,positions:12,components:{annualPositions:12}}];
      renderChart(lastData);renderWorkforceChart(lastWorkforceData);renderSummaryTable(lastData,lastWorkforceData);
      exportBusy=false;refreshExportControls();
    },seedAll(){
      this.seed();clearEditors();buildFringe();
      lastLocalFundsData=[{year:2025,available:true,amount:100,actuals:60,encumbrances:10,actualSpend:70,budgetSpent:70,unspent:30,hasActuals:true}];
      lastVacanciesData={rangeLabel:'February 2025',sourceType:'aggregate',persistentCount:5,avgVacancyRate:.2,data:[{year:2025,label:'February',short:'Feb',available:true,budgeted:100,filled:80,persistent:5,nonpersistent:15,vacancies:20,vacancyRate:.2}]};
      lastPersistentVacanciesData={rangeLabel:'February 2025',persistentCount:5,persistentTitleData:[{title:'Manager',persistentVacancies:5,identityCount:1}]};
      lastLargestAppropriationsData={source:{id:'abcd-1234'},rowCount:1,rows:[{label:'Contract services',amount:100,rowCount:1}]};
      const source={source:{id:'abcd-1234'}};
      lastPositionChangesData={previous:source,current:source,rows:[{title:'Manager',previous:10,current:12,net:2,percent:.2}]};
      lastAppropriationChangesData={previous:source,current:source,rows:[{label:'Contract services',previous:100,current:120,net:20,percent:.2}]};
      EDITOR_CONFIGS.forEach(config=>config.render(config.get()));refreshExportControls();
    },seedMissing(){
      this.seedAll();clearEditors();
      lastData.unshift({year:2024,available:false,reason:'API year missing'});
      lastWorkforceData[1]={year:2026,available:false,reason:'No workforce row'};
      lastLocalFundsData.unshift({year:2024,available:false,amount:0,reason:'No local funds row'});
      lastVacanciesData.data.push({year:2025,label:'March',short:'Mar',available:false,filled:0,persistent:0,nonpersistent:0,budgeted:0,reason:'No retained month'});
      EDITOR_CONFIGS.forEach(config=>config.render(config.get()));refreshExportControls();
    },getData:()=>lastData,getWorkforce:()=>lastWorkforceData,
      getLocal:()=>lastLocalFundsData,getVacancies:()=>lastVacanciesData,
      getFringe:()=>lastFringeData,selectFringe(code){clearEditors();selectedDepartment={code,name:'Test department'};buildFringe();refreshExportControls()}
  };
})();`);
  vm.runInNewContext(script, context);
  return { api: context.api, document };
}
function input(state, key, index = 0) {
  return state.panel.querySelectorAll('input').filter(node => node.dataset.editorKey === key)[index];
}
function edit(node, value) { node.value = value; node.fire('input'); }
async function unzipStored(blob){
  const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),decoder=new TextDecoder(),files={};
  let offset=0;
  while(view.getUint32(offset,true)===0x04034b50){
    const size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true);
    const name=decoder.decode(bytes.slice(offset+30,offset+30+nameLength)),start=offset+30+nameLength+extraLength;
    files[name]=decoder.decode(bytes.slice(start,start+size));offset=start+size;
  }
  return files;
}


test('live data, headings, tooltips and frozen exports update, then reset', () => {
  const { api, document } = generator(); api.seed();
  const state = api.editorStates.get('appropriations');
  document.querySelector('[aria-controls="editor-appropriations"]').fire('click');
  assert.equal(state.panel.hidden, false);
  edit(input(state, 'title'), 'Edited budget <2026>');
  edit(input(state, 'amount', 1), '1500000');
  assert.equal(api.getData()[1].amount, 1500000);
  assert.match(document.getElementById('summaryTable').textContent, /\$1,500,000/);
  assert.match(document.getElementById('budgetSvg').outerHTML, /1\.50M/);
  assert.match(document.getElementById('budgetSvg').querySelector('[data-year="2026"]').getAttribute('data-budget-tooltip'), /1,500,000/);
  const graphic = api.frozenGraphic(api.EXPORT_CHARTS[0], { department: 'Treasurer', cycle: '2026-recommendation' });
  assert.equal(graphic.metadata.edited, true);
  assert.equal(graphic.metadata.title, 'Edited budget <2026>');
  assert.match(graphic.html, /Edited budget &lt;2026&gt;/);
  assert.match(graphic.svg, /1,500,000/);
  assert.doesNotMatch(graphic.html, /Edited in generator/);
  api.renderChart(api.getData()); api.syncEditorText(state);
  assert.equal(document.getElementById('budgetSvg').querySelector('title').textContent, 'Edited budget <2026>');
  state.reset.fire('click');
  assert.equal(api.getData()[1].amount, 1200000);
  assert.equal(state.edited, false);
  assert.equal(state.badge.hidden, true);
  assert.equal(document.getElementById('chartTitle').textContent, state.originalText.title);
});

test('invalid numeric edits preserve the last valid value and baseline snapshots', () => {
  const { api } = generator(); api.seed();
  const state = api.editorStates.get('appropriations'), amount = input(state, 'amount');
  for (const value of ['', '-1', 'Infinity', 'abc']) {
    edit(amount, value);
    assert.equal(api.getData()[0].amount, 1000000);
    assert.ok(amount.validationMessage);
  }
  edit(amount, '0');
  assert.equal(api.getData()[0].amount, 0);
  assert.equal(amount.validationMessage, '');
  assert.equal(state.originalData[0].amount, 1000000);
});

test('workforce components recalculate totals and summary, including zero', () => {
  const { api, document } = generator(); api.seed();
  const state = api.editorStates.get('workforce');
  edit(input(state, 'components.annualPositions', 1), '20');
  assert.equal(api.getWorkforce()[1].positions, 20);
  assert.match(document.getElementById('summaryTable').textContent, /100\.0%/);
  edit(input(state, 'components.annualPositions', 0), '0');
  edit(input(state, 'components.annualPositions', 1), '0');
  assert.doesNotMatch(document.getElementById('workforceSvg').outerHTML, /NaN|Infinity/);
});

test('derived local spending, vacancies, and changes remain consistent', () => {
  const { api } = generator();
  const funds = api.normalizeEditedData('local-funds', [{ available: true, amount: 100, actuals: 90, encumbrances: 20 }])[0];
  assert.equal(funds.actualSpend, 110); assert.equal(funds.budgetSpent, 100); assert.equal(funds.unspent, 0);
  const vacancies = api.normalizeEditedData('vacancies', { data: [{ available: true, filled: 80, persistent: 5, nonpersistent: 15 }] }).data[0];
  assert.equal(vacancies.budgeted, 100); assert.equal(vacancies.vacancyRate, .2);
  for (const id of ['position-changes', 'appropriation-changes']) {
    const result = api.normalizeEditedData(id, { rows: [{ previous: 20, current: 15 }] }).rows[0];
    assert.equal(result.net, -5); assert.equal(result.percent, -.25);
    assert.equal(api.normalizeEditedData(id, { rows: [{ previous: 0, current: 1 }] }).rows[0].percent, null);
  }
  assert.throws(() => api.normalizeEditedData('persistent-vacancies', { persistentTitleData: [{ persistentVacancies: 0 }] }), /positive/);
});

test('reload clears edits, closes panels and disables editors while data loads', () => {
  const { api, document } = generator(); api.seed();
  const state = api.editorStates.get('appropriations');
  edit(input(state, 'title'), 'Custom title');
  api.clearRenderedData();
  assert.equal(api.editorStates.size, 0);
  assert.equal(state.panel.hidden, true);
  assert.equal(document.getElementById('chartTitle').textContent, state.originalText.title);
  assert.equal(document.querySelector('[aria-controls="editor-appropriations"]').disabled, true);
  assert.equal(api.getData(), null);
});


test('every loaded graphic supports live editing and valid frozen exports', () => {
  const { api, document } = generator(); api.seedAll();
  assert.equal(api.editorStates.size, 10);
  for (const [id, key, value] of [
    ['estimated-fringe', 'fullTimeFringe', '1000'],
    ['local-funds', 'actuals', '200'],
    ['vacancies', 'filled', '0'],
    ['persistent-vacancies', 'persistentVacancies', '7'],
    ['largest-appropriations', 'amount', '0'],
    ['position-changes', 'current', '5'],
    ['appropriation-changes', 'previous', '0']
  ]) {
    const state = api.editorStates.get(id);
    const control = input(state, key);
    edit(control, value);
    assert.equal(control.validationMessage, '', id);
    assert.equal(state.edited, true, id);
    const chart = api.EXPORT_CHARTS.find(chart => chart.id === id);
    const graphic = api.frozenGraphic(chart, { department: 'Treasurer', cycle: '2026-recommendation' });
    assert.equal(graphic.metadata.edited, true, id);
    assert.doesNotMatch(graphic.svg, /NaN|Infinity/, id);
    assert.ok(document.getElementById(chart.svgId), id);
    state.reset.fire('click');
    assert.equal(state.edited, false, id);
  }
  const summary = api.editorStates.get('summary');
  edit(input(summary, 'title'), 'Custom summary');
  edit(input(api.editorStates.get('appropriations'), 'amount', 1), '2000000');
  assert.equal(document.getElementById('summaryTableTitle').textContent, 'Custom summary');
});


test('missing annual values are editable, plot on entry and restore gaps on clear/reset', () => {
  const { api, document } = generator(); api.seedMissing();
  const state = api.editorStates.get('appropriations');
  const control = input(state, 'amount');
  assert.equal(control.disabled, false);
  assert.equal(control.value, '');
  edit(control, '');
  assert.equal(api.getData()[0].available, false);
  edit(control, '-1');
  assert.equal(api.getData()[0].available, false);
  edit(control, '900000');
  assert.equal(api.getData()[0].available, true);
  assert.equal(api.getData()[0].manualEntry, true);
  const point = document.getElementById('budgetSvg').querySelector('[data-year="2024"]');
  assert.match(point.getAttribute('data-budget-tooltip'), /900,000/);
  assert.match(point.getAttribute('data-budget-tooltip'), /Manual entry/);
  assert.match(document.getElementById('status').textContent, /1 manually entered/);
  const graphic = api.frozenGraphic(api.EXPORT_CHARTS[0], { department: 'Treasurer', cycle: '2026-recommendation' });
  assert.match(graphic.svg, /Manual entry/);
  edit(control, '');
  assert.equal(api.getData()[0].available, false);
  assert.equal(document.getElementById('budgetSvg').querySelector('circle[data-year="2024"]'), null);
  assert.match(document.getElementById('budgetSvg').outerHTML, /No API value/);
  edit(control, '0');
  assert.equal(api.getData()[0].available, true);
  assert.equal(api.getData()[0].amount, 0);
  state.reset.fire('click');
  assert.equal(api.getData()[0].available, false);
  assert.equal(api.getData()[0].manualEntry, undefined);
  assert.equal(input(state, 'amount').value, '');
});

test('missing workforce components update the current-year summary and clear back to unknown', () => {
  const { api, document } = generator(); api.seedMissing();
  const state = api.editorStates.get('workforce');
  const control = input(state, 'components.annualPositions', 1);
  assert.equal(control.disabled, false);
  edit(control, '15');
  assert.equal(api.getWorkforce()[1].available, true);
  assert.equal(api.getWorkforce()[1].positions, 15);
  assert.match(document.getElementById('summaryTable').textContent, /50\.0%/);
  assert.equal(document.getElementById('summaryTableStatus').className, 'status ready');
  edit(control, '');
  assert.equal(api.getWorkforce()[1].available, false);
  assert.match(document.getElementById('summaryTableStatus').textContent, /2026 positions/);
});

test('missing budgets and vacancy counts remain gaps until their required values exist', () => {
  const { api, document } = generator(); api.seedMissing();
  const local = api.editorStates.get('local-funds');
  assert.equal(input(local, 'amount').value, ''); // An API placeholder zero is unknown.
  edit(input(local, 'actuals'), '60');
  assert.equal(api.getLocal()[0].available, false);
  edit(input(local, 'amount'), '100');
  assert.equal(api.getLocal()[0].available, true);
  assert.equal(api.getLocal()[0].budgetSpent, 60);
  assert.equal(api.getLocal()[0].unspent, 40);
  const vacancies = api.editorStates.get('vacancies');
  for (const key of ['filled', 'persistent', 'nonpersistent']) assert.equal(input(vacancies, key, 1).value, '');
  edit(input(vacancies, 'filled', 1), '80');
  edit(input(vacancies, 'persistent', 1), '5');
  assert.equal(api.getVacancies().data[1].available, false);
  edit(input(vacancies, 'nonpersistent', 1), '15');
  assert.equal(api.getVacancies().data[1].available, true);
  assert.equal(api.getVacancies().data[1].budgeted, 100);
  assert.equal(api.getVacancies().data[1].vacancyRate, .2);
  assert.doesNotMatch(document.getElementById('vacanciesSvg').outerHTML, /NaN|Infinity/);
});


test('fringe snapshot matches every supplied CSV value and sums three components', () => {
  const { api } = generator();
  const csv = readFileSync(new URL('../departmental fringe by year - master.csv', import.meta.url), 'utf8');
  const source = api.fringeRowsFromCsv(csv);
  assert.equal(source.length, 335);
  assert.deepEqual(JSON.parse(JSON.stringify(api.FRINGE_ROWS)), JSON.parse(JSON.stringify(source)));
  const codes = new Set(source.map(row => row.code));
  assert.equal(codes.size, 39);
  for (const code of codes) {
    const data = api.fringeForDepartment({ code: code.padStart(2, '0') });
    assert.equal(data.length, 9);
    for (const row of data) {
      if (!row.available) continue;
      assert.equal(row.total, row.appropriations + row.fullTimeFringe + row.partTimeFringe);
      assert.ok(Number.isFinite(row.total));
      assert.equal(row.code, code);
    }
  }
  const mayor = api.fringeForDepartment({ code: '01' })[0];
  assert.equal(mayor.appropriations, 7704181);
  assert.equal(mayor.fullTimeFringe, 2394375);
  assert.equal(mayor.total, 10098556);
  const facilities = api.fringeForDepartment({ code: '38' });
  assert.equal(new Set(facilities.filter(row => row.available).map(row => row.department)).size, 2);
});

test('fringe departments are selectable without the API; historical gaps stay missing', () => {
  const { api, document } = generator(); api.seed();
  const departments = api.includeFringeDepartments([{ code: '01', name: 'Office of the Mayor' }]);
  assert.equal(departments.length, 39);
  assert.equal(departments.find(row => row.code === '01').name, 'Office of the Mayor');
  assert.ok(departments.some(row => row.code === '6'));
  const sparse = api.FRINGE_ROWS.find(row => api.fringeForDepartment({ code: row.code }).some(point => !point.available));
  assert.ok(sparse);
  api.selectFringe(sparse.code);
  assert.ok(api.getFringe().some(row => !row.available));
  assert.match(document.getElementById('fringeStatus').textContent, /No CSV value/);
  const svg = document.getElementById('fringeSvg');
  assert.equal(svg.querySelectorAll('[data-year]').length, 9);
  assert.doesNotMatch(svg.outerHTML, /NaN|Infinity/);
});

test('fringe editor updates totals and exports, and allows completing missing years', () => {
  const { api, document } = generator(); api.seedAll();
  const state = api.editorStates.get('estimated-fringe');
  const original = api.getFringe()[0].total;
  edit(input(state, 'fullTimeFringe'), '0');
  assert.equal(api.getFringe()[0].total, api.getFringe()[0].appropriations + api.getFringe()[0].partTimeFringe);
  const chart = api.EXPORT_CHARTS.find(chart => chart.id === 'estimated-fringe');
  let exported = api.frozenGraphic(chart, { department: 'Mayor', cycle: '2026-recommendation' });
  assert.equal(exported.metadata.edited, true);
  assert.match(exported.svg, /Calculated full-time fringe: \$0/);
  state.reset.fire('click');
  assert.equal(api.getFringe()[0].total, original);
  const sparse = api.FRINGE_ROWS.find(row => api.fringeForDepartment({ code: row.code }).some(point => !point.available));
  api.selectFringe(sparse.code);
  const manual = api.editorStates.get('estimated-fringe');
  const index = api.getFringe().findIndex(row => !row.available);
  edit(input(manual, 'appropriations', index), '100');
  edit(input(manual, 'fullTimeFringe', index), '20');
  assert.equal(api.getFringe()[index].available, false);
  edit(input(manual, 'partTimeFringe', index), '5');
  assert.equal(api.getFringe()[index].total, 125);
  assert.equal(api.getFringe()[index].available, true);
  exported = api.frozenGraphic(chart, { department: 'Manual department', cycle: '2026-recommendation' });
  assert.match(exported.svg, /Manual entry/);
  assert.doesNotMatch(document.getElementById('fringeSvg').outerHTML, /NaN|Infinity/);
});


test('exports show title, chart and data download while editorial notes remain in metadata', () => {
  const {api,document}=generator();api.seed();
  const status=document.getElementById('status');
  status.className='status warning';status.textContent='Missing data warning';
  const graphic=api.frozenGraphic(api.EXPORT_CHARTS[0],{department:'Treasurer',cycle:'2026-recommendation'});
  const $=load(graphic.html,null,false);
  assert.deepEqual($('figure').children().toArray().map(node=>node.name),['h2','button','div','div','a']);
  assert.equal(graphic.metadata.warning,'Missing data warning');
  assert.ok(graphic.metadata.source);
  assert.equal(status.textContent,'Missing data warning');
  assert.equal($('.budget-warning, figcaption, .legend').length,0);
});

test('export tooltips preserve the generator title/value/detail hierarchy and dismissal', () => {
  const {api,document}=generator();api.seed();
  const graphic=api.frozenGraphic(api.EXPORT_CHARTS[0],{department:'Treasurer',cycle:'2026-recommendation'});
  document.body.innerHTML=graphic.html;
  api.budgetTooltipRuntime();
  const hit=document.querySelector('[data-budget-tooltip]');
  document.fire('focusin',{target:hit});
  const tip=document.querySelector('.budget-tooltip');
  assert.equal(tip.hidden,false);
  assert.ok(tip.querySelector('.yr').textContent);
  assert.match(tip.querySelector('.amt').textContent,/M/);
  assert.match(tip.querySelector('.agency').textContent,/1,000,000/);
  assert.match(api.EXPORT_CSS,/\.budget-tooltip \.amt\{[^}]*font-size:22px/);
  document.fire('keydown',{key:'Escape'});
  assert.equal(tip.hidden,true);
});


test('budget summary budgets and signed rates are editable, recalculated and exported as numeric data', () => {
  const {api,document}=generator();api.seed();
  const state=api.editorStates.get('summary');
  edit(input(state,'current',0),'1500000');
  edit(input(state,'averageRatePct',0),'-2.5');
  edit(input(state,'inflationRatePct',0),'3');
  const chart=api.EXPORT_CHARTS.find(chart=>chart.id==='summary');
  const graphic=api.frozenGraphic(chart,{department:'Treasurer',cycle:'2026-recommendation'});
  assert.equal(graphic.metadata.edited,true);
  const row=graphic.metadata.data.rows[0];
  assert.equal(row.current,1500000);
  assert.equal(row.net,500000);
  assert.equal(row.percent,.5);
  assert.equal(row.averageRatePct,-2.5);
  assert.equal(row.inflationRatePct,3);
  assert.match(graphic.svg,/1,500,000/);
  assert.match(graphic.svg,/-2.5%/);
  assert.deepEqual(load(graphic.html,null,false)('figure').children().toArray().map(node=>node.name),['h2','svg','a']);
  assert.equal(document.getElementById('downloadSummarySvg').hidden,false);
  assert.equal(document.getElementById('copy-marker-summary').disabled,false);
  assert.match(document.getElementById('copy-marker-summary').closest('.graphic-marker').textContent,/\[budget-graphic id="summary"\]/);
  assert.equal(api.getData()[1].amount,1200000,'summary override does not silently alter history chart');
  edit(input(api.editorStates.get('appropriations'),'amount',0),'1100000');
  const updated=api.frozenGraphic(chart,{department:'Treasurer',cycle:'2026-recommendation'}).metadata.data.rows[0];
  assert.equal(updated.previous,1100000);
  assert.equal(updated.current,1500000,'summary override survives source chart edits');
  assert.equal(updated.net,400000);
});

test('summary preserves unknown values and undefined percent changes rather than inventing zeros', () => {
  const {api}=generator();api.seed();
  const state=api.editorStates.get('summary');
  edit(input(state,'previous',0),'0');
  const chart=api.EXPORT_CHARTS.find(chart=>chart.id==='summary');
  let data=api.frozenGraphic(chart,{department:'Treasurer',cycle:'2026-recommendation'}).metadata.data;
  assert.equal(data.rows[0].percent,null);
  edit(input(state,'current',0),'');
  data=api.frozenGraphic(chart,{department:'Treasurer',cycle:'2026-recommendation'}).metadata.data;
  assert.equal(data.rows[0].current,null);
  assert.equal(data.rows[0].net,null);
  state.reset.fire('click');
  data=api.frozenGraphic(chart,{department:'Treasurer',cycle:'2026-recommendation'}).metadata.data;
  assert.equal(data.rows[0].previous,1000000);
  assert.equal(data.rows[0].current,1200000);
});


test('individual and bulk summary ZIPs contain matching numeric data, manifest and graphics', async () => {
  const {api}=generator();api.seedAll();
  const state=api.editorStates.get('summary');
  edit(input(state,'current',0),'1600000');
  const downloads=[];api.setDownload((name,blob)=>downloads.push({name,blob}));
  api.exportForAstro([api.EXPORT_CHARTS.find(chart=>chart.id==='summary')]);
  api.exportForAstro(api.availableExports());
  assert.equal(downloads.length,2);
  for(const {blob} of downloads){
    const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),decoder=new TextDecoder(),files={};
    let offset=0;
    while(view.getUint32(offset,true)===0x04034b50){
      const size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true);
      const name=decoder.decode(bytes.slice(offset+30,offset+30+nameLength));
      const start=offset+30+nameLength+extraLength;
      files[name]=decoder.decode(bytes.slice(start,start+size));offset=start+size;
    }
    const folder=Object.keys(files).find(name=>name.endsWith('manifest.json')).replace('manifest.json','');
    const data=JSON.parse(files[folder+'summary.json']);
    const manifest=JSON.parse(files[folder+'manifest.json']);
    const summary=manifest.graphics.find(chart=>chart.id==='summary');
    assert.equal(summary.placeholder,'[budget-graphic id="summary"]');
    assert.equal(data.currentYear,2026);
    assert.equal(data.cycle,'2026-recommendation');
    assert.equal(data.rows[0].current,1600000);
    assert.equal(data.rows[0].current,summary.data.rows[0].current);
    assert.match(files[folder+'summary.svg'],/1,600,000/);
    assert.match(files[folder+'summary.html'],/data-budget-graphic="summary"/);
  }
});

test('appropriation changes match codes across renamed accounts and retain additions and removals', async () => {
  const { api } = generator(); api.seed();
  const row = (code, label, amount) => ({ department_number:'01', account_code:code, account_description:label, amount });
  api.setAppropriationRows({
    2025:[row('100', 'Contractual Services', 100), row('100', 'CONTRACTUAL SVCS.', 50), row('200', 'Removed', 40)],
    2026:[row('100', 'Contract services', 180), row('300', 'New', 20)]
  });
  const { rows } = await api.loadAppropriationChanges({code:'1', name:'Treasurer'});
  assert.equal(rows.length, 3);
  const matched = rows.find(row => row.code === '100');
  assert.equal(matched.previous, 150);
  assert.equal(matched.current, 180);
  assert.equal(matched.net, 30);
  assert.equal(matched.label, 'Contract services');
  assert.equal(rows.find(row => row.code === '200').net, -40);
  assert.equal(rows.find(row => row.code === '300').net, 20);
});

test('historical City IPRA schemas restore every missing appropriation and workforce year', async () => {
  const fixtures = JSON.parse(readFileSync(new URL('./fixtures/ipra-history.json', import.meta.url), 'utf8'));
  const { api } = generator();
  const department = { code:'60', name:'Civilian Office of Police Accountability' };
  for (const fixture of fixtures) {
    api.setAppropriationRows({[fixture.year]:fixture.rows});
    const result = await (fixture.kind === 'workforce' ? api.loadWorkforceYear : api.loadYear)(fixture.year, department);
    assert.equal(result.available, true, `${fixture.kind} ${fixture.year}: ${result.reason}`);
    assert.equal(result.amount ?? result.positions, fixture.expected);
    assert.equal(result.rowCount, fixture.rows.length);
  }
  assert.equal(api.departmentMatch({department_number:'56',department_description:'IPRA'}, {code:'1',name:'Mayor'}).matched, false);
  assert.equal(api.departmentMatch({department_description:'IPRA'}, department).matched, true);
  assert.equal(api.departmentMatch({department_description:'COPA'}, department).matched, true);
});

test('proposed marks are gray while ordinance baseline marks retain historical colors', () => {
  const { api, document } = generator(); api.seedAll();
  const proposed = '#a8adb2';
  const line = () => document.getElementById('budgetSvg');
  assert.equal(line().querySelector('path[fill="none"]').getAttribute('stroke'), proposed);
  assert.equal(line().querySelector('circle[r="4.8"]').getAttribute('fill'), proposed);
  assert.equal(document.getElementById('workforceSvg').querySelectorAll('rect')[2].getAttribute('fill'), proposed);
  assert.equal(document.getElementById('largestAppropriationsSvg').querySelector('rect').getAttribute('fill'), '#3e6f8c');
  assert.match(api.frozenGraphic(api.EXPORT_CHARTS.find(chart=>chart.id==='appropriations'),{department:'Treasurer',cycle:'2026-recommendation'}).html, /#a8adb2/);
  api.setPreviewCycle('2027-prep'); api.seedAll();
  assert.equal(line().querySelector('path[fill="none"]').getAttribute('stroke'), '#3e6f8c');
  assert.equal(line().querySelector('circle[r="3.4"]').getAttribute('fill'), '#3e6f8c');
  assert.equal(document.getElementById('workforceSvg').querySelectorAll('rect')[2].getAttribute('fill'), '#3e6f8c');
  assert.equal(document.getElementById('largestAppropriationsSvg').querySelector('rect').getAttribute('fill'), '#3e6f8c');
});

test('nominal summary rates average annual changes while adjusted rates use endpoint change over starting value', () => {
  const {api,document}=generator();api.seed();
  const rows=[100,120,100].map((amount,i)=>({year:2023+i,available:true,amount}));
  assert.ok(Math.abs(api.averageAnnualChange(rows,'amount',2023,2025)-1/60)<1e-12);
  const factors={2023:1.2,2024:1.1,2025:1};
  const expected=((132-120)/120+(100-132)/132)/2;
  assert.ok(Math.abs(api.averageAnnualChange(rows,'amount',2023,2025,factors)-expected)<1e-12);
  const history=Array.from({length:15},(_,i)=>({year:2011+i,available:true,amount:100*(i%2?1.2:1),positions:100*(i%2?1.2:1)}));
  api.renderSummaryTable(history,history);
  const summary=api.frozenGraphic(api.EXPORT_CHARTS.find(chart=>chart.id==='summary'),{department:'Treasurer',departmentCode:'01',cycle:'2026-recommendation'}).metadata.data;
  assert.ok(Math.abs(summary.rows[0].averageRatePct-100/60)<1e-10);
  assert.ok(Math.abs(summary.rows[1].averageRatePct-100/60)<1e-10);
  const adjusted=history.filter(row=>row.year<=2024).map(row=>row.amount*api.DOLLAR_2024_FACTORS[row.year]);
  const real=(adjusted.at(-1)-adjusted[0])/adjusted[0]/13*100;
  assert.ok(Math.abs(summary.rows[0].inflationRatePct-real)<1e-10);
  assert.match(document.getElementById('summaryTableFoot').textContent,/arithmetic averages.*2011–2025/);
});

test('annual average requires every year and defined annual percentage changes', () => {
  const {api}=generator();
  const rows=[100,120,100].map((amount,i)=>({year:2023+i,available:true,amount}));
  assert.equal(api.averageAnnualChange([rows[0],rows[2]],'amount',2023,2025),null);
  assert.equal(api.averageAnnualChange(rows.map(row=>row.year===2024?{...row,available:false}:row),'amount',2023,2025),null);
  assert.equal(api.averageAnnualChange([{...rows[0],amount:0},rows[1]],'amount',2023,2024),null);
  assert.equal(api.averageAnnualChange(rows,'amount',2023,2025,{2023:1,2025:1}),null);
  assert.equal(api.averageAnnualChange(rows,'amount',2023,2023),null);
  assert.equal(api.averageAnnualChange([rows[0],{...rows[1],amount:0}],'amount',2023,2024),-1);
});

test('COPA nominal averages start in 2018 and end in 2025, excluding proposed 2026', () => {
  const {api,document}=generator();api.seed();api.selectFringe('60');
  const rows=Array.from({length:10},(_,i)=>({year:2017+i,available:true,amount:i===0?1:100*1.1**(i-1),positions:10}));
  rows.at(-1).amount=1;
  api.renderSummaryTable(rows,rows);
  const data=api.frozenGraphic(api.EXPORT_CHARTS.find(chart=>chart.id==='summary'),{department:'IPRA/COPA',departmentCode:'60',cycle:'2026-recommendation'}).metadata.data;
  assert.equal(data.rateStartYear,2018);
  assert.ok(Math.abs(data.rows[0].averageRatePct-10)<1e-10);
  assert.equal(data.rows[1].averageRatePct,0);
  assert.match(document.getElementById('summaryTableFoot').textContent,/2018–2025/);
});


test('workforce stacks retain component colors and distinct proposed shades through editing and export', () => {
  const { api, document } = generator(); api.seed();
  const state = api.editorStates.get('workforce');
  const keys = ['annualPositions', 'monthlyPositions', 'hourlyPositions', 'monthlyFtes', 'hourlyFtes'];
  for (const yearIndex of [0, 1]) {
    keys.forEach((key, index) => edit(input(state, 'components.' + key, yearIndex), String(index + 1)));
    assert.equal(api.getWorkforce()[yearIndex].positions, 15);
  }
  const svg = document.getElementById('workforceSvg');
  const bars = svg.querySelectorAll('rect').filter(node => node.getAttribute('fill') !== 'transparent');
  assert.deepEqual(bars.map(node => node.getAttribute('fill')), [
    '#3e6f8c', '#e9b84a', '#dce8ef', '#4f8795', '#8b6472',
    '#a8adb2', '#747b82', '#e1e3e5', '#c3c7ca', '#50575e'
  ]);
  for (const start of [0, 5]) {
    for (let index = start + 1; index < start + 5; index++) {
      const top = Number(bars[index].getAttribute('y'));
      const height = Number(bars[index].getAttribute('height'));
      assert.ok(Math.abs(top + height - Number(bars[index - 1].getAttribute('y'))) < 1e-8);
    }
  }
  const frozen = api.frozenGraphic(api.EXPORT_CHARTS.find(chart => chart.id === 'workforce'), {department:'Treasurer',cycle:'2026-recommendation'});
  for (const label of ['Annual positions', 'Monthly positions', 'Hourly positions', 'Monthly FTEs', 'Hourly FTEs']) {
    assert.ok(frozen.html.includes(label));
  }
  assert.match(frozen.html, /#747b82/);
});


test('fractional workforce counts display as integers while totals and exported data retain precision', () => {
  const { api, document } = generator(); api.seed();
  const state = api.editorStates.get('workforce');
  edit(input(state, 'components.annualPositions', 0), '10.4');
  edit(input(state, 'components.annualPositions', 1), '12.8');
  assert.equal(api.getWorkforce()[0].positions, 10.4);
  assert.equal(api.getWorkforce()[1].positions, 12.8);
  assert.match(document.getElementById('workforceSvg').querySelectorAll('rect[aria-label]')[1].getAttribute('aria-label'), /13; Treasurer · budgeted positions\/FTEs; Annual positions: 13$/);
  const summary = document.getElementById('summarySvg').querySelectorAll('text').map(node => node.textContent);
  assert.ok(summary.includes('10'));
  assert.ok(summary.includes('13'));
  assert.ok(summary.includes('+2'));
  assert.ok(summary.includes('23.1%'));
  assert.ok(!summary.includes('10.4'));
  const frozen = api.frozenGraphic(api.EXPORT_CHARTS.find(chart => chart.id === 'summary'), {department:'Treasurer',cycle:'2026-recommendation'});
  const positions = frozen.metadata.data.rows.find(row => row.id === 'positions');
  assert.equal(positions.previous, 10.4);
  assert.equal(positions.current, 12.8);
  edit(input(state, 'components.annualPositions', 1), '10.39');
  assert.ok(!document.getElementById('summarySvg').querySelectorAll('text').some(node => node.textContent === '-0'));
});

test('inflation-adjusted summary headings match the calculated end year', () => {
  const { api, document } = generator(); api.seed();
  assert.match(document.getElementById('summaryTable').textContent, /Inflation-adjusted Rate \(2011–2024\)/);
  assert.match(document.getElementById('summaryTableFoot').textContent, /2011–2024.*2024 dollars/);
  api.setPreviewCycle('2027-prep'); api.seed();
  assert.match(document.getElementById('summaryTable').textContent, /Inflation-adjusted Rate \(2011–2025\)/);
  assert.match(document.getElementById('summaryTableFoot').textContent, /2011–2025.*2025 dollars/);
});


test('COPA uses the supplied 2024 factors for the 2026 proposal and 2025 factors for 2027', () => {
  const { api, document } = generator(); api.seed(); api.selectFringe('60');
  assert.deepEqual(Object.values(api.DOLLAR_2024_FACTORS), [
    1.336288892, 1.316299182, 1.301409517, 1.279063151, 1.282858924,
    1.274411039, 1.250904281, 1.229354749, 1.211641879, 1.198267131,
    1.149772387, 1.069027203, 1.034607895, 1
  ]);
  const history = [13289393,13851285,13753178,13314826,14728193,15036021,16756984,15089632]
    .map((amount, index) => ({year:2018+index,available:true,amount,positions:150}));
  const summary = () => api.frozenGraphic(api.EXPORT_CHARTS.find(chart => chart.id === 'summary'), {}).metadata.data;
  api.renderSummaryTable(history, history);
  const rate2024 = summary().rows[0].inflationRatePct;
  assert.equal(summary().inflationYear, 2024);
  assert.ok(Math.abs(rate2024 - 0.4280629710542864) < 1e-7);
  assert.match(document.getElementById('summaryTable').textContent, /Inflation-adjusted Rate \(2018–2024\)/);
  assert.match(document.getElementById('summaryTable').textContent, /0\.4%/);
  // The 2025 budget cannot affect a calculation whose period ends in 2024.
  const changed = history.map(row => row.year === 2025 ? {...row,amount:1} : row);
  api.renderSummaryTable(changed, history);
  assert.equal(summary().rows[0].inflationRatePct, rate2024);
  api.setPreviewCycle('2027-prep');
  api.renderSummaryTable(history, history);
  assert.equal(summary().inflationYear, 2025);
  assert.ok(Math.abs(summary().rows[0].inflationRatePct - (-1.485580689700751)) < 1e-10);
  assert.match(document.getElementById('summaryTable').textContent, /Inflation-adjusted Rate \(2018–2025\)/);
  // Switching back must restore both the 2024 factors and the 2024 heading.
  api.setPreviewCycle('2026-recommendation');
  api.renderSummaryTable(history, history);
  assert.equal(summary().rows[0].inflationRatePct, rate2024);
  assert.equal(summary().inflationYear, 2024);
});


test('Treasurer adjusted rate uses the starting adjusted budget as denominator', () => {
  const {api}=generator();
  const rows=[{year:2011,available:true,amount:2181879},{year:2024,available:true,amount:6272699}];
  const rate=api.inflationAdjustedRate(rows,'amount',2011,2024,api.DOLLAR_2024_FACTORS);
  assert.ok(Math.abs(rate - ((6272699-2915620.6713880682)/2915620.6713880682)/13) < 1e-12);
  assert.equal((rate*100).toFixed(1),'8.9');
  assert.equal(api.inflationAdjustedRate(rows.slice(1),'amount',2011,2024,api.DOLLAR_2024_FACTORS),null);
  assert.equal(api.inflationAdjustedRate(rows.map(row=>row.year===2024?{...row,amount:0}:row),'amount',2011,2024,api.DOLLAR_2024_FACTORS),-1/13);
  assert.equal(api.inflationAdjustedRate(rows,'amount',2011,2024,{2011:1}),null);
  assert.equal(api.inflationAdjustedRate(rows,'amount',2024,2024,api.DOLLAR_2024_FACTORS),null);
  assert.equal(api.inflationAdjustedRate([{...rows[0],amount:0},rows[1]],'amount',2011,2024,api.DOLLAR_2024_FACTORS),null);
});


test('nominal rate periods advance with the cycle and include the latest ordinance for budgets and workforce', () => {
  const {api,document}=generator();api.seed();
  const rows=Array.from({length:17},(_,i)=>({year:2011+i,available:true,amount:100,positions:100}));
  rows.find(row=>row.year===2026).amount=200;
  rows.find(row=>row.year===2026).positions=150;
  rows.find(row=>row.year===2027).amount=10000;
  rows.find(row=>row.year===2027).positions=10000;
  const summary=()=>api.frozenGraphic(api.EXPORT_CHARTS.find(chart=>chart.id==='summary'),{}).metadata.data;
  api.renderSummaryTable(rows,rows);
  assert.equal(summary().rateEndYear,2025);
  assert.equal(summary().rows[0].averageRatePct,0);
  assert.equal(summary().rows[1].averageRatePct,0);
  api.setPreviewCycle('2027-prep');api.renderSummaryTable(rows,rows);
  assert.equal(summary().rateEndYear,2026);
  assert.ok(Math.abs(summary().rows[0].averageRatePct-100/15)<1e-10);
  assert.ok(Math.abs(summary().rows[1].averageRatePct-50/15)<1e-10);
  assert.match(document.getElementById('summaryTable').textContent,/Average Annual Rate \(2011–2026\)/);
  assert.match(document.getElementById('summaryTableFoot').textContent,/percentage changes over 2011–2026/);
  assert.equal(summary().inflationYear,2025);
  api.selectFringe('60');api.renderSummaryTable(rows,rows);
  assert.equal(summary().rateStartYear,2018);
  assert.ok(Math.abs(summary().rows[0].averageRatePct-100/8)<1e-10);
  assert.ok(Math.abs(summary().rows[1].averageRatePct-50/8)<1e-10);
  const missing=rows.filter(row=>row.year!==2026);
  api.renderSummaryTable(missing,missing);
  assert.equal(summary().rows[0].averageRatePct,null);
  assert.equal(summary().rows[1].averageRatePct,null);
  api.setPreviewCycle('2026-recommendation');api.renderSummaryTable(rows,rows);
  assert.equal(summary().rateEndYear,2025);
  assert.equal(summary().rows[0].averageRatePct,0);
});


test('City appropriation account columns match across years while descriptions supply labels', async () => {
  const {api,document}=generator();api.seedAll();
  api.setAppropriationRows({
    2025:[
      {department_number:'01',appropriation_account:'0005',appropriation_account_description:'Old salary description',account_code:'wrong1',account_description:'Wrong label',amount:100},
      {department_number:'01',appropriation_account:'5',appropriation_account_description:'Other salary spelling',amount:50},
      {department_number:'01',appropriation_account:'0010',appropriation_account_description:'Same description',amount:10}
    ],
    2026:[
      {'DEPARTMENT NUMBER':'01','APPROPRIATION ACCOUNT':5,'APPROPRIATION ACCOUNT DESCRIPTION':'Current salary description',account_code:'wrong2',account_description:'Wrong label',amount:180},
      {department_number:'01',appropriation_account:'0020',appropriation_account_description:'Same description',amount:20}
    ]
  });
  const result=await api.loadAppropriationChanges({code:'1',name:'Treasurer'});
  assert.equal(result.rows.length,3);
  const salary=result.rows.find(row=>row.label==='Current salary description');
  assert.equal(salary.previous,150);
  assert.equal(salary.current,180);
  assert.equal(salary.net,30);
  assert.equal(result.rows.find(row=>row.code==='0010').net,-10);
  assert.equal(result.rows.find(row=>row.code==='0020').net,20);
  const state=api.editorStates.get('appropriation-changes');
  state.config.render(result);state.config.details(result);
  assert.match(document.getElementById('appropriationChangesSvg').textContent,/Current salary description/);
  assert.match(document.getElementById('appropriationChangesDetails').textContent,/Current salary description/);
  assert.doesNotMatch(document.getElementById('appropriationChangesSvg').textContent,/Wrong label|Old salary description/);
});

test('appropriation changes require an account identifier rather than matching descriptions', async () => {
  const {api}=generator();api.seed();
  api.setAppropriationRows({2025:[{department_number:'01',appropriation_account_description:'No account code',amount:100}]});
  await assert.rejects(api.loadAppropriationChanges({code:'1',name:'Treasurer'}),/no appropriation account code/);
});

test('appropriation toggle adjusts the plotted view without changing source budgets or summary rates', () => {
  const {api,document}=generator();api.seed();
  api.getData().unshift({year:2011,available:true,amount:1000000},{year:2024,available:true,amount:500000});
  const summaryBefore=JSON.stringify(api.frozenGraphic(api.EXPORT_CHARTS.find(chart=>chart.id==='summary'),{}).metadata.data);
  document.getElementById('appropriationAdjusted').fire('click');
  let svg=document.getElementById('budgetSvg');
  assert.equal(document.getElementById('appropriationAdjusted').getAttribute('aria-checked'),'true');
  assert.equal(document.getElementById('appropriationAdjusted').getAttribute('role'),'switch');
  assert.equal(document.getElementById('appropriationAdjustedLabel').textContent,'Inflation adjusted (2024 dollars)');
  assert.doesNotMatch(svg.querySelectorAll('text').map(node=>node.textContent).join(' '),/Inflation-adjusted|Nominal dollars/);
  assert.match(svg.querySelector('[data-year="2011"]').getAttribute('data-budget-tooltip-detail'),/1,336,289 in 2024 dollars.*Nominal budget: \$1,000,000/s);
  assert.match(svg.querySelector('[data-year="2025"]').getAttribute('data-budget-tooltip-value'),/No inflation factor/);
  assert.match(document.getElementById('appropriationBasisNote').textContent,/2025, 2026.*gaps/);
  assert.match(document.getElementById('details').textContent,/Total \(2024 dollars\)/);
  assert.equal(api.getData()[0].amount,1000000);
  assert.equal(JSON.stringify(api.frozenGraphic(api.EXPORT_CHARTS.find(chart=>chart.id==='summary'),{}).metadata.data),summaryBefore);
  let frozen=api.frozenGraphic(api.EXPORT_CHARTS.find(chart=>chart.id==='appropriations'),{});
  assert.equal(frozen.metadata.priceBasis,'adjusted');
  assert.equal(frozen.metadata.dollarBaseYear,2024);
  assert.deepEqual(Array.from(frozen.metadata.missingInflationFactorYears),[2025,2026]);
  assert.doesNotMatch(frozen.svg,/Inflation-adjusted · 2024 dollars/);
  assert.match(frozen.html,/data-budget-price-toggle/);
  assert.match(frozen.html,/data-budget-price-view="nominal" hidden/);
  assert.match(frozen.html,/data-budget-price-view="adjusted"/);
  // Editing continues to use nominal dollars, then redraws the selected view.
  const state=api.editorStates.get('appropriations');
  edit(input(state,'amount',0),'2000000');
  assert.equal(api.getData()[0].amount,2000000);
  assert.match(document.getElementById('budgetSvg').querySelector('[data-year="2011"]').getAttribute('data-budget-tooltip-detail'),/2,672,578 in 2024 dollars/);
  api.setPreviewCycle('2027-prep');
  api.renderChart(api.getData());
  svg=document.getElementById('budgetSvg');
  assert.equal(svg.getAttribute('data-dollar-year'),'2025');
  assert.equal(document.getElementById('appropriationAdjustedLabel').textContent,'Inflation adjusted (2025 dollars)');
  assert.match(svg.querySelector('[data-year="2024"]').getAttribute('data-budget-tooltip-detail'),/515,411 in 2025 dollars/);
  assert.match(svg.querySelector('[data-year="2025"]').getAttribute('data-budget-tooltip-detail'),/1,000,000 in 2025 dollars/);
  document.getElementById('appropriationAdjusted').fire('click');
  svg=document.getElementById('budgetSvg');
  assert.equal(document.getElementById('appropriationAdjusted').getAttribute('aria-checked'),'false');
  assert.equal(svg.getAttribute('data-price-basis'),'nominal');
  assert.match(svg.querySelector('[data-year="2026"]').getAttribute('data-budget-tooltip-detail'),/1,200,000/);
  frozen=api.frozenGraphic(api.EXPORT_CHARTS.find(chart=>chart.id==='appropriations'),{});
  assert.equal(frozen.metadata.priceBasis,'nominal');
  assert.equal(frozen.metadata.dollarBaseYear,null);
});

test('adjusted appropriations with no supplied factors remain gaps without invalid SVG geometry', () => {
  const {api,document}=generator();api.seed();
  document.getElementById('appropriationAdjusted').fire('click');
  const svg=document.getElementById('budgetSvg');
  assert.doesNotMatch(svg.outerHTML,/NaN|Infinity/);
  assert.equal(svg.querySelectorAll('circle').length,0);
  assert.match(document.getElementById('appropriationBasisNote').textContent,/No supplied inflation factors for 2025, 2026/);
});


test('2025 FOIA actual spend uses the supplied snapshot and aggregates categories across funds', () => {
  const {api}=generator();
  const csv=readFileSync(new URL('../2025 FOIA response actuals.xlsx - formatted.csv',import.meta.url),'utf8');
  assert.equal(api.ACTUAL_SPEND_2025_CSV,csv);
  assert.equal(api.ACTUAL_SPEND_2025_ROWS.length,703);
  const copa=api.actualSpendForDepartment({code:'60'});
  assert.equal(copa.rows.length,6);
  const personal=copa.rows.find(row=>row.code==='0');
  assert.equal(personal.actuals,13065031);
  assert.equal(personal.budget,13218027);
  const contract=copa.rows.find(row=>row.code==='100');
  assert.equal(contract.actuals,604494);
  assert.equal(contract.encumbrances,1680);
  assert.equal(contract.budget,1004605);
  assert.equal(copa.rows.reduce((sum,row)=>sum+row.actuals,0),14214591);
  const base={departmentCode:'60',code:'100',label:'Contract services',budget:100,actuals:80,encumbrances:5,sourceVariance:15};
  const merged=api.actualSpendForDepartment({code:'060'},[{...base,fundCode:'100'},{...base,fundCode:'200',actuals:-20}]);
  assert.equal(merged.rows.length,1);
  assert.equal(merged.rows[0].actuals,60);
  assert.equal(merged.rows[0].budget,200);
  assert.equal(merged.rows[0].encumbrances,10);
  assert.deepEqual(Array.from(merged.rows[0].funds),['100','200']);
  assert.equal(api.foiaMoney(' (1,234) '),-1234);
  assert.equal(api.foiaMoney(' - '),0);
  assert.equal(api.foiaMoney(' '),null);
  assert.equal(api.foiaMoney('unknown'),null);
  assert.equal(api.actualSpendForDepartment({code:'12345'}).rows.length,0);
});

test('actual spend is available in the 2027 cycle, supports edits and frozen exports, and clears cleanly', async () => {
  const {api,document}=generator();api.seed();api.selectFringe('60');
  api.buildActualSpendCategories();
  assert.equal(document.getElementById('actualSpendCategoriesSvg'),null);
  api.setPreviewCycle('2027-prep');api.buildActualSpendCategories();api.refreshExportControls();
  assert.equal(document.getElementById('actualSpendCategoriesTitle').textContent,'2025 Actual Spend, Local Funds');
  assert.ok(document.getElementById('actualSpendCategoriesSvg'));
  const hit=document.getElementById('actualSpendCategoriesSvg').querySelector('[data-account="100"]');
  assert.match(hit.getAttribute('data-budget-tooltip-value'),/604,494/);
  assert.doesNotMatch(hit.getAttribute('data-budget-tooltip-detail'),/Encumbrances|Account:|Funds:|budget − actuals/);
  const chart=api.EXPORT_CHARTS.find(chart=>chart.id==='actual-spend-categories');
  assert.ok(api.availableExports().some(chart=>chart.id==='actual-spend-categories'));
  const state=api.editorStates.get('actual-spend-categories');
  edit(input(state,'actuals'),'12000000');
  assert.equal(api.getActualSpend().rows[0].actuals,12000000);
  let frozen=api.frozenGraphic(chart,{department:'COPA',cycle:'2027-prep'});
  assert.match(frozen.svg,/12,000,000/);
  assert.equal(frozen.metadata.data.year,2025);
  assert.equal(frozen.metadata.edited,true);
  assert.doesNotMatch(frozen.svg,/NaN|Infinity/);
  state.reset.fire('click');
  assert.equal(api.getActualSpend().rows[0].actuals,13065031);
  let zip;
  api.setDownload((name,blob)=>zip=blob);
  await api.exportForAstro([chart]);
  const files=await unzipStored(zip);
  const manifestName=Object.keys(files).find(name=>name.endsWith('manifest.json'));
  const manifest=JSON.parse(files[manifestName]);
  assert.ok(manifest.graphics.some(chart=>chart.id==='actual-spend-categories'));
  assert.ok(!manifest.unsupported.includes('actual-spend-categories'));
  api.clearRenderedData();
  assert.equal(api.getActualSpend(),null);
  assert.equal(document.getElementById('actualSpendCategoriesSvg'),null);
  api.selectFringe('12345');api.buildActualSpendCategories();
  assert.equal(document.getElementById('actualSpendCategoriesSvg'),null);
  assert.match(document.getElementById('actualSpendCategoriesStatus').textContent,/No 2025 FOIA/);
  api.selectFringe('60');api.setPreviewCycle('2026-recommendation');api.buildActualSpendCategories();
  assert.equal(document.getElementById('downloadActualSpendCategoriesSvg').hidden,true);
});

test('horizontal actual-spend stacks show unspent budget and preserve overspending and unknown budgets', () => {
  const {api,document}=generator();api.seed();api.setPreviewCycle('2027-prep');api.selectFringe('60');api.buildActualSpendCategories();api.refreshExportControls();
  const chart=api.EXPORT_CHARTS.find(chart=>chart.id==='actual-spend-categories');
  const svg=()=>document.getElementById('actualSpendCategoriesSvg');
  const actual=svg().querySelector('[data-category="100"][data-part="actuals"]');
  const unspent=svg().querySelector('[data-category="100"][data-part="unspent"]');
  assert.ok(Math.abs(Number(actual.getAttribute('x'))+Number(actual.getAttribute('width'))-Number(unspent.getAttribute('x')))<1e-8);
  assert.ok(Math.abs(Number(unspent.getAttribute('width'))/Number(actual.getAttribute('width'))-400111/604494)<1e-8);
  const getRow=()=>api.frozenGraphic(chart,{}).metadata.data.rows.find(row=>row.code==='100');
  assert.equal(getRow().unspent,400111);
  assert.match(svg().querySelector('[data-account="100"]').getAttribute('data-budget-tooltip-detail'),/Unspent: \$400,111/);
  assert.match(svg().textContent,/BUDGETED/);
  assert.match(document.getElementById('actualSpendCategoriesDetails').textContent,/400,111/);
  const state=api.editorStates.get('actual-spend-categories');
  const index=api.getActualSpend().rows.findIndex(row=>row.code==='100');
  edit(input(state,'actuals',index),'1100000');
  assert.equal(getRow().unspent,0);
  assert.equal(svg().querySelector('[data-category="100"][data-part="unspent"]').getAttribute('width'),'0');
  assert.match(svg().querySelector('[data-account="100"]').getAttribute('data-budget-tooltip-detail'),/Over budget: \$95,395/);
  edit(input(state,'budget',index),'');
  assert.equal(getRow().unspent,null);
  assert.equal(svg().querySelector('[data-category="100"][data-part="unspent"]'),null);
  assert.match(svg().textContent,/Budget not supplied/);
  assert.doesNotMatch(svg().outerHTML,/NaN|Infinity/);
});


test('2026 persistent extract matches source, aggregates all funds and stays in the new cycle', async () => {
  const { api, document } = generator();
  const source=readFileSync(new URL('../2026 Vacancies Over Time - Persistent Vacancies Jan-Sept.csv',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  assert.equal(api.PERSISTENT_VACANCIES_2026_CSV,source);
  const copa=api.persistentVacanciesForDepartment({code:'060',name:'COPA'});
  assert.equal(copa.persistentTitleData.reduce((sum,row)=>sum+row.persistentVacancies,0),20);
  assert.equal(copa.persistentCount,14);
  assert.equal(copa.persistentTitleData[0].title,'Investigator-COPA');
  assert.equal(copa.persistentTitleData[0].persistentVacancies,5);
  assert.equal(api.persistentVacanciesForDepartment({code:'999',name:'COPA'}).persistentTitleData.length,0);
  const old=await api.loadVacancies({code:'60',name:'COPA'});
  assert.equal(old.rangeLabel,'February–September 2025');
  assert.equal(old.persistentCount,13);
  api.selectDepartment('60','COPA');
  api.setPreviewCycle('2027-prep');
  await api.buildVacancies();
  assert.equal(api.getVacancies().rangeLabel,'January–September 2026');
  assert.equal(api.getVacancies().data.length,9);
  assert.equal(api.getVacancies().persistentCount,20);
  await api.buildPersistentVacancies();
  assert.equal(api.getPersistent().rangeLabel,'January–September 2026');
  const chart=api.EXPORT_CHARTS.find(row=>row.id==='persistent-vacancies');
  const frozen=api.frozenGraphic(chart,{department:'IPRA/COPA',departmentCode:'60',cycle:'2027-prep'});
  assert.match(frozen.svg,/January–September 2026/);
  assert.match(frozen.svg,/data-budget-tooltip-value="5"/);
  assert.match(document.getElementById('persistentVacanciesFoot').textContent,/2026/);
  api.setPreviewCycle('2026-recommendation');
  await api.buildPersistentVacancies();
  assert.equal(api.getPersistent(),null);
});


test('2027 monthly vacancy chart matches every supplied 2026 department and exports the reporting year', async () => {
  const {api,document}=generator();
  api.seed();
  const csv=readFileSync(new URL('../2026 Vacancies Over Time - MASTER vacancies.csv',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  assert.equal(api.VACANCY_AGGREGATE_2026_CSV,csv);
  api.setPreviewCycle('2027-prep');
  const rows=api.parseCsv(csv).slice(1);
  assert.equal(rows.length,39);
  for(const row of rows){
    const code=row[0].match(/^D(\d+)/)[1];
    const result=await api.loadVacancies({code,name:'Renamed department'});
    assert.equal(result.rangeLabel,'January–September 2026');
    assert.equal(result.data.length,9);
    assert.equal(result.persistentCount,Number(row[2]));
    result.data.forEach((month,index)=>{
      assert.equal(month.year,2026);
      assert.equal(month.available,true);
      assert.equal(month.budgeted,Number(row[1]));
      assert.equal(month.vacancies,Number(row[index+3]));
      assert.equal(month.filled+month.persistent+month.nonpersistent,month.budgeted);
      assert.equal(month.vacancyRate,month.vacancies/month.budgeted);
    });
    assert.equal(result.avgVacancyRate,result.data.reduce((sum,d)=>sum+d.vacancyRate,0)/9);
  }
  await assert.rejects(api.loadVacancies({code:'999',name:'COPA'}),/No 2026 monthly vacancy row/);
  api.selectDepartment('60','COPA');
  await api.buildVacancies();
  const data=api.getVacancies();
  assert.equal(document.getElementById('vacanciesTitle').textContent,'IPRA/COPA Full-time Vacancies, Jan-Sept 2026');
  assert.equal(data.data[0].filled,120);
  assert.equal(data.data[0].nonpersistent,10);
  assert.equal(data.data.at(-1).filled,115);
  assert.equal(data.data.at(-1).nonpersistent,15);
  assert.match(document.getElementById('vacanciesFoot').textContent,/2026 Vacancies Over Time - MASTER/);
  const chart=api.EXPORT_CHARTS.find(row=>row.id==='vacancies');
  const frozen=api.frozenGraphic(chart,{department:'IPRA/COPA',departmentCode:'60',cycle:'2027-prep'});
  assert.match(frozen.svg,/January–September 2026/);
  assert.match(frozen.svg,/20.0%/);
  assert.match(frozen.svg,/23.3%/);
  assert.doesNotMatch(frozen.svg,/2025|NaN|Infinity/);
  let zip;
  api.setDownload((name,blob)=>zip=blob);
  await api.exportForAstro([chart]);
  const files=await unzipStored(zip);
  const manifest=JSON.parse(files[Object.keys(files).find(name=>name.endsWith('manifest.json'))]);
  assert.equal(manifest.cycle,'2027-prep');
  assert.equal(manifest.budgetYear,2027);
  assert.match(files[Object.keys(files).find(name=>name.endsWith('vacancies.svg'))],/January–September 2026/);
  api.setPreviewCycle('2026-recommendation');
  await api.buildVacancies();
  assert.equal(api.getVacancies().rangeLabel,'February–September 2025');
  assert.equal(api.getVacancies().data[0].budgeted,154);
  assert.equal(api.getVacancies().data.length,8);
  assert.match(document.getElementById('vacanciesFoot').textContent,/2025/);
});

test('2026 vacancy blanks remain gaps, true zeros stay available and averages exclude missing months', async () => {
  const {api}=generator();
  api.setPreviewCycle('2027-prep');
  const aggregate=api.VACANCY_AGGREGATE_2026.rows.find(row=>row.code==='60');
  aggregate.vacancies.February=null;
  const result=await api.loadVacancies({code:'060',name:'COPA'});
  assert.equal(result.data.length,9);
  assert.equal(result.data[1].available,false);
  assert.equal(result.availableDateKeys.length,8);
  const available=result.data.filter(row=>row.available);
  assert.equal(result.avgVacancyRate,available.reduce((sum,row)=>sum+row.vacancyRate,0)/8);
  const zero=await api.loadVacancies({code:'55',name:'Police Board'});
  assert.equal(zero.data.length,9);
  assert.ok(zero.data.every(row=>row.available&&row.vacancies===0&&row.vacancyRate===0));
  const parsed=api.vacancyAggregate2026FromCsv('Department,2026 Budgeted Annual Positions,Persistent Vacancies Jan-Sept 2026,January 2026,February 2026,March 2026\nD01 - Mayor,10,0,0,,1\n');
  assert.equal(parsed.months.length,2);
  assert.equal(parsed.rows[0].vacancies.January,0);
});


test('generator defaults to 2027 and preserves department codes across refreshed cycle lists', () => {
  const {api,document}=generator({preserveDefaultCycle:true});
  assert.equal(api.getCycle(),'2027-prep');
  assert.equal(document.querySelector('#budgetCycleSelect option[selected]').getAttribute('value'),'2027-prep');
  api.setDepartmentOptions([{code:'60',name:'COPA'},{code:'28',name:'City Treasurer'}]);
  assert.equal(api.getDepartment().code,'60');
  api.selectDepartment('028','City Treasurer');
  api.setPreviewCycle('2026-recommendation');
  api.setDepartmentOptions([{code:'28',name:'Office of the City Treasurer'},{code:'60',name:'COPA'}]);
  assert.equal(api.getDepartment().code,'28');
  assert.equal(api.getDepartment().name,'Office of the City Treasurer');
  assert.equal(document.getElementById('departmentSelect').value,'0');
  api.setPreviewCycle('2027-prep');
  api.setDepartmentOptions([{code:'60',name:'COPA'},{code:'28',name:'City Treasurer'}]);
  assert.equal(api.getDepartment().code,'28');
  assert.equal(document.getElementById('departmentSelect').value,'1');
  // API failure uses a fallback list; retain a selected department missing from it.
  api.setDepartmentOptions([{code:'60',name:'COPA'}]);
  assert.equal(api.getDepartment().code,'28');
  assert.match(document.getElementById('departmentSelect').textContent,/City Treasurer/);
});


test('2027 snapshot titles use proposal framing while data years and source notes stay accurate', async () => {
  const {api,document}=generator();
  api.setPreviewCycle('2027-prep');
  api.seed();
  api.selectDepartment('28','City Treasurer');
  api.setAppropriationRows(Object.fromEntries(Array.from({length:17},(_,i)=>[2011+i,[{
    department_number:'28',department_description:'Treasurer',appropriation_account:'0005',
    appropriation_account_description:'Salaries',amount:'100',total_budgeted_unit:'10',budgeted_unit:'ANNUAL',position_control:'1'
  }]])));
  await api.build();
  const expectedTitles={
    chartTitle:'City Treasurer Appropriation, Chicago City Budgets 2011–2027 (Proposed)',
    workforceTitle:'City Treasurer Budgeted Workforce, 2011–2027 (Proposed)',
    largestAppropriationsTitle:'City Treasurer Top 10 Largest Appropriations, 2027 proposed',
    summaryTableTitle:'City Treasurer Budget Summary'
  };
  for(const [id,title] of Object.entries(expectedTitles)){
    assert.equal(document.getElementById(id).textContent,title);
  }
  assert.equal(api.getData().at(-1).year,2027);
  assert.equal(api.getWorkforce().at(-1).year,2027);
  assert.match(document.getElementById('largestAppropriationsFoot').textContent,/2027 Budget Recommendations/);
  assert.match(document.getElementById('localFundsTitle').textContent,/2025/);
  assert.match(document.getElementById('vacanciesTitle').textContent,/Jan-Sept 2026/);
  assert.match(document.getElementById('persistentVacanciesTitle').textContent,/2026/);
  const chart=api.EXPORT_CHARTS.find(row=>row.id==='appropriations');
  const frozen=api.frozenGraphic(chart,{department:'Treasurer',departmentCode:'01',cycle:'2027-prep'});
  assert.match(frozen.html,/Appropriation, Chicago City Budgets 2011–2027 \(Proposed\)/);
  assert.match(frozen.metadata.source,/2026/);
  api.setPreviewCycle('2026-recommendation');
  api.seed();
  assert.equal(document.getElementById('summaryTableTitle').textContent,'Treasurer Budget Summary');
});


test('every graphic downloads full precision CSV and public exports freeze the same edited data', async () => {
  const {api,document}=generator();api.setPreviewCycle('2027-prep');api.seedAll();
  api.selectDepartment('60','COPA');api.buildActualSpendCategories();api.refreshExportControls();
  const state=api.editorStates.get('appropriations');
  edit(input(state,'amount',0),'1234567.89');
  edit(input(state,'title'),'Budget, "updated" é');
  let downloaded;
  api.setDownload((name,blob)=>downloaded={name,blob});
  for(const chart of api.EXPORT_CHARTS){
    const button=document.getElementById('download-data-'+chart.id);
    assert.equal(button.hidden,false,chart.id);
    assert.equal(button.disabled,false,chart.id);
    button.fire('click');
    assert.match(downloaded.name,new RegExp(chart.id+'\\.csv$'));
    assert.equal(downloaded.blob.type,'text/csv;charset=utf-8');
    const csv=await downloaded.blob.text();
    const table=api.chartDataTable(chart);
    assert.equal(csv.replace(/^\uFEFF/,''),api.chartCsv(table).replace(/^\uFEFF/,''));
    const frozen=api.frozenGraphic(chart,{department:'Treasurer',cycle:'2026-recommendation'});
    const link=load(frozen.html)('a.budget-data-download');
    assert.equal(link.attr('download'),downloaded.name);
    const publicCsv=decodeURIComponent(link.attr('href').split(',').slice(1).join(','));
    assert.equal(publicCsv,api.chartCsv(table));
  }
  const chart=api.EXPORT_CHARTS.find(row=>row.id==='appropriations');
  const table=api.chartDataTable(chart);
  assert.equal(table.rows[0][table.headers.indexOf('Appropriation ($)')],1234567.89);
  assert.equal(table.headers.length,4);
  assert.ok(!api.chartCsv(table).includes('Budget, ""updated"" é'));
  assert.deepEqual(Array.from(table.headers),['Year','Appropriation ($)','Inflation factor (2025 dollars)','Inflation-adjusted appropriation (2025 dollars)']);
  assert.equal(table.rows[0][3],1234567.89*api.DOLLAR_2025_FACTORS[2025]);
  await api.exportForAstro([chart]);
  const files=await unzipStored(downloaded.blob);
  const csvFile=Object.keys(files).find(name=>name.endsWith('appropriations.csv'));
  assert.equal(files[csvFile],api.chartCsv(table).replace(/^\uFEFF/,''));
  const manifest=JSON.parse(files[Object.keys(files).find(name=>name.endsWith('manifest.json'))]);
  assert.equal(manifest.graphics[0].csv,'appropriations.csv');
});

test('all-data workbook has typed worksheets for all available charts and retains missing values', async () => {
  const {api,document}=generator();api.seedMissing();
  const state=api.editorStates.get('appropriations');
  edit(input(state,'amount',2),'1234567.89');
  let downloaded;
  api.setDownload((name,blob)=>downloaded={name,blob});
  document.getElementById('downloadAllData').fire('click');
  assert.match(downloaded.name,/-all-data\.xlsx$/);
  assert.equal(downloaded.blob.type,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const files=await unzipStored(downloaded.blob);
  const workbook=load(files['xl/workbook.xml'],{xmlMode:true});
  const names=workbook('sheet').toArray().map(node=>workbook(node).attr('name'));
  assert.equal(names.length,api.availableExports().length);
  assert.ok(!names.includes('About'));
  assert.equal(new Set(names).size,names.length);
  assert.ok(names.every(name=>name.length<=31));
  for(const [index,name] of names.entries()){
    const sheet=load(files[`xl/worksheets/sheet${index+1}.xml`],{xmlMode:true});
    assert.ok(sheet('row').length>0,name);
    assert.equal(sheet('f').length,0,'spreadsheet values never execute formulas');
  }
  const app=load(files[`xl/worksheets/sheet${names.indexOf('appropriations')+1}.xml`],{xmlMode:true});
  assert.equal(app('c[r="A2"] v').text(),'2024');
  assert.equal(app('c[r="B2"]').length,0,'missing appropriation stays blank');
  assert.equal(app('c[r="B4"] v').text(),'1234567.89');
  assert.equal(app('c[r="B4"]').attr('t'),undefined,'numbers stay numeric');
  assert.equal(app('c[r="E1"]').length,0,'only four appropriation columns');
  api.clearRenderedData();api.refreshExportControls();
  assert.equal(document.getElementById('downloadAllData').disabled,true);
  assert.ok(api.EXPORT_CHARTS.every(chart=>document.getElementById('download-data-'+chart.id).hidden));
});

test('CSV safely quotes text and exports percentages, zero values, all titles and adjusted gaps', () => {
  const {api,document}=generator();api.seedAll();
  assert.equal(api.csvCell('=1+1'),'"\'=1+1"');
  assert.equal(api.csvCell('-text'),'"\'-text"');
  assert.equal(api.csvCell(-2.5),'"-2.5"');
  assert.equal(api.csvCell(null),'');
  const data=api.getPersistent();
  data.persistentTitleData=Array.from({length:15},(_,index)=>({title:`Title ${index}`,persistentVacancies:index+1,identityCount:1}));
  assert.equal(api.chartDataTable(api.EXPORT_CHARTS.find(chart=>chart.id==='persistent-vacancies')).rows.length,15);
  const vacancies=api.chartDataTable(api.EXPORT_CHARTS.find(chart=>chart.id==='vacancies'));
  assert.equal(vacancies.rows[0][vacancies.headers.indexOf('Vacancy rate (%)')],20);
  api.getData().unshift({year:1900,available:true,amount:100});
  document.getElementById('appropriationAdjusted').fire('click');
  const table=api.chartDataTable(api.EXPORT_CHARTS.find(chart=>chart.id==='appropriations'));
  const first=table.rows[0];
  assert.equal(first[table.headers.indexOf('Appropriation ($)')],100);
  assert.equal(first[table.headers.indexOf('Inflation factor (2024 dollars)')],null);
  assert.equal(first[table.headers.indexOf('Inflation-adjusted appropriation (2024 dollars)')],null);
});


test('downloads contain chart values only, with both appropriation views independent of the toggle', () => {
  const {api,document}=generator();api.seedAll();
  for(const chart of api.availableExports()){
    const table=api.chartDataTable(chart);
    assert.ok(table.headers.every(header=>!['Source','Graphic','Snapshot year','Department','Department code','Edited','Available','Manual entry','Note','Reporting period','Vacancy identities','Account code'].includes(header)),chart.id);
  }
  const chart=api.EXPORT_CHARTS.find(item=>item.id==='appropriations');
  const nominal=api.chartCsv(api.chartDataTable(chart));
  document.getElementById('appropriationAdjusted').fire('click');
  assert.equal(api.chartCsv(api.chartDataTable(chart)),nominal);
  const titles=api.chartDataTable(api.EXPORT_CHARTS.find(item=>item.id==='persistent-vacancies'));
  assert.deepEqual(Array.from(titles.headers),['Title','Persistent vacancies']);
});


test('persistent vacancy graphics show every title on desktop, narrow layouts and frozen public exports', async () => {
  const {api,document}=generator();
  api.setPreviewCycle('2027-prep');
  api.selectDepartment('57','Chicago Police Department');
  for(const width of [760,320]){
    document.getElementById('persistentVacanciesChart').getBoundingClientRect=()=>({width});
    await api.buildPersistentVacancies();
    const rows=api.getPersistent().persistentTitleData;
    assert.equal(rows.length,62);
    const svg=document.getElementById('persistentVacanciesSvg');
    const hits=svg.querySelectorAll('[data-budget-tooltip]');
    assert.equal(hits.length,rows.length);
    assert.ok(hits.at(-1).getAttribute('data-budget-tooltip-title').includes(rows.at(-1).title));
    const height=Number(svg.getAttribute('viewBox').split(' ')[3]);
    assert.ok(Number(hits.at(-1).getAttribute('y'))+Number(hits.at(-1).getAttribute('height'))<height);
    assert.doesNotMatch(svg.textContent,/more titles? in data details/);
    const chart=api.EXPORT_CHARTS.find(item=>item.id==='persistent-vacancies');
    const frozen=api.frozenGraphic(chart,{department:'Chicago Police Department',cycle:'2027-prep'});
    const $=load(frozen.html);
    assert.equal($('[data-budget-tooltip]').length,rows.length);
    assert.equal(api.chartDataTable(chart).rows.length,rows.length);
  }
});

test('exported appropriation views switch offline, keep unique IDs, and restore the generator selection', async () => {
  const {api,document}=generator();api.seed();
  api.getData().unshift({year:2024,available:true,amount:500000});
  const chart=api.EXPORT_CHARTS.find(chart=>chart.id==='appropriations');
  const before=JSON.stringify(api.getData());
  const graphic=api.frozenGraphic(chart,{department:'Treasurer',cycle:'2026-recommendation'});
  assert.equal(document.getElementById('budgetSvg').getAttribute('data-price-basis'),'nominal');
  assert.equal(JSON.stringify(api.getData()),before);
  assert.match(graphic.views.adjusted.svg,/500,000 in 2024 dollars/);
  assert.match(graphic.views.adjusted.svg,/No inflation factor/);
  assert.equal(graphic.metadata.views.adjusted.dollarBaseYear,2024);
  assert.match(graphic.metadata.views.nominal.svg,/nominal\.svg$/);
  const parsed=load(graphic.html);
  const ids=parsed('[id]').map((_,node)=>parsed(node).attr('id')).get();
  assert.equal(new Set(ids).size,ids.length);
  parsed('[aria-labelledby]').each((_,node)=>{
    for(const id of parsed(node).attr('aria-labelledby').split(/\s+/))assert.ok(ids.includes(id));
  });
  let zip;
  api.setDownload((name,bytes)=>zip=new Blob([bytes]));
  api.exportForAstro([chart]);
  const files=await unzipStored(zip);
  assert.ok(Object.keys(files).some(name=>name.endsWith('/appropriations-nominal.svg')));
  assert.ok(Object.keys(files).some(name=>name.endsWith('/appropriations-adjusted.svg')));
  const manifest=JSON.parse(Object.entries(files).find(([name])=>name.endsWith('/manifest.json'))[1]);
  assert.equal(manifest.graphics[0].views.adjusted.svg,'appropriations-adjusted.svg');
  // Run the actual shipped runtime against two embedded charts.
  document.body.innerHTML=graphic.html+api.frozenGraphic(chart,{department:'Other',cycle:'2026-recommendation'}).html;
  api.budgetTooltipRuntime();
  const buttons=document.querySelectorAll('[data-budget-price-toggle]');
  const panels=document.querySelectorAll('[data-budget-price-view]');
  assert.equal(panels[0].hidden,false);
  assert.equal(panels[1].hidden,true);
  buttons[0].fire('click');
  assert.equal(buttons[0].getAttribute('aria-checked'),'true');
  assert.equal(panels[0].hidden,true);
  assert.equal(panels[1].hidden,false);
  assert.equal(buttons[1].getAttribute('aria-checked'),'false');
  assert.equal(panels[2].hidden,false);
  buttons[0].fire('click');
  assert.equal(panels[0].hidden,false);
  assert.equal(panels[1].hidden,true);
  assert.doesNotMatch(api.budgetTooltipRuntime.toString(),/fetch\(/);
});


test('2027 sources resolve to recommendations while 2026 comparisons retain ordinance sources', async () => {
  const {api}=generator({preserveDefaultCycle:true});
  assert.equal(api.cycleYears().at(-1),2027);
  assert.equal((await api.resolveDataset(2027)).id,'pptx-hhw3');
  assert.equal((await api.resolvePositionDataset(2027)).id,'t952-rj49');
  assert.equal((await api.resolveDataset(2026)).id,'6694-f78c');
  assert.equal((await api.resolvePositionDataset(2026)).id,'v2t2-vajc');
  assert.equal(api.stage(2027),'Recommendation');
  assert.equal(api.stage(2026),'Ordinance');
  api.setAppropriationRows({
    2026:[{department_number:'60',department_description:'COPA',appropriation_account:'0005',appropriation_account_description:'Salaries',_ordinance_amount_:'100'}],
    2027:[{department_number:'60',department_description:'COPA',appropriation_account:'0005',appropriation_account_description:'SALARIES',appropriation:'100',revised_appropriation:'110',recommendation:'125'}]
  });
  const department={code:'60',name:'COPA'};
  assert.equal((await api.loadYear(2027,department)).amount,125);
  const comparison=await api.loadAppropriationChanges(department);
  assert.equal(comparison.rows[0].previous,100);
  assert.equal(comparison.rows[0].current,125);
  assert.equal(comparison.rows[0].net,25);
  api.setPreviewCycle('2026-recommendation');
  assert.equal(api.cycleYears().at(-1),2026);
  assert.equal((await api.resolveDataset(2026)).id,'axxr-vais');
  assert.equal((await api.resolvePositionDataset(2026)).id,'wd4x-2xf8');
});


test('2027 workforce counts annual positions and converts monthly and hourly units for comparisons', async () => {
  const {api}=generator({preserveDefaultCycle:true});
  const row={department_code:'60',department_description:'COPA',title_code:'1234',title_description:'Investigator',budgeted_unit:'Annual',total_budgeted_unit:'10',position_control:'1'};
  api.setAppropriationRows({2026:[row],2027:[{...row,total_budgeted_unit:'12'},{...row,title_code:'5678',budgeted_unit:'Monthly',position_control:'0',total_budgeted_unit:'12'},{...row,title_code:'5679',budgeted_unit:'Hourly',position_control:'0',total_budgeted_unit:'2080'}]});
  const department={code:'60',name:'COPA'};
  const workforce=await api.loadWorkforceYear(2027,department);
  assert.equal(workforce.positions,14);
  assert.equal(workforce.components.annualPositions,12);
  assert.equal(workforce.components.monthlyFtes,1);
  assert.equal(workforce.components.hourlyFtes,1);
  const changes=await api.loadPositionChanges(department);
  assert.equal(changes.rows.find(row=>row.title==='Investigator'&&row.previous===10).net,2);
});
