import assert from 'node:assert/strict';
import test from 'node:test';
import { projectSelection, selectionEdit, setModel, callModel } from '../src/selection-model.js';
const caps={stroke:true,fill:true,cornerRadius:true,editText:true,text:false,line:false,connectorRouting:false,group:false,groupTitle:false,verticalTextAlignment:false};
// Deliberately nonordinal fixture tags prove that native metadata owns role identities.
const themeValues={colors:{Transparent:'-21',Foreground:'-22',PrimaryFill:'-35',SecondaryFill:'-37',GroupTitle:'-51'},fontSizes:{Small:-8,Medium:-12,Large:-16,GroupTitle:-19},lineWidths:{Thin:-5,Normal:-9,Bold:-11},corners:{Shape:-1,TextGraph:-2,Group:-3},scale:1000};
const shape=(id,color='-35')=>({id,kind:'Shape',bindingItemId:null,textId:null,capabilities:{...caps},model:{data:{paintStyle:{color:'4279383126',fillColor:color,strokeWidth:-9,strokeClass:'Solid'},cornerRadius:0}},resolved:{cornerRadius:0,themeValues},screenBounds:{left:10,top:20,right:100,bottom:80}});
const selection=items=>({revision:'document:1',token:{session:'selection',version:4},items,anchor:null});

test('toolbar projection uses native scalar role metadata without mutating generated snapshots',()=>{
 const snapshot=selection([shape('one'),shape('two','-37')]);
 const view=projectSelection(snapshot);
 assert.equal(view.properties.fillColor.state,'Mixed');
 assert.deepEqual(view.properties.strokeColor,{state:'Uniform',value:{role:null,argb:'4279383126'}});
 assert.equal(view.properties.strokeWidth.value,'Normal');
 assert.equal(view.items[0].properties.fillColor.value.role,'PrimaryFill');
 assert.equal(view.properties.cornerRadius.value,0);
 assert.equal(Object.hasOwn(snapshot,'properties'),false);assert.equal(Object.hasOwn(snapshot.items[0],'properties'),false);
});

test('literal transparent and unsigned ARGB remain distinct from the transparent theme role',()=>{
 const transparent=projectSelection(selection([shape('literal','0')]));
 assert.deepEqual(transparent.properties.fillColor.value,{role:null,argb:'0'});
 assert.deepEqual(projectSelection(selection([shape('role','-21')])).properties.fillColor.value,{role:'Transparent',argb:null});
 assert.deepEqual(projectSelection(selection([shape('max','4294967295')])).properties.fillColor.value,{role:null,argb:'4294967295'});
 assert.equal(projectSelection(selection([shape('literal','0'),shape('role','-21')])).properties.fillColor.state,'Mixed');
});

test('bound-text focus uses primitive resolved typography and retains explicit theme-default null values',()=>{
 const owner={...shape('owner'),kind:'Group',textId:'title',capabilities:{...caps,group:true,groupTitle:true},resolved:{cornerRadius:0,themeValues,groupColorRole:null,groupHeaderVisible:false}};
 const title={...shape('title'),kind:'BoundText',bindingItemId:'owner',capabilities:{...caps,stroke:false,fill:false,text:true,verticalTextAlignment:true},model:{fontStyle:{size:-19,color:'-51',fontFamily:'',weight:-1,slant:'Upright',textAlign:'Left',verticalTextAlign:'Top'}},resolved:{themeValues,fontStyle:{size:24.125,fontFamily:'Inter',weight:700,slant:'Italic',textAlign:'Center',verticalTextAlign:'Bottom'}}};
 owner.boundText=title;
 const focus=projectSelection(selection([owner,title]));
 assert.deepEqual(focus.properties.bold,{state:'Uniform',value:true});
 assert.equal(focus.properties.textSize.value,'GroupTitle');
 assert.deepEqual(focus.properties.strokeColor.value,{role:'GroupTitle',argb:null});
 assert.equal(focus.properties.resolvedTextSize.value,24.125);assert.equal(focus.properties.horizontalAlignment.value,'Center');
 const group=projectSelection(selection([owner]));
 assert.deepEqual(group.properties.groupColorRole,{state:'Uniform',value:null});
 assert.equal(group.properties.groupHeaderVisible.value,false);assert.equal(group.items[0].boundText.properties.italic.value,true);
});

test('explicit numeric values do not appear selected as a semantic role',()=>{
 const item=shape('literal');item.model.data.paintStyle.strokeWidth=1250;
 assert.equal(projectSelection(selection([item])).properties.strokeWidth.value,1250);
 const other=shape('other');other.model.data.paintStyle.strokeWidth=0;
 assert.equal(projectSelection(selection([item,other])).properties.strokeWidth.state,'Mixed');
 item.capabilities.text=true;item.model.fontStyle={size:0,color:'0'};item.resolved.fontStyle={size:0};
 const view=projectSelection(selection([item]));
 assert.equal(view.properties.textSize.value,0);assert.equal(view.properties.resolvedTextSize.value,0);
});

test('unsupported mixed properties remain unavailable instead of treating absent values as uniform',()=>{
 const line={...shape('line'),kind:'Line',capabilities:{...caps,line:true,fill:false,cornerRadius:false},model:{...shape('line').model,startStyle:4,endStyle:1,routing:'Orthogonal'}};
 const view=projectSelection(selection([shape('one'),line]));
 assert.equal(view.properties.fillColor.state,'Unavailable');assert.equal(view.properties.lineStartStyle.state,'Unavailable');
 assert.equal(projectSelection(selection([line])).properties.lineRouting.value,'Straight');
});

test('one toolbar batch uses its observed revision and token for effective selection subjects',()=>{
 const owner={...shape('owner'),textId:'label'};
 const text={...shape('label'),kind:'BoundText',bindingItemId:'owner',capabilities:{...caps,text:true,fill:false},model:{fontStyle:{weight:400}},resolved:{themeValues,fontStyle:{weight:400}}};
 const view=projectSelection(selection([owner,text]));
 const edit=selectionEdit(view,'Format label',item=>[setModel(item,['fontStyle','weight'],700)]);
 assert.deepEqual(edit,{revision:'document:1',description:'Format label',token:{session:'selection',version:4},changes:[{itemId:'label',path:['fontStyle','weight'],value:700}]});
 assert.deepEqual(selectionEdit(view,'Reset title',item=>[callModel(item,'resetTitleStyle','All')],owner).changes,[{itemId:'owner',op:'call',path:['resetTitleStyle'],arguments:['All']}]);
});
