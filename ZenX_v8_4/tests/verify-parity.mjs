import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'bookmarklet-reference.txt'), 'utf8').trim();
const port = readFileSync(resolve(root, 'content.js'), 'utf8');
// Only appearance and audio timbre may differ; verify all message/SLA logic exactly.
const coreFunctions=[
  ['function getActiveTicketDetails(', 'function isTicketOpen('],
  ['function isTicketOpen(', 'function isRelativeTimeText('],
  ['function isRelativeTimeText(', 'function getMessageRelativeTimeString('],
  ['function getMessageRelativeTimeString(', 'function getAgentMessages('],
  ['function getAgentMessages(', 'function evaluateAgentSLA('],
  ['function evaluateAgentSLA(', 'function findZendeskComposer(']
];
for(const [begin,end] of coreFunctions){
  const original=source.slice(source.indexOf(begin),source.indexOf(end));
  const translated=port.slice(port.indexOf(begin),port.indexOf(end));
  assert.equal(translated,original,'Original SLA engine mismatch in '+begin);
}
console.log('PASS: Ticket detection, relative timestamps, agent messages, SLA evaluation byte-for-byte original.');
// Execute the ORIGINAL SOURCE functions and extension source functions against
// identical fake Zendesk DOM cases, to detect regressions during future edits.
function evaluator(input) {
  const start = input.indexOf('function isRelativeTimeText(');
  const endAt = input.indexOf('function getMessageRelativeTimeString(', start);
  const slaStart = input.indexOf('function evaluateAgentSLA(');
  const slaEnd = input.indexOf('function findZendeskComposer(', slaStart);
  const regexStart = input.indexOf('const HOLD_REGEX =');
  const regexEnd = input.indexOf('function getAudioContext(', regexStart);
  let now = 500000;
  let articles = [], agents = [], ticket = '10001', open = true;
  const states = new Map();
  const sandbox = {
    Date: class extends Date { static now(){ return now; } },
    document: { querySelectorAll(){return articles;} },
    getActiveTicketDetails(){return {ticketId:ticket,ticketKey:'ticket_'+ticket,displayBadge:'#'+ticket,container:null,nativeSla:''};},
    isTicketOpen(){return open;},
    getAgentMessages(){return agents;},
    getTicketState(key){if (!states.has(key)) states.set(key, {msgId:'', rawTimeText:'', baseElapsedSec:0, anchorTime:0, manualResetTime:0,manualDurationOverride:0,hasBeeped1Min:false,macroDismissedId:''});return states.get(key);},
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(input.slice(regexStart, regexEnd) + '\n' + input.slice(start, endAt) + '\n' + input.slice(slaStart, slaEnd), sandbox);
  function art(role, time, id) {
    return {
      id, textContent:role+' message',
      getAttribute(key){if(key==='data-chat-role')return role;if(key==='data-event-id')return id;return '';},
      querySelector(selector){if(selector.includes('timestamp-relative'))return {textContent:time};return null;}
    };
  }
  function setup(mode) {
    now = 500000;
    ticket = mode==='ticket-other'?'10002':'10001';
    open = mode!=='idle';
    states.clear();
    if (mode==='first') {articles=[art('customer','30 seconds ago','c1')];agents=[];}
    else if (mode==='hold' || mode==='assistance' || mode==='general') {
      const a=art('agent','1 minute ago','a1');articles=[a];
      agents=[{element:{closest:()=>a},id:'a1',rawTime:'1 min ago',text:mode==='hold'?'Please wait 3-5 minutes':mode==='assistance'?'Do you need further assistance?':'Hello, I am looking into this.'}];
    }
    else if (mode==='customer'){
      const a=art('agent','2 min ago','a1');const c=art('customer','30 seconds ago','c2');articles=[a,c];
      agents=[{element:{closest:()=>a},id:'a1',rawTime:'2 min ago',text:'I will check.'}];
    }
    else {articles=[];agents=[];}
  }
  return {sandbox,setup,advance:(x)=>{now+=x*1000;},setTicket:x=>{ticket=x;},result:()=>{
    const r=vm.runInContext('evaluateAgentSLA()',sandbox);
    return JSON.parse(JSON.stringify(r));
  },parse:str=>vm.runInContext(`parseRelativeElapsedSeconds(${JSON.stringify(str)})`,sandbox)};
}
const b=evaluator(source), z=evaluator(port);
for(const [time, expectedSecs] of [['just now',0],['less than 1 minute',0],['20 seconds ago',20],['a minute ago',60],['2 hrs ago',7200],['3 min ago',180],['not a time',null]]){
  assert.equal(b.parse(time),expectedSecs);assert.equal(z.parse(time),expectedSecs);
}
console.log('PASS: Original relative time parsing matches the rebuilt extension.');
for(const [mode,rule,remaining] of [['first','first_reply',30],['hold','hold',240],['assistance','assistance',0],['general','general',60],['customer','customer_reply',90],['idle','idle',0]]){
  b.setup(mode);z.setup(mode);
  const rb=b.result(),rz=z.result();
  assert.deepEqual(rz,rb,'Mismatch in case '+mode);
  assert.equal(rz.rule,rule,'Rule mismatch '+mode);
  assert.equal(rz.remainingSec,remaining,'Remaining-time mismatch '+mode);
  if (mode==='first'){
    b.advance(7);z.advance(7);
    assert.deepEqual(z.result(),b.result());
    assert.equal(z.result().remainingSec,23);
  }
}
console.log('PASS: First reply, hold, assistance, general response, customer reply and idle agree.');
// A per-ticket return must use the independent bookmarklet anchor/state.
b.setup('first');z.setup('first');
const firstB=b.result(),firstZ=z.result();
b.setTicket('10002');z.setTicket('10002');
assert.deepEqual(z.result(),b.result());
b.setTicket('10001');z.setTicket('10001');
assert.deepEqual(z.result(),b.result());
console.log('PASS: Per-ticket state isolation and return navigation agree.');
console.log('All parity checks passed.');
