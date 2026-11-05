const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
// Execute the same transpiled TS/TSX as Metro while sharing one CJS Firebase SDK.
module.exports=function loadSource(relative,stubs={}) {
 const root=path.resolve(__dirname,'../..');const cache=new Map();
 function load(filename){
  if(cache.has(filename))return cache.get(filename).exports;
  const compiled=new Module(filename,module);compiled.filename=filename;compiled.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(filename,compiled);
  compiled.require=name=>{
   if(Object.hasOwn(stubs,name))return stubs[name];
   if(name.startsWith('.')||name.startsWith('@/')){
    const target=name.startsWith('@/')?path.join(root,'src',name.slice(2)):path.resolve(path.dirname(filename),name);
    const source=[target,target+'.ts',target+'.tsx'].find(value=>fs.existsSync(value)&&fs.statSync(value).isFile());
    if(source&&/\.tsx?$/.test(source))return load(source);
   }
   return Module.prototype.require.call(compiled,name);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
  return compiled.exports;
 }
 return load(path.resolve(root,relative));
};
