/* Local Zendesk-shaped fixtures. Uses the actual ZenX content/theme/effects scripts. */
(() => {
  const $=id=>document.getElementById(id);
  let serial=0,ticketNo=10500,tool='sherpa',currentScenario='first';
  const msgBox=$('mock-messages');
  function newArticle(name,type,text,when,internal=false){
    const article=document.createElement('article');article.dataset.testId='omni-log-comment-item';article.dataset.eventId='mock-'+(++serial);
    const sender=document.createElement('div');sender.dataset.testId='omni-log-item-sender';sender.textContent=name;
    const stamp=document.createElement('time');stamp.dataset.testId='timestamp-relative';stamp.textContent=when;
    const wrapper=document.createElement('div');wrapper.dataset.testId='omni-log-omni-to-ag-comment';
    const message=document.createElement('div');message.dataset.testId='omni-log-item-message';message.setAttribute('type',type);
    const content=document.createElement('div');content.dataset.testId='omni-log-message-content';content.textContent=text;
    message.appendChild(content);wrapper.appendChild(message);article.append(sender,stamp,wrapper);
    if(internal){const tag=document.createElement('span');tag.dataset.testId='omni-log-internal-note-tag';tag.textContent='Internal note';article.prepend(tag);}
    msgBox.appendChild(article);return article;
  }
  function setupScenario(scenario){
    currentScenario=scenario;ticketNo++;serial++;msgBox.replaceChildren();
    $('active-tab').setAttribute('data-entity-id',String(ticketNo));
    $('active-tab').lastElementChild.textContent='Ticket #'+ticketNo;
    $('ticket-header').textContent='Ticket #'+ticketNo;
    $('ticket-status').dataset.testId=scenario==='closed'?'status-badge-closed':'status-badge-open';
    $('ticket-status').textContent=scenario==='closed'?'Closed':'Open';
    $('ticket-status').style.background=scenario==='closed'?'#485668':'#1d734f';
    // VA visual tagging must not change its original chat-role, which the bookmarklet SLA reads.
    newArticle('Virtual Assistant','bot','Hi! Thank you for contacting support.','5 minutes ago');
    newArticle('Virtual Assistant','bot','What is your question about?','4 minutes ago');
    newArticle('Alex Customer','end-user','A shift at a healthcare facility','30 seconds ago');
    if(['general','hold','assistance','customer','closed'].includes(scenario)){
      const text=scenario==='hold'?'Please allow me 3-5 minutes to check the details.':scenario==='assistance'?'Is there anything else I can assist you with?':'I will check the details for you now.';
      newArticle('Support Agent','agent',text,scenario==='assistance'?'5 seconds ago':'1 minute ago');
    }
    if(scenario==='customer')newArticle('Alex Customer','end-user','Thank you. Could you please confirm the shift?', '30 seconds ago');
    if(scenario==='bot')newArticle('Virtual Assistant','bot','Before we connect you to an agent, describe your issue.', '30 seconds ago');
    if(scenario==='closed')newArticle('Alex Customer','end-user','Issue resolved, thank you.', 'just now');
    $('chat-area').scrollTop=0;
    sendStatus();
  }
  function sendStatus(){
    chrome.runtime.__send({type:'GET_STATUS'},result=>{
      if(!result) return;
      parent.postMessage({zenxTest:true,type:'status',data:result},'*');
    });
  }
  function command(command,payload={}){
    chrome.runtime.__send({type:command,...payload},result=>{sendStatus();return result;});
  }
  function selectedTheme(theme){
    const safe=globalThis.ZenXThemes.normalize(theme);
    chrome.storage.local.set({zenx_active_theme:safe},sendStatus);
  }
  function addMessage(role){
    const kind=role==='agent'?'agent':role==='bot'?'bot':'end-user';
    const name=role==='agent'?'Support Agent':role==='bot'?'Virtual Assistant':'Alex Customer';
    newArticle(name,kind,role==='agent'?'I am following up with an update.':role==='bot'?'I can help you with booking questions.':'I have another question.', 'just now');
    $('chat-area').scrollTop=$('chat-area').scrollHeight;sendStatus();
  }
  function switchTool(){
    tool=tool==='sherpa'?'oracle':'sherpa';$('mock-tool-frame').src='tool.html?app='+tool;
    $('sherpa-tab').classList.toggle('active',tool==='sherpa');$('oracle-tab').classList.toggle('active',tool==='oracle');
  }
  window.addEventListener('message',ev=>{
    if(ev.source!==parent||!ev.data||!ev.data.zenxTest)return;
    const a=ev.data;
    switch(a.type){
      case 'theme':selectedTheme(a.theme);break;
      case 'mode':command('SET_THEME',{darkMode:!!a.dark});break;
      case 'focus':command('SET_FOCUS_MODE',{enabled:!!a.enabled});break;
      case 'scenario':setupScenario(a.scenario);break;
      case 'add':addMessage(a.role);break;
      case 'tool':switchTool();break;
      case 'sound':command('PREVIEW_THEME_SOUND');break;
      case 'duration':command('SET_MANUAL_DURATION',{durationSec:Number(a.value)});break;
      case 'status':sendStatus();break;
      case 'reset':command('SET_FOCUS_MODE',{enabled:false});selectedTheme(globalThis.ZenXThemes.presets[0]);setupScenario('first');break;
    }
  });
  $('send-message').addEventListener('click',()=>{if(!$('send-message').disabled){addMessage('agent');$('send-message').blur();}});
  $('sherpa-tab').addEventListener('click',()=>{if(tool!=='sherpa')switchTool();});
  $('oracle-tab').addEventListener('click',()=>{if(tool!=='oracle')switchTool();});
  $('toggle-closed').addEventListener('click',()=>setupScenario(currentScenario==='closed'?'first':'closed'));
  setupScenario('first');
  setInterval(sendStatus,1000);
  parent.postMessage({zenxTest:true,type:'ready'},'*');
})();
