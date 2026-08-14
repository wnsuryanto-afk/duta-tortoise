const fs=require("fs"),path=require("path");
const esbuild=require("esbuild");
const acorn=require("acorn");
const walkFiles=[];
(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);
if(fs.statSync(p).isDirectory())w(p);else if(/\.jsx?$/.test(f))walkFiles.push(p);}})("src");
let hits=0;
for(const f of walkFiles){
  let code=fs.readFileSync(f,"utf8");
  try{ code=esbuild.transformSync(code,{loader:"jsx",format:"esm"}).code; }catch(e){ continue; }
  let ast; try{ ast=acorn.parse(code,{ecmaVersion:2022,sourceType:"module",locations:true}); }catch(e){ continue; }
  // kumpulkan deklarasi const/let per scope fungsi
  const scopes=[];
  function scanScope(node,body){
    const decls=new Map();
    (function collect(n){
      if(!n||typeof n!=="object")return;
      if(Array.isArray(n)){n.forEach(collect);return;}
      if(n.type==="VariableDeclaration"&&(n.kind==="const"||n.kind==="let")){
        for(const d of n.declarations){ if(d.id&&d.id.type==="Identifier") decls.set(d.id.name,n.start); }
      }
      if(n!==node&&(n.type==="FunctionDeclaration"||n.type==="FunctionExpression"||n.type==="ArrowFunctionExpression"))return;
      for(const k in n){ if(k==="loc"||k==="start"||k==="end")continue; collect(n[k]); }
    })(body);
    return decls;
  }
  function visit(n,parentDecls){
    if(!n||typeof n!=="object")return;
    if(Array.isArray(n)){n.forEach(x=>visit(x,parentDecls));return;}
    let decls=parentDecls;
    if(n.type==="Program"||n.type==="BlockStatement"){ decls=new Map([...parentDecls,...scanScope(n,n.body)]); }
    if(n.type==="Identifier"&&n.start!==undefined&&decls.has(n.name)){
      const dpos=decls.get(n.name);
      if(n.start<dpos){ hits++; console.log(`${f}:${n.loc.start.line} -> '${n.name}' dipakai sebelum dideklarasikan`); }
    }
    for(const k in n){ if(k==="loc")continue; visit(n[k],decls); }
  }
  visit(ast,new Map());
}
console.log("TOTAL:",hits);
