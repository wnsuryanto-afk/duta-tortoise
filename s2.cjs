const fs=require("fs"),path=require("path"),acorn=require("acorn");
const esbuild=require("esbuild");
const files=[];(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);
if(fs.statSync(p).isDirectory())w(p);else if(/\.jsx?$/.test(f))files.push(p);}})("src");
let out=[];
for(const f of files){
  let code=fs.readFileSync(f,"utf8");
  try{code=esbuild.transformSync(code,{loader:"jsx"}).code;}catch(e){continue;}
  let ast;try{ast=acorn.parse(code,{ecmaVersion:2022,sourceType:"module",locations:true});}catch(e){continue;}
  function blockDecls(body){
    const m=new Map();
    for(const n of body){
      if(n.type==="VariableDeclaration"&&(n.kind==="const"||n.kind==="let"))
        for(const d of n.declarations){
          const names=[];
          (function ids(x){if(!x)return;
            if(x.type==="Identifier")names.push(x.name);
            else if(x.type==="ObjectPattern")x.properties.forEach(p=>ids(p.value||p.argument));
            else if(x.type==="ArrayPattern")x.elements.forEach(ids);
            else if(x.type==="AssignmentPattern")ids(x.left);
            else if(x.type==="RestElement")ids(x.argument);})(d.id);
          for(const nm of names) if(!m.has(nm)) m.set(nm,{start:n.start,line:n.loc.start.line});
        }
    }
    return m;
  }
  function walk(node,chain){
    if(!node||typeof node!=="object")return;
    if(Array.isArray(node)){node.forEach(x=>walk(x,chain));return;}
    let c=chain;
    if(node.type==="BlockStatement"||node.type==="Program"){c=chain.concat([blockDecls(node.body)]);}
    if(node.type==="Identifier"&&node.start!==undefined){
      for(let i=c.length-1;i>=0;i--){
        if(c[i].has(node.name)){
          const d=c[i].get(node.name);
          if(node.start<d.start) out.push(`${f}:${node.loc.start.line} '${node.name}' dipakai sebelum const di baris ${d.line}`);
          break;
        }
      }
    }
    for(const k in node){if(k==="loc")continue;walk(node[k],c);}
  }
  walk(ast,[]);
}
const uniq=[...new Set(out)];
console.log("TOTAL:",uniq.length);
uniq.forEach(x=>console.log("  "+x));
