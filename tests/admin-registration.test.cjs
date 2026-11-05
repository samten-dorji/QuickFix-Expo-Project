const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function screenHarness(registerAdmin = async () => {}, componentPath = '../src/app/register-admin.tsx') {
 const state = []; let cursor = 0; let profile = null;
 const filename = path.resolve(__dirname, componentPath);
 const compiled = new Module(filename, module);
 compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(filename));
 compiled.require = name => {
  if (name === 'react') return {
   useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
   useRef: initial => { const index = cursor++; return state[index] ??= {current: initial}; },
  };
  if (name === 'react-native') return {Pressable:'Pressable',Text:'Text',View:'View'};
  if (name === 'expo-router') return {Redirect:'Redirect'};
  if (name === '@expo/vector-icons/Feather') return 'Feather';
  if (name === '@/contexts/AuthContext') return {useAuth:()=>({user:profile,firebaseUser:{uid:'owner'},loading:false,refreshUser:async()=>{},signOut:async()=>{}})};
  if (name === '@/hooks/useNetworkStatus') return {useNetworkStatus:()=>({isOffline:false})};
  if (name === '@/services/auth') return {registerAdmin};
  if (name === '@/services/errors') return {errorMessage:error=>error.message};
  if (name === './ui/Button') return {Button:'Button'};
  if (name.startsWith('@/components/')) {
   const component = name.split('/').at(-1);
   return {[component]:component,ui:{}};
  }
  return Module.prototype.require.call(compiled,name);
 };
 compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},
 }).outputText,filename);
 return {render:()=>{cursor=0;return compiled.exports.default ? compiled.exports.default() : compiled.exports.AuthGate({children:'protected',roles:['admin']});},setProfile:value=>{profile=value;}};
}
function nodes(element) {
 if (!element || typeof element !== 'object') return [];
 return [element,...[element.props?.children].flat(Infinity).flatMap(nodes)];
}
test('admin screen renders exactly three fields, one submit action and a password toggle',()=>{
 const harness=screenHarness();let tree=nodes(harness.render());
 assert.deepEqual(tree.filter(node=>node.type==='Input').map(node=>node.props.label),['Full Name','Email Address','Password']);
 assert.deepEqual(tree.filter(node=>node.type==='Button').map(node=>node.props.title),['Create Admin Account']);
 assert.equal(tree.find(node=>node.props?.label==='Password').props.secureTextEntry,true);
 tree.find(node=>node.props?.accessibilityLabel==='Show password').props.onPress();
 tree=nodes(harness.render());
 assert.equal(tree.find(node=>node.props?.label==='Password').props.secureTextEntry,false);
});
test('profile provisioning failure shows an error, clears loading and prevents redirect',async()=>{
 let reject;
 const harness=screenHarness(()=>new Promise((_,failure)=>{reject=failure;}));
 let tree=nodes(harness.render());
 tree.find(node=>node.type==='Button').props.onPress();
 tree=nodes(harness.render());
 assert.equal(tree.find(node=>node.type==='Button').props.disabled,true);
 reject(new Error('Profile creation failed'));await new Promise(resolve=>setImmediate(resolve));
 // Even a profile snapshot arriving after a failed request must not show success.
 harness.setProfile({role:'admin'});
 tree=nodes(harness.render());
 assert.equal(tree.some(node=>node.type==='Redirect'),false);
 assert.equal(tree.find(node=>node.props?.accessibilityRole==='alert').props.children,'Profile creation failed');
 assert.equal(tree.find(node=>node.type==='Button').props.disabled,false);
});
test('successful registration waits for the authorized profile before navigating to admin',async()=>{
 const calls=[];
 const harness=screenHarness(async(...values)=>{calls.push(values);});
 let tree=nodes(harness.render());
 for(const [label,value] of [['Full Name','Owner'],['Email Address','owner@example.test'],['Password','Password123!']]) tree.find(node=>node.props?.label===label).props.onChangeText(value);
 tree=nodes(harness.render());
 tree.find(node=>node.type==='Button').props.onPress();
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,[['owner@example.test','Password123!','Owner']]);
 assert.equal(nodes(harness.render()).some(node=>node.type==='Redirect'),false);
 harness.setProfile({role:'admin'});
 assert.equal(harness.render().props.href,'/admin');
});
test('pending admin registration navigates to the waiting screen instead of the dashboard',()=>{
 const harness=screenHarness();harness.setProfile({role:'pending_admin'});
 assert.equal(harness.render().props.href,'/pending-admin');
});
test('pending screen explains manual approval and reacts to an approved profile',()=>{
 const harness=screenHarness(undefined,'../src/app/pending-admin.tsx');
 harness.setProfile({role:'pending_admin',email:'owner@example.test'});
 const tree=nodes(harness.render());
 assert.equal(tree.some(node=>node.props?.children==='Account created. Awaiting administrator approval.'),true);
 assert.equal(tree.some(node=>node.props?.title==='Refresh Approval Status'),true);
 harness.setProfile({role:'admin'});
 assert.equal(harness.render().props.href,'/dashboard');
});
test('route gate sends pending users away from protected admin screens',()=>{
 const harness=screenHarness(undefined,'../src/components/AuthGate.tsx');
 harness.setProfile({role:'pending_admin'});
 assert.equal(harness.render().props.href,'/pending-admin');
 harness.setProfile({role:'admin'});
 assert.equal(harness.render(),'protected');
});
