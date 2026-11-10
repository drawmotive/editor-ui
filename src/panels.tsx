import { NativeSelect } from '@mantine/core';
import type { UiSelectedObject } from './selection-model.js';
import { callModel, setModel, themeValue } from './selection-model.js';
import { Icon, EndpointIcon, PaletteIcon, StrokeIcon } from './icons.js';
import { colorCss, PanelButton, PanelHeading, Separator, ToolButton, uniform, useUi } from './controls.js';
import { selectionSubjects } from './ui-model.js';

const strokeRoles=['Transparent','Foreground','PrimaryStroke','SecondaryStroke','AccentStroke','SuccessStroke','WarningStroke'];
const fillRoles=['Transparent','Background','PrimaryFill','SecondaryFill','AccentFill','SuccessFill','WarningFill'];
const colorRoles=['Foreground','Background',...strokeRoles.slice(2)];
const groupRoles=['PrimaryStroke','SecondaryStroke','AccentStroke','SuccessStroke','WarningStroke'];

export function Colors({fill=false,target}: {fill?:boolean;target?:UiSelectedObject}) {
  const {selection,edit}=useUi(), properties=target?.properties??selection!.properties;
  return <>{(fill?[false,true]:[false]).map(isFill=>{
    const roles=isFill?fillRoles:fill?strokeRoles:colorRoles, selected=uniform(isFill?properties.fillColor:properties.strokeColor);
    return <div key={String(isFill)}><PanelHeading>{isFill?'Fill Color':fill?'Border Color':'Color'}</PanelHeading>
      <div className="dm-panel-row">{roles.map(role=><ToolButton key={role} aria-label={role==='Transparent'?(isFill?'No Fill':'No Border'):role.replace(/(Stroke|Fill)$/,'')+' color'}
        selected={selected?.role===role&&selected.argb===null} data-testid={'panel-'+(isFill?'fill':'stroke')+'-color-'+role.toLowerCase()}
        onClick={()=>void edit(isFill?'Change fill color':'Change stroke color',item=>{const path=item.capabilities.text?['fontStyle','color']:['data','paintStyle',isFill?'fillColor':'color'];return [setModel(item,path,themeValue(item,'colors',role))];},target)}>
        {role==='Transparent'?<Icon name="transparent" style={{color:'var(--dm-color-secondary-stroke)'}}/>:<PaletteIcon fill={isFill?colorCss(role):'none'} style={{color:colorCss(role)}} />}
      </ToolButton>)}</div></div>;
  })}</>;
}

export function StrokePanel() {
  const {selection,edit}=useUi(),p=selection!.properties;
  return <><PanelHeading>Line Width</PanelHeading><div className="dm-panel-row">{['Thin','Normal','Bold'].map((width,index)=><ToolButton key={width}
    aria-label={width+' line'} selected={uniform(p.strokeWidth)===width} data-testid={'panel-stroke-width-'+index} onClick={()=>void edit('Change stroke width',item=>[setModel(item,['data','paintStyle','strokeWidth'],themeValue(item,'lineWidths',width))])}>
    <StrokeIcon width={index}/>
  </ToolButton>)}</div><PanelHeading>Line Style</PanelHeading><div className="dm-panel-row">{['Solid','Dashed','Dotted'].map((stroke,index)=><ToolButton key={stroke}
    aria-label={stroke+' line'} selected={uniform(p.strokeStyle)===stroke} data-testid={'panel-stroke-style-'+index} onClick={()=>void edit('Change stroke style',item=>[setModel(item,['data','paintStyle','strokeClass'],stroke)])}>
    <StrokeIcon pattern={stroke}/>
  </ToolButton>)}</div></>;
}

export function AlignPanel({target}: {target?:UiSelectedObject}) {
  const {selection,edit}=useUi(),items=target?[target]:selectionSubjects(selection!.items),p=target?.properties??selection!.properties;
  return <>{[false,...(items.every(item=>item.capabilities.verticalTextAlignment)?[true]:[])].map(vertical=><div className="dm-panel-row" key={String(vertical)}>{(vertical?['Top','Center','Bottom']:['Left','Center','Right']).map(alignment=><ToolButton key={alignment}
    aria-label={(vertical?'Vertical ':'Horizontal ')+alignment} selected={uniform(vertical?p.verticalAlignment:p.horizontalAlignment)===alignment}
    data-testid={'panel-text-align-'+(vertical?'vertical':'horizontal')+'-'+alignment.toLowerCase()} onClick={()=>void edit('Change text alignment',item=>[setModel(item,['fontStyle',vertical?'verticalTextAlign':'textAlign'],alignment)],target)}>
    <Icon name={'textAlign'+(vertical&&alignment==='Center'?'Middle':alignment)}/>
  </ToolButton>)}</div>)}</>;
}

export function EndpointPanel({start}: {start:boolean}) {
  const {selection,edit}=useUi(),selected=uniform(start?selection!.properties.lineStartStyle:selection!.properties.lineEndStyle);
  return <div className="dm-endpoint-grid">{['None','Simple arrow','Filled arrow','Open arrow','Circle','Diamond'].map((label,index)=><ToolButton key={label}
    aria-label={label} selected={selected===index} data-testid={'panel-line-'+(start?'start':'end')+'-style-'+index}
    onClick={()=>void edit('Change endpoint style',item=>[setModel(item,[start?'startStyle':'endStyle'],index)])}><EndpointIcon value={index} start={start} /></ToolButton>)}</div>;
}

export function RoutingPanel() {
  const {selection,edit}=useUi(),connector=selection!.items.every(item=>item.capabilities.connectorRouting);
  return <div className="dm-panel-row">{['Straight','Orthogonal','Curved'].map((routing,index)=><ToolButton key={routing} aria-label={routing}
    selected={uniform(selection!.properties.lineRouting)===routing} disabled={routing!=='Straight'&&!connector} data-testid={'panel-line-connector-style-'+index}
    onClick={()=>void edit('Change routing',item=>[callModel(item,'setRoutingMode',routing)])}>
    <Icon name={'routing'+routing}/>
  </ToolButton>)}</div>;
}

export function GroupPanel({inline=false}: {inline?:boolean}) {
  const {selection,edit}=useUi(),p=selection!.properties;
  return <div className={inline?'dm-group-controls':'dm-panel-stack'}><NativeSelect aria-label="Group theme color" label={inline?undefined:'Group theme color'} size="xs" value={uniform(p.groupColorRole)??'auto'}
    data={[{value:'auto',label:p.groupColorRole.state==='Mixed'?'Mixed':'Theme default'},...groupRoles.map(role=>({value:role,label:role.replace('Stroke','')}))]}
    onChange={event=>{const role=event.currentTarget.value;void edit('Change group theme color',item=>[callModel(item,'setThemeColorRole',role==='auto'?null:role)]);}} />
    <ToolButton icon="groupTheme" aria-label="Toggle title background" data-testid="group-title-background" selected={uniform(p.groupHeaderVisible)===true} onClick={()=>void edit('Toggle title background',item=>[callModel(item,'setHeaderVisible',uniform(p.groupHeaderVisible)!==true)])}/>
    <ResetSelect label="Restore group theme defaults" prompt="Theme defaults" testId="group-theme-reset" choices={['All','Border','Body','Line','Corners','Opacity','Header']} onChange={groupReset=>edit('Restore group style',item=>[callModel(item,'resetStyle',groupReset)])}/>
  </div>;
}

export function ResetSelect({label,prompt,testId,choices,onChange}: {label:string;prompt?:string;testId:string;choices:string[];onChange:(value:string)=>Promise<unknown>}) {
  return <NativeSelect aria-label={label} data-testid={testId} size="xs" value="prompt" data={[{value:'prompt',label:prompt??label},...choices.map(value=>({value,label:'Restore '+value.toLowerCase()}))]}
    onChange={event=>{if(event.currentTarget.value!=='prompt')void onChange(event.currentTarget.value);}} />;
}

export function TitlePanel() {
  const {selection,edit}=useUi(),title=selection!.items[0]?.boundText;
  if(!title)return null;
  return <div className="dm-title-controls"><PanelButton id="title-color" label="Title color" nested button={<ToolButton icon="strokeColor"/>}><Colors target={title}/></PanelButton>
    <Separator/><TextButtons target={title}/>
    <PanelButton id="title-align" label="Title alignment" nested button={<ToolButton icon="textAlign"/>}><AlignPanel target={title}/></PanelButton>
    <ResetSelect label="Restore title theme style" prompt="Title theme defaults" testId="group-title-theme-reset" choices={['All','Color','Size','Weight','Slant','Alignment']} onChange={titleReset=>edit('Restore title style',item=>[callModel(item,'resetTitleStyle',titleReset)])}/>
  </div>;
}
export function TextButtons({target}: {target:UiSelectedObject}) {
  const {edit}=useUi(),p=target.properties;
  return <div className="dm-panel-row"><span className="dm-button-group">{['Small','Medium','Large'].map(fontSize=><ToolButton key={fontSize} icon={'textSize'+fontSize} selected={uniform(p.textSize)===fontSize}
    onClick={()=>void edit('Set text size',item=>[setModel(item,['fontStyle','size'],themeValue(item,'fontSizes',fontSize))],target)} />)}</span>
    <ToolButton icon="bold" selected={uniform(p.bold)===true} onClick={()=>void edit('Toggle bold',item=>[setModel(item,['fontStyle','weight'],uniform(p.bold)===true?400:700)],target)}/>
    <ToolButton icon="italic" selected={uniform(p.italic)===true} onClick={()=>void edit('Toggle italic',item=>[setModel(item,['fontStyle','slant'],uniform(p.italic)===true?'Upright':'Italic')],target)}/>
  </div>;
}

export function MorePanel({copy}: {copy:()=>Promise<unknown>}) {
  const {editor,selection,run,setPanel}=useUi();
  return <div className="dm-panel-stack">{['Copy','Delete'].map(label=><ToolButton key={label} aria-label={label} data-testid={'panel-more-options-'+label.toLowerCase()} className="dm-menu-item"
    onClick={()=>void run(async()=>{if(label==='Copy')await copy();else await editor.deleteSelection(selection!.token);setPanel(null);})}><Icon name={label.toLowerCase()}/><span>{label}</span></ToolButton>)}</div>;
}
