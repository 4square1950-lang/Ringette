export function settingsView(tabs, values, set, onClose, defaults) {
  const make = (tag, text='', className='') => {
    const node=document.createElement(tag);
    node.textContent=text; node.className=className;
    return node;
  };
  const button = (text, onclick, style) => {
    const node=make('button',text,style); node.type='button'; node.onclick=onclick;
    return node;
  };
  const view=make('section','','sport-settings'), header=make('header','','sport-settings-head');
  const close=button('×',onClose); close.setAttribute('aria-label','Close settings');
  header.append(make('h1','Settings'),close);
  const nav=make('nav','','sport-settings-tabs'); nav.setAttribute('aria-label','Settings sections');
  const grid=make('div','','sport-settings-grid'), list=make('div'), help=make('aside','','sport-settings-help');
  const heading=make('h2'), description=make('p');
  help.append(heading,description); grid.append(list,help); view.append(header,nav,grid);
  function selectTab(tab) {
    for (const item of nav.children) item.setAttribute('aria-pressed',String(item.textContent===tab.title));
    list.replaceChildren();
    const explain=(row)=>{heading.textContent=row.title;description.textContent=row.help;};
    for (const row of tab.rows) {
      const label=make('label',row.title,'sport-setting');
      const input=make(row.options?'select':'input');
      if (row.options) row.options.forEach(([value,text])=>input.append(new Option(text,value)));
      else input.type=row.range?'range':'checkbox';
      if (row.range) { input.min=0; input.max=100; }
      if (input.type==='checkbox') input.checked=Boolean(values[row.key]);
      else input.value=String(values[row.key]);
      input.oninput=()=>{
        set(row.key,input.type==='checkbox'?input.checked:row.range?input.valueAsNumber:row.numeric?Number(input.value):input.value);
        if (row.range) readout.value=input.value;
      };
      const readout=make('output');
      label.onpointerenter=()=>explain(row);
      label.onfocusin=()=>explain(row);
      label.append(input);
      if (row.range) { readout.value=input.value; label.append(readout); }
      list.append(label);
    }
    explain(tab.rows[0]);
    list.append(button('↻ Restore defaults',()=>{
      for(const [key,value] of Object.entries(defaults))set(key,value);
      selectTab(tab);
    },'sport-reset'));
  }
  tabs.forEach(tab=>nav.append(button(tab.title,()=>selectTab(tab))));
  selectTab(tabs[0]);
  return view;
}
