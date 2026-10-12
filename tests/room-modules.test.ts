import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {rollDice} from "../src/shared/dice";
import {applyModuleAction,defaultModule,moduleConfig,type ModuleState} from "../src/shared/room-modules";
import {widgetContent} from "../src/shared/widgets";
const zero=()=>0;
test("dados: operações, repetições, Fate, manter/descartar e comparações",()=>{
  assert.equal(rollDice("(2d6 + 3) * 2",zero)[0].total,10);
  assert.deepEqual(rollDice("6#4d6d1",zero).map(r=>r.total),[3,3,3,3,3,3]);
  assert.equal(rollDice("4dF",zero)[0].total,-4);
  let i=0;const seq=()=>[0,5,2,3][i++%4];
  assert.equal(rollDice("4d6kh2",seq)[0].total,10);
  i=0;assert.equal(rollDice("4d6kl2",seq)[0].total,4);
  i=0;assert.equal(rollDice("4d6dh1",seq)[0].total,8);
  assert.equal(rollDice("4d6++2",zero)[0].total,12);
  assert.equal(rollDice("4d6--2",zero)[0].total,-4);
  assert.equal(rollDice("10d6 << 3",zero)[0].total,10);
  assert.equal(rollDice("10d6 >> 4",zero)[0].total,0);
  assert.equal(rollDice("1d20 >= 10",zero)[0].total,0);
  assert.equal(rollDice("B5",()=>3)[0].total,5);
  assert.equal(rollDice("G5",()=>2)[0].total,5);
  assert.equal(rollDice("W5",()=>1)[0].total,5);
});
test("dados: explosões e ordem preservada sem sort",()=>{
  let i=0;const seq=()=>[5,2,0][i++%3];
  const r=rollDice("2d6!ns",seq)[0];assert.equal(r.total,10);assert.match(r.detail,/6, 3, 1/);
});
test("dados: comandos inválidos e trabalho excessivo são recusados",()=>{
  for(const value of ["","globalThis.fetch('x')","1d6;alert(1)","2/0","101d6","1d0","1d1000001","21#1d6","20#100d6","1d1!","1d6!1","(1+2","1d6junk","1d6kh1dl1","9".repeat(60),"(".repeat(25)+"1"+")".repeat(25)]) assert.throws(()=>rollDice(value,zero),value);
  assert.throws(()=>rollDice("1d6!",max=>max-1),/500/);
});
test("módulos: configuração estrita, identidades únicas e sem estado forjado",()=>{
  for(const kind of ["poll","dice","random","tasks"] as const){
    const module=defaultModule(kind,randomUUID);
    assert.ok(widgetContent.safeParse({kind,title:kind,blocks:[],module}).success);
    assert.equal(widgetContent.safeParse({kind,title:kind,blocks:[],module,moduleState:{}}).success,false);
  }
  const config=defaultModule("poll",randomUUID);if(config.kind!=="poll")throw Error();
  config.options[1].id=config.options[0].id;
  assert.equal(widgetContent.safeParse({kind:"poll",title:"Teste",blocks:[],module:config}).success,false);
  assert.equal(moduleConfig.safeParse({kind:"dice",expression:"1d6",eval:true}).success,false);
});
test("votação: um voto por pessoa, troca de opção e encerramento no prazo",()=>{
  const c=defaultModule("poll",randomUUID);if(c.kind!=="poll")throw Error();c.duration=1;
  const actor={id:randomUUID(),name:"Ana"};
  const run=(s:ModuleState,option:string,now=100)=>applyModuleAction(c,s,{kind:"vote",optionId:option},actor,randomUUID(),0,now,zero);
  assert.throws(()=>run({},c.options[0].id),/aberta/);
  let s=run({startedAt:0},c.options[0].id);s=run(s,c.options[1].id);
  assert.equal(Object.keys(s.votes!).length,1);assert.equal(s.votes![actor.id],c.options[1].id);
  assert.throws(()=>run(s,c.options[0].id,1000),/aberta/);
  assert.throws(()=>run(s,randomUUID()),/indisponível/);
});
test("sorteador: pesos, retirada e histórico limitado com autoria",()=>{
  const c=defaultModule("random",randomUUID);if(c.kind!=="random")throw Error();c.removeDrawn=true;c.options[1].weight=3;
  const actor={id:randomUUID(),name:"Rui"};
  const s=applyModuleAction(c,{}, {kind:"draw"},actor,"one",0,100,()=>1);
  assert.equal(s.history![0].label,c.options[1].label);assert.equal(s.history![0].authorId,actor.id);
  const second=applyModuleAction(c,s,{kind:"draw"},actor,"two",1,200,zero);
  assert.equal(second.drawn?.length,2);assert.throws(()=>applyModuleAction(c,second,{kind:"draw"},actor,"three",2,300,zero),/já saíram/);
});
test("tarefas e agenda: revisão, conclusão, pausa e próxima etapa",()=>{
  const c=defaultModule("tasks",randomUUID);if(c.kind!=="tasks")throw Error();c.items.push({...c.items[0],id:randomUUID(),label:"Depois"});
  const actor={id:randomUUID(),name:"Ana"};
  let s=applyModuleAction(c,{}, {kind:"task",itemId:c.items[0].id,done:true,revision:0},actor,"one",0,100,zero);
  assert.ok(s.done![c.items[0].id]);
  s=applyModuleAction(c,s,{kind:"session",action:"start",revision:1},actor,"two",1,1000,zero);
  s=applyModuleAction(c,s,{kind:"session",action:"pause",revision:2},actor,"three",2,4000,zero);
  assert.equal(s.elapsed,3);assert.equal(s.startedAt,null);
  assert.throws(()=>applyModuleAction(c,s,{kind:"session",action:"next",revision:2},actor,"four",3,5000,zero),/mudou/);
  s=applyModuleAction(c,s,{kind:"session",action:"next",revision:3},actor,"four",3,5000,zero);
  assert.equal(s.activeIndex,1);assert.equal(s.elapsed,0);
});
