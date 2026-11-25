import {createServer} from 'node:http';
import {createReadStream,statSync} from 'node:fs';

const files = new Map([
  ['/',['index.html','text/html']], ['/index.html',['index.html','text/html']],
  ['/style.css',['style.css','text/css']],
  ...['app','engine','rink','crowd','world-land','campus'].map(name=>['/'+name+'.js',[name+'.js','text/javascript']]),
  ...['three.module.js','three.core.js'].map(name=>['/vendor/'+name,['node_modules/three/build/'+name,'text/javascript']]),
]);
const port = Number(process.env.PORT || 4198);
createServer((request,response)=>{
  const route = new URL(request.url,'http://localhost').pathname;
  const entry = files.get(route);
  if (!entry || !['GET','HEAD'].includes(request.method)) { response.writeHead(404).end(); return; }
  const file = new URL(entry[0],import.meta.url);
  try{
    const stat=statSync(file);
    response.writeHead(200,{'Content-Type':entry[1]+'; charset=utf-8','Content-Length':stat.size,'Cache-Control':'no-cache'});
    if(request.method==='HEAD')response.end();
    else createReadStream(file).on('error',()=>response.destroy()).pipe(response);
  }catch{response.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log('Ringette: http://localhost:'+port+'/'));
