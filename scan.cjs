const fs=require("fs"),acorn=require("acorn");
const f=fs.readdirSync("dist/assets").find(x=>x.startsWith("index-")&&x.endsWith(".js"));
const code=fs.readFileSync("dist/assets/"+f,"utf8");
console.log("BUNDLE:",f,"ukuran:",code.length);
const ast=acorn.parse(code,{ecmaVersion:2022,sourceType:"module",locations:true});
const decl=new Map();
for(const n of ast.body){
  if(n.type==="VariableDeclaration"&&(n.kind==="const"||n.kind==="let"))
    for(const d of n.declarations) if(d.id.type==="Identifier") decl.set(d.id.name,{start:n.start,line:n.loc.start.line});
}
console.log("deklarasi top-level:",decl.size);
const hits=[];
function scan(n,inFn){
  if(!n||typeof n!=="object")return;
  if(Array.isArray(n)){for(const x of n)scan(x,inFn);return;}
  const isFn=n.type==="FunctionDeclaration"||n.type==="FunctionExpression"||n.type==="ArrowFunctionExpression";
  if(n.type==="Identifier"&&!inFn&&decl.has(n.name)){
    const d=decl.get(n.name);
    if(n.start<d.start) hits.push({name:n.name,useLine:n.loc.start.line,declLine:d.line});
  }
  for(const k in n){ if(k==="loc")continue; scan(n[k],inFn||isFn); }
}
for(const n of ast.body) scan(n,false);
console.log("TDZ SAAT MODUL DIMUAT:",hits.length);
const seen=new Set();
for(const h of hits){const k=h.name+h.useLine;if(seen.has(k))continue;seen.add(k);
console.log(`  '${h.name}' dipakai baris ${h.useLine}, dideklarasikan baris ${h.declLine}`);}
