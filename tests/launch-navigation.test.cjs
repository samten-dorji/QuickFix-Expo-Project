const {test}=require('node:test');const assert=require('node:assert/strict');const load=require('./helpers/load-source.cjs');
const elements=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(elements)];
function hooks(){
 let current;const same=(a,b)=>a&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={useState:initial=>{const frame=current,index=frame.cursor++;if(!(index in frame.values))frame.values[index]=typeof initial==='function'?initial():initial;return[frame.values[index],value=>{frame.values[index]=typeof value==='function'?value(frame.values[index]):value;}];},useRef:initial=>{const frame=current,index=frame.cursor++;return frame.values[index]??={current:initial};},useCallback:(fn,deps)=>{const frame=current,index=frame.cursor++;if(!same(frame.deps[index],deps)){frame.values[index]=fn;frame.deps[index]=deps;}return frame.values[index];},useEffect:(fn,deps)=>{const frame=current,index=frame.cursor++;if(!same(frame.deps[index],deps)){frame.deps[index]=deps;frame.pending.push(()=>{frame.cleanup[index]?.();frame.cleanup[index]=fn();});}}};
 const mount=(component,props={})=>{const frame={values:[],deps:[],cleanup:[],pending:[],cursor:0};return{render(next=props){props=next;current=frame;frame.cursor=0;const tree=component(props);const pending=frame.pending;frame.pending=[];pending.forEach(fn=>fn());return tree;},dispose(){frame.cleanup.forEach(fn=>fn?.());}};};
 return{react,mount};
}
const native={View:'View',Text:'Text',Image:'Image',StyleSheet:{create:value=>value}};
function rootHarness(){
 const h=hooks();const status={loaded:false,error:null,loading:true};const calls={prevent:0,hide:0,timers:[],frames:[]};
 const original={setTimeout:global.setTimeout,clearTimeout:global.clearTimeout,raf:global.requestAnimationFrame,caf:global.cancelAnimationFrame};
 global.setTimeout=(fn,delay)=>{const timer={fn,delay,canceled:false};calls.timers.push(timer);return timer;};global.clearTimeout=timer=>{timer.canceled=true;};global.requestAnimationFrame=fn=>{calls.frames.push(fn);return fn;};global.cancelAnimationFrame=fn=>{calls.frames=calls.frames.filter(value=>value!==fn);};
 const module=load('src/app/_layout.tsx',{react:h.react,'react-native':native,'expo-router':{Stack:'Stack'},'expo-font':{useFonts:()=>[status.loaded,status.error]},'expo-status-bar':{StatusBar:'StatusBar'},'expo-splash-screen':{preventAutoHideAsync:()=>{calls.prevent++;return Promise.resolve(true);},hide:()=>calls.hide++},'@expo-google-fonts/inter/400Regular':{Inter_400Regular:1},'@expo-google-fonts/inter/600SemiBold':{Inter_600SemiBold:2},'@expo-google-fonts/inter/700Bold':{Inter_700Bold:3},'@/contexts/AuthContext':{AuthProvider:'AuthProvider',useAuth:()=>({loading:status.loading})},'@/hooks/useRequests':{RequestsProvider:'RequestsProvider'},'@/components/LaunchScreen':{LaunchOverlay:'LaunchOverlay'}});
 const root=h.mount(module.default);return{...h,root,status,calls,restore(){root.dispose();Object.assign(global,{setTimeout:original.setTimeout,clearTimeout:original.clearTimeout,requestAnimationFrame:original.raf,cancelAnimationFrame:original.caf});}};
}
test('launch waits for fonts and initial auth, keeps Stack mounted under branding, and never resets after startup',()=>{
 const h=rootHarness();try{
  let tree=elements(h.root.render());assert.equal(h.calls.prevent,1);assert.equal(tree.some(node=>node.type==='AuthProvider'),false);assert.equal(tree.find(node=>node.type==='LaunchOverlay').props.ready,false);
  assert.equal(h.calls.timers[0].delay,12000);tree.find(node=>node.type==='LaunchOverlay').props.onReady();assert.equal(h.calls.hide,1);
  h.status.loaded=true;tree=elements(h.root.render());assert.ok(tree.some(node=>node.type==='Stack'));assert.equal(tree.find(node=>node.type==='LaunchOverlay').props.ready,false);
  const initial=tree.find(node=>typeof node.type==='function'&&node.type.name==='InitialAuthReady');const authObserver=h.mount(initial.type,initial.props);authObserver.render();
  assert.equal(elements(h.root.render()).find(node=>node.type==='LaunchOverlay').props.ready,false);
  h.status.loading=false;authObserver.render();tree=elements(h.root.render());assert.equal(tree.find(node=>node.type==='LaunchOverlay').props.ready,true);assert.equal(h.calls.timers[0].canceled,true);
  h.status.loading=true;authObserver.render();tree=elements(h.root.render());assert.equal(tree.find(node=>node.type==='LaunchOverlay').props.ready,true);authObserver.dispose();
 }finally{h.restore();}
});
test('font errors and maximum startup wait release branding without granting access or bypassing auth',()=>{
 for(const failure of ['font-error','timeout']){const h=rootHarness();try{
  if(failure==='font-error')h.status.error=Error('Font failure');let tree=elements(h.root.render());
  if(failure==='timeout'){h.calls.timers[0].fn();tree=elements(h.root.render());assert.ok(h.calls.hide>0);}
  assert.equal(tree.find(node=>node.type==='LaunchOverlay').props.ready,true);assert.equal(tree.some(node=>node.type==='AuthProvider'),false);assert.ok(tree.some(node=>node.props?.children==='Could not load the bundled Inter fonts. Restart the app.'));
 }finally{h.restore();}}
});
function overlayHarness(preference){
 const h=hooks(),calls={animations:[],frames:[],removed:0};let finish;const raf=global.requestAnimationFrame,caf=global.cancelAnimationFrame;
 global.requestAnimationFrame=fn=>{calls.frames.push(fn);return fn;};global.cancelAnimationFrame=fn=>{calls.frames=calls.frames.filter(value=>value!==fn);};
 const module=load('src/components/LaunchScreen.tsx',{react:h.react,'react-native':{...native,AccessibilityInfo:{isReduceMotionEnabled:async()=>preference,addEventListener:()=>({remove:()=>calls.removed++})},Animated:{View:'Animated.View',Value:class{},timing:(_,options)=>{calls.animations.push(options);return{start:fn=>{finish=fn;},stop:()=>{}};}}},'../../assets/images/quickfix-splash.png':1});
 const view=h.mount(module.LaunchOverlay,{ready:false,fontsReady:false});return{...h,module,calls,view,finish:()=>finish({finished:true}),restore(){view.dispose();global.requestAnimationFrame=raf;global.cancelAnimationFrame=caf;}};
}
test('launch view reports native handoff only after layout and image completion, including image failure completion',()=>{
 const h=overlayHarness(true);try{let ready=0;const view=h.mount(h.module.LaunchScreen,{fontsReady:false,onReady:()=>ready++});const tree=elements(view.render());tree[0].props.onLayout();assert.equal(ready,0);assert.equal(tree.find(node=>node.type==='Image').props.fadeDuration,0);tree.find(node=>node.type==='Image').props.onLoadEnd();assert.equal(ready,1);tree[0].props.onLayout();assert.equal(ready,1);assert.ok(tree.some(node=>node.props?.children==='QuickFix'));assert.ok(tree.some(node=>node.props?.children==='Hostel maintenance, simplified.'));view.dispose();}finally{h.restore();}
});
test('reduced-motion startup skips animation and removes its accessibility subscription',async()=>{
 const h=overlayHarness(true);try{h.view.render();await new Promise(setImmediate);h.view.render({ready:true,fontsReady:true});assert.equal(h.calls.animations.length,0);h.calls.frames.forEach(fn=>fn());assert.equal(h.view.render(),null);assert.equal(h.calls.removed,1);}finally{h.restore();}
});
test('normal startup fades briefly then removes the launch layer permanently',async()=>{
 const h=overlayHarness(false);try{h.view.render();await new Promise(setImmediate);h.view.render({ready:true,fontsReady:true});assert.deepEqual(h.calls.animations,[{toValue:0,duration:160,useNativeDriver:true}]);h.finish();assert.equal(h.view.render(),null);assert.equal(h.calls.removed,1);assert.equal(h.view.render({ready:false,fontsReady:true}),null);}finally{h.restore();}
});
test('student navigation preserves names and labels; only focused icon receives the shared pale pill',()=>{
 const h=hooks();let bottom=34;
 const module=load('src/app/(student)/_layout.tsx',{react:h.react,'react-native':native,'expo-router':{Tabs:Object.assign('Tabs',{Screen:'TabScreen'})},'@expo/vector-icons/Feather':'Feather','react-native-safe-area-context':{useSafeAreaInsets:()=>({bottom})},'@/components/AuthGate':{AuthGate:'AuthGate'}});
 const view=h.mount(module.default);let tree=elements(view.render());const tabs=tree.find(node=>node.type?.toString()==='Tabs');assert.equal(tabs.props.screenOptions.tabBarActiveBackgroundColor,'transparent');assert.equal(tabs.props.screenOptions.tabBarStyle.paddingBottom,34);assert.equal(tabs.props.screenOptions.tabBarStyle.height,102);
 assert.deepEqual(tree.filter(node=>node.type==='TabScreen').map(node=>[node.props.name,node.props.options.title]),[['home','Home'],['requests','Requests'],['history','History'],['profile','Profile']]);
 for(const node of tree.filter(node=>node.type==='TabScreen')){assert.equal(node.props.options.tabBarIcon({focused:true}).props.active,true);assert.equal(node.props.options.tabBarIcon({focused:false}).props.active,false);}
 bottom=0;tree=elements(view.render());assert.equal(tree.find(node=>node.type?.toString()==='Tabs').props.screenOptions.tabBarStyle.paddingBottom,8);
 const icon=load('src/components/ui/TabIcon.tsx',{'react-native':native,'@expo/vector-icons/Feather':'Feather'});const active=elements(icon.TabIcon({name:'home',active:true}));assert.equal(active[0].props.style[1].backgroundColor,'#e6efff');assert.equal(active[0].props.style[0].borderRadius,999);assert.equal(active[1].props.color,'#1e40af');assert.equal(icon.TabIcon({name:'home',active:false}).props.style[1],false);
});

test('auth initialization timeout releases only the launch presentation and keeps existing auth state unchanged',()=>{
 const h=rootHarness();try{h.status.loaded=true;let tree=elements(h.root.render());assert.equal(h.status.loading,true);h.calls.timers[0].fn();tree=elements(h.root.render());assert.equal(tree.find(node=>node.type==='LaunchOverlay').props.ready,true);assert.ok(tree.some(node=>node.type==='Stack'));assert.equal(h.status.loading,true);}finally{h.restore();}
});
test('all admin tab destinations and labels remain intact, with only the selected icon highlighted',()=>{
 const h=hooks();
 const stubs={react:h.react,'react-native':{...native,Pressable:'Pressable',ActivityIndicator:'ActivityIndicator'},'@expo/vector-icons/Feather':'Feather','expo-router':{Link:'Link'},'react-native-safe-area-context':{useSafeAreaInsets:()=>({bottom:34})},'@/contexts/AuthContext':{useAuth:()=>({user:{role:'admin',displayName:'Admin'},signOut:()=>{}})},'@/hooks/useRequests':{useRequests:()=>({requests:[],loading:false,retry:()=>{}})},'@/services/requests':{filterRequests:()=>[]},'./NotificationSettings':{NotificationSettings:'NotificationSettings'},'./HistoryEntries':{HistoryEntries:'HistoryEntries'}};
 for(const name of ['Screen','Card','Choices','Select','Button','Input','RequestCard'])stubs['./ui/'+name]={[name]:name,ui:{}};
 const module=load('src/components/Management.tsx',stubs);
 for(const section of ['dashboard','requests','history','profile']){
  const view=h.mount(module.Management,{section});const tree=elements(view.render());const links=tree.filter(node=>node.type==='Link');assert.deepEqual(links.map(node=>node.props.href),['/admin','/admin-requests','/admin-history','/admin-profile']);
  const buttons=tree.filter(node=>node.type==='Pressable');assert.equal(buttons.filter(node=>node.props.accessibilityState.selected).length,1);
  for(const button of buttons){assert.equal(button.props.style.backgroundColor,'transparent');const icon=elements(button).find(node=>node.type?.name==='TabIcon');assert.equal(icon.props.active,button.props.accessibilityState.selected);}
  assert.deepEqual(buttons.map(node=>elements(node).find(child=>child.type==='Text').props.children),['Dashboard','Requests','History','Profile']);view.dispose();
 }
});
test('native splash references the static PNG and matching background without altering unrelated app configuration',()=>{
 const fs=require('fs');const config=JSON.parse(fs.readFileSync('app.json','utf8')).expo;const splash=config.plugins.find(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-splash-screen')[1];assert.equal(splash.backgroundColor,'#f8f9fb');assert.equal(splash.resizeMode,'contain');assert.equal(splash.imageWidth,128);
 const image=fs.readFileSync(splash.image);assert.equal(image.subarray(1,4).toString(),'PNG');assert.equal(image.readUInt32BE(16),512);assert.equal(image.readUInt32BE(20),512);assert.equal(config.icon,'./assets/images/quickfix-icon.png');assert.ok(config.plugins.some(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-image-picker'));
});
