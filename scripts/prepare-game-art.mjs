// Package existing sprite crops as small native image resources. No art is regenerated.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
const root=resolve('assets/game-v3'), out=resolve(root,'native');
mkdirSync(out,{recursive:true});
const images=new Map();
function source(file){
  if(!images.has(file)){
    const b=readFileSync(resolve(root,file));
    images.set(file,{data:b.toString('base64'),width:b.readUInt32BE(16),height:b.readUInt32BE(20)});
  }
  return images.get(file);
}
function crop(name,file,box,width,height=width,mask=''){
  const im=source(file);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${box.join(' ')}">${mask}<image href="data:image/png;base64,${im.data}" width="${im.width}" height="${im.height}" ${mask?'mask="url(#edge)"':''}/></svg>`;
  const png=new Resvg(svg).render().asPng();writeFileSync(resolve(out,name+'.png'),png);
  return png.length;
}
let bytes=0;
for(let n=0;n<15;n++){
  const extra=n-6;
  const box=n<6?[19+(n%3)*512,19+Math.floor(n/3)*512,474,474]:[[28,440,850][extra%3],[28,429,820][Math.floor(extra/3)],369,369];
  bytes+=crop('avatar-'+n,n<6?'game-avatars.png':'game-avatars-extra.png',box,256);
}
const icons=[[14,52,419,360],[432,57,394,344],[833,93,407,299],[29,430,381,369],[441,431,388,365],[834,431,393,365],[20,817,412,394],[434,862,406,323],[847,817,389,403]];
icons.forEach((box,i)=>{bytes+=crop('icon-'+i,'game-icons.png',box,192);});
[[140,185,500,415],[715,130,640,480],[1465,95,615,515]].forEach((box,i)=>{bytes+=crop('coins-'+i,'game-coins.png',box,240);});
bytes+=crop('logo','game-hero.png',[0,0,1254,677.16],600,324,'<defs><mask id="edge"><path d="M0 0H1254V576.84L1053.36 576.84Q965.58 664.62 652.08 664.62Q388.74 664.62 275.88 589.38H0Z" fill="white"/></mask></defs>');
bytes+=crop('hero','game-hero.png',[0,0,1254,1254],900);
bytes+=crop('hub-banner','online-hub-banner-reference.png',[0,140,841,235],840,235,'<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset=".06" stop-color="white"/><stop offset=".93" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="edge" maskUnits="userSpaceOnUse" x="0" y="140" width="841" height="235"><rect x="0" y="140" width="841" height="235" fill="url(#fade)"/></mask></defs>');
console.log(`Packaged 30 existing artwork crops (${(bytes/1024/1024).toFixed(2)} MiB).`);
