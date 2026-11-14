import type { PlanetKind } from "@/config/types";

/**
 * The shaders of the Gate Realm. Every world is a sphere and one
 * fragment shader with a branch per kind: its surface comes from 3D
 * noise on the sphere, its light from the star at the origin.
 */

export const KIND_INDEX: Record<PlanetKind, number> = { ocean: 0, cracked: 1, gas: 2, ice: 3, lava: 4, crystal: 5, barren: 6 };

// Simplex noise by Ian McEwan / Ashima Arts (MIT)
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float a=0.5;float f=0.0;for(int i=0;i<5;i++){f+=a*snoise(p);p*=2.02;a*=0.5;}return f;}
float ridge(vec3 p,float sharp){return pow(1.0-abs(snoise(p)),sharp);}
`;

export const planetVertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vCenterW;
void main(){
  vObj=position;
  vec4 w=modelMatrix*vec4(position,1.0);
  vPosW=w.xyz;
  vCenterW=(modelMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
  vNormalW=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*w;
}
`;

export const planetFragment = /* glsl */ `
uniform int uKind;
uniform vec3 uLow;
uniform vec3 uHigh;
uniform vec3 uGlow;
uniform float uTime;
uniform float uDim;
uniform float uSeed;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
${NOISE}
void main(){
  vec3 p=normalize(vObj);
  vec3 q=p+uSeed;
  vec3 n=normalize(vNormalW);
  vec3 L=normalize(-vPosW);
  vec3 V=normalize(cameraPosition-vPosW);
  vec3 col=vec3(0.0);
  vec3 emit=vec3(0.0);
  float gloss=0.0;

  if(uKind==0){
    // an ocean world: seas, land, ice caps, moving cloud and an aurora at each pole
    float h=fbm(q*2.1);
    float land=smoothstep(0.03,0.1,h);
    vec3 sea=mix(uLow*0.3,uLow,smoothstep(-0.6,0.03,h));
    vec3 ground=mix(uHigh,vec3(0.86,0.78,0.6),smoothstep(0.22,0.55,h));
    col=mix(sea,ground,land);
    float cap=smoothstep(0.74,0.86,abs(p.y)+fbm(q*4.0)*0.08);
    col=mix(col,vec3(0.93,0.97,1.0),cap);
    float cloud=smoothstep(0.08,0.5,fbm(q*3.0+vec3(uTime*0.012,0.0,7.0)));
    col=mix(col,vec3(1.0),cloud*0.7);
    gloss=(1.0-land)*(1.0-cloud)*0.9;
    float lat=abs(p.y);
    float band=smoothstep(0.6,0.7,lat)*smoothstep(0.86,0.74,lat);
    float curtain=0.5+0.5*sin(atan(p.z,p.x)*13.0+uTime*1.4+snoise(q*5.0)*3.0);
    emit=uGlow*band*curtain*0.55;
  }else if(uKind==1){
    // a dead black crust, split open: the light comes from underneath
    float crack=clamp(ridge(q*2.1,18.0)+ridge(q*5.5+3.0,26.0)*0.5,0.0,1.0);
    col=mix(uLow,uHigh,fbm(q*5.0)*0.5+0.5)*0.55;
    float beat=0.62+0.38*sin(uTime*1.1+p.y*4.0+snoise(q*2.0)*2.0);
    emit=uGlow*crack*1.9*beat+vec3(1.0,0.7,0.35)*pow(crack,4.0)*0.9;
  }else if(uKind==2){
    // a gas giant: turbulent bands and one storm
    float y=p.y+0.05*snoise(vec3(p.x*2.0,p.y*7.0,p.z*2.0+uTime*0.015)+uSeed);
    float b=sin(y*19.0+fbm(q*3.0)*2.2)*0.5+0.5;
    col=mix(uLow,uHigh,b);
    vec3 eye=p-normalize(vec3(0.62,-0.3,0.72));
    eye.y*=1.9;
    float storm=smoothstep(0.3,0.1,length(eye));
    col=mix(col,uGlow,storm*0.85);
  }else if(uKind==3){
    // an ice world: pale plains, blue fractures, a hard shine
    float h=fbm(q*2.6);
    col=mix(uLow,uHigh,smoothstep(-0.35,0.35,h));
    float vein=ridge(q*4.5,16.0);
    col=mix(col,uLow*0.35,vein*0.7);
    gloss=1.2;
  }else if(uKind==4){
    // a lava world: a thin dark crust floating on fire
    float h=fbm(q*2.4+vec3(0.0,uTime*0.01,0.0));
    float crust=smoothstep(-0.3,-0.08,h);
    col=mix(uLow,uHigh,fbm(q*7.0)*0.5+0.5)*crust*0.7;
    float river=ridge(q*5.0,16.0)*crust;
    emit=uGlow*((1.0-crust)*(1.1+0.3*sin(uTime*0.8+h*12.0))+river*0.9);
    emit+=vec3(1.0,0.8,0.35)*pow(1.0-crust,4.0)*0.5;
  }else if(uKind==5){
    // a crystal world: flat facets, each its own tint
    n=normalize(cross(dFdx(vPosW),dFdy(vPosW)));
    vec3 cell=floor(normalize(cross(dFdx(vObj),dFdy(vObj)))*4.0+0.5);
    float tint=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
    col=mix(uLow,uHigh,tint);
    gloss=1.6;
    emit=uGlow*pow(1.0-max(dot(n,V),0.0),2.5)*0.9;
  }else{
    // a barren world: dust and craters
    float h=fbm(q*3.6);
    col=mix(uLow,uHigh,h*0.5+0.5);
    float c=snoise(q*6.5);
    float crater=smoothstep(0.5,0.72,c);
    float rim=smoothstep(0.38,0.5,c)*(1.0-crater);
    col=col*(1.0-crater*0.5)+rim*0.08;
  }

  float diff=max(dot(n,L),0.0);
  float wrap=smoothstep(-0.12,0.35,dot(n,L));
  vec3 lit=col*(0.03+diff*1.35);
  lit+=vec3(1.0,0.95,0.85)*gloss*pow(max(dot(reflect(-L,n),V),0.0),48.0)*0.7*wrap;
  float fres=pow(1.0-max(dot(n,V),0.0),3.0);
  lit+=uGlow*fres*(0.08+0.5*wrap);
  // a living world keeps its night lights; the others go dark
  lit+=emit*(uKind==0?(1.0-wrap*0.75):1.0);
  if(uDim<1.0){
    float g=dot(lit,vec3(0.3,0.59,0.11));
    lit=mix(vec3(g),lit,0.55)*uDim;
  }
  gl_FragColor=vec4(lit,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** the thin shell of air around a world: drawn from the inside of a larger sphere */
export const airFragment = /* glsl */ `
uniform vec3 uGlow;
uniform float uDim;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vCenterW;
void main(){
  vec3 n=normalize(vNormalW);
  vec3 V=normalize(cameraPosition-vPosW);
  vec3 L=normalize(-vCenterW);
  float inside=clamp(-dot(n,V),0.0,1.0);
  float day=smoothstep(-0.5,0.6,dot(normalize(vPosW-vCenterW),L));
  float a=pow(inside,2.2)*1.5*(0.15+0.85*day)*uDim;
  gl_FragColor=vec4(uGlow*a,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const ringVertex = /* glsl */ `
varying vec2 vFlat;
varying vec3 vPosW;
varying vec3 vCenterW;
void main(){
  vFlat=position.xy;
  vec4 w=modelMatrix*vec4(position,1.0);
  vPosW=w.xyz;
  vCenterW=(modelMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
  gl_Position=projectionMatrix*viewMatrix*w;
}
`;

export const ringFragment = /* glsl */ `
uniform vec3 uGlow;
uniform float uInner;
uniform float uOuter;
uniform float uBroken;
uniform float uDim;
varying vec2 vFlat;
varying vec3 vPosW;
varying vec3 vCenterW;
${NOISE}
void main(){
  float r=(length(vFlat)-uInner)/(uOuter-uInner);
  float lanes=0.55+0.45*sin(r*46.0+snoise(vec3(r*9.0,0.0,1.0))*3.0);
  float gapLane=smoothstep(0.02,0.06,abs(r-0.58));
  float a=lanes*gapLane*smoothstep(0.0,0.06,r)*smoothstep(1.0,0.9,r);
  if(uBroken>0.5){
    float t=atan(vFlat.y,vFlat.x);
    float torn=snoise(vec3(cos(t)*1.7,sin(t)*1.7,r*1.5))*0.5+0.5;
    a*=smoothstep(0.42,0.56,torn);
    a*=0.6+0.4*snoise(vec3(vFlat*9.0,2.0));
  }
  // the planet's own shadow falls across its ring
  vec3 L=normalize(-vCenterW);
  vec3 rel=vPosW-vCenterW;
  float along=dot(rel,-L);
  float off=length(rel+L*along);
  float shadow=along>0.0?smoothstep(uInner*0.78,uInner*0.98,off):1.0;
  a*=0.72*uDim;
  gl_FragColor=vec4(mix(uGlow,vec3(1.0),0.35)*(0.12+0.88*shadow),a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const starFragment = /* glsl */ `
uniform float uTime;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
${NOISE}
void main(){
  vec3 p=normalize(vObj);
  float g=fbm(p*5.0+vec3(0.0,uTime*0.05,0.0))*0.5+0.5;
  float cells=ridge(p*9.0+uTime*0.03,3.0);
  vec3 V=normalize(cameraPosition-vPosW);
  float limb=pow(max(dot(normalize(vNormalW),V),0.0),0.45);
  vec3 col=mix(vec3(1.0,0.48,0.14),vec3(1.0,0.93,0.74),g*0.7+cells*0.3)*(1.5+g*1.6)*limb;
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
