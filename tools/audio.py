# Generates the soundtrack for the scripted video from out/cues.json (written by: npm run render -- cues=out/cues.json).
# Usage, from the repo root: pip install numpy scipy && python3 tools/audio.py  ->  out/mix.wav
import numpy as np, json, wave
from scipy.signal import butter, lfilter
SR=48000; D=58.0; N=int(SR*D); t=np.arange(N)/SR
rng=np.random.default_rng(7)
L=np.zeros(N); R=np.zeros(N)
note=lambda m: 440*2**((m-69)/12)
def add(sig, t0, gain=1.0, pan=0.5):
    i=int(t0*SR); 
    if i>=N: return
    e=min(N,i+len(sig)); s=sig[:e-i]*gain
    L[i:e]+=s*np.cos(pan*np.pi/2)*1.41; R[i:e]+=s*np.sin(pan*np.pi/2)*1.41
def bp(x,lo,hi): b,a=butter(2,[lo/(SR/2),hi/(SR/2)],btype='band'); return lfilter(b,a,x)
def lp(x,f): b,a=butter(2,f/(SR/2)); return lfilter(b,a,x)
# ---------------- music bed (92 BPM, D minor / F major) ----------------
BPM=92; beat=60/BPM; bar=4*beat
prog=[[50,57,60,65,69],[46,53,58,62,65],[41,53,57,60,64],[48,55,60,64,67]]  # Dm7(add) Bbmaj7 Fmaj7 C
M=np.zeros((2,N))
seg=2*bar
for k in range(int(D/seg)+2):
    ch=prog[k%4]; t0=k*seg
    if t0>=D: break
    i0=int(t0*SR); n=int((seg+1.5)*SR); tt=np.arange(n)/SR
    env=np.clip(tt/1.2,0,1)*np.clip((seg+1.5-tt)/1.5,0,1)
    for j,m in enumerate(ch):
        f=note(m); ph=2*np.pi*f*tt+0.25*np.sin(2*np.pi*0.2*tt+j)
        w=(np.sin(ph)+0.25*np.sin(2*ph))*env*0.035/(1+0.3*j)
        e=min(N,i0+n); M[0,i0:e]+=w[:e-i0]*(0.6 if j%2 else 0.4); M[1,i0:e]+=w[:e-i0]*(0.4 if j%2 else 0.6)
    # arpeggio 8ths
    arp=[ch[1]+12,ch[2]+12,ch[3]+12,ch[4]+12,ch[3]+12,ch[2]+12,ch[4]+12,ch[3]+12]
    for s in range(16):
        ts=t0+s*beat/2; m=arp[s%8]; n2=int(0.6*SR); tt2=np.arange(n2)/SR; f=note(m)
        p=(np.sin(2*np.pi*f*tt2)+0.2*np.sin(2*np.pi*2*f*tt2)*np.exp(-tt2*20))*np.exp(-tt2*6)*np.clip(tt2/0.004,0,1)*0.022*(1.0 if s%2==0 else 0.7)
        i=int(ts*SR); e=min(N,i+n2)
        if i<N: pan=0.35+0.3*((s%4)/3); M[0,i:e]+=p[:e-i]*(1-pan)*1.4; M[1,i:e]+=p[:e-i]*pan*1.4
    # soft kick + hat
    for b in range(8):
        ts=t0+b*beat; i=int(ts*SR)
        if i>=N: continue
        if b%2==0:
            n3=int(0.3*SR); tt3=np.arange(n3)/SR; fr=50+60*np.exp(-tt3*30); k3=np.sin(2*np.pi*np.cumsum(fr)/SR)*np.exp(-tt3*12)*0.09
            e=min(N,i+n3); M[:,i:e]+=k3[:e-i]
        n4=int(0.05*SR); h=bp(rng.standard_normal(n4),6000,11000)*np.exp(-np.arange(n4)/SR*80)*0.012
        i2=int((ts+beat/2)*SR); e=min(N,i2+n4)
        if i2<N: M[0,i2:e]+=h[:e-i2]*0.7; M[1,i2:e]+=h[:e-i2]
M[0]=lp(M[0],5000); M[1]=lp(M[1],5000)
# intro filter-in & outro fade
fade=np.clip(t/2.0,0,1)*np.clip((D-t)/2.5,0,1)
cues=json.load(open('out/cues.json'))
fin=[c['t'] for c in cues if c['type']=='final'][0]
duck=1-0.6*np.exp(-((t-fin-0.3)/0.9)**2)*(t>fin-0.4)
pre=1-0.5*np.clip((t-(fin-0.6))/0.3,0,1)*(t<fin)*(t>fin-0.6)
M*=fade*duck*pre
# ---------------- SFX ----------------
def env(n,a,d): tt=np.arange(n)/SR; return np.clip(tt/a,0,1)*np.exp(-tt/d)
def click(): n=int(0.05*SR); tt=np.arange(n)/SR; return (np.sin(2*np.pi*2400*tt)*0.5+np.sin(2*np.pi*900*tt))*env(n,0.0008,0.008)
def tick(): n=int(0.025*SR); tt=np.arange(n)/SR; return np.sin(2*np.pi*3200*tt)*env(n,0.0005,0.004)
def whoosh(): n=int(0.45*SR); x=bp(rng.standard_normal(n),500,3500); w=np.sin(np.pi*np.arange(n)/n)**2; return x/np.std(x)*w*0.25
def pop(f0=500,f1=1100,dur=0.12): n=int(dur*SR); tt=np.arange(n)/SR; fr=f0+(f1-f0)*tt/dur; return np.sin(2*np.pi*np.cumsum(fr)/SR)*env(n,0.002,dur/3)
def thump(): n=int(0.5*SR); tt=np.arange(n)/SR; fr=40+110*np.exp(-tt*18); s=np.sin(2*np.pi*np.cumsum(fr)/SR)*np.exp(-tt*7); return s+lp(rng.standard_normal(n),1200)*np.exp(-tt*30)*0.25
def bell(m,dur=2.5):
    n=int(dur*SR); tt=np.arange(n)/SR; f=note(m)
    return sum(a*np.sin(2*np.pi*f*r*tt)*np.exp(-tt*dd) for r,a,dd in [(1,1,1.8),(2,0.35,2.6),(3.01,0.15,3.5),(4.2,0.06,5)])*np.clip(tt/0.003,0,1)
def err(): n=int(0.32*SR); tt=np.arange(n)/SR; s=np.sign(np.sin(2*np.pi*196*tt))*0.4+np.sin(2*np.pi*196*tt); s=lp(s,1800); g=((tt<0.12)|(tt>0.16))*1.0; return s*g*np.exp(-tt*6)
def riser(dur=1.6):
    n=int(dur*SR); tt=np.arange(n)/SR; x=bp(rng.standard_normal(n),800,6000); x=x/np.std(x); s=np.sin(2*np.pi*np.cumsum(300+500*(tt/dur)**2)/SR)
    return (x*0.5+s*0.4)*(tt/dur)**2.2
pan=lambda c: float(np.clip(c.get('x',960)/1920,0.1,0.9))
for c in cues:
    ty=c['type']; t0=c['t']
    if ty=='click': add(click(),t0,0.16,pan(c))
    elif ty=='tick': add(tick(),t0,0.05,pan(c))
    elif ty=='whoosh': add(whoosh(),t0,0.10,0.5)
    elif ty=='send': add(pop(420,900,0.16),t0,0.14,0.3)
    elif ty=='error': add(err(),t0,0.10,0.75)
    elif ty=='thump': add(thump(),t0,0.28,0.55)
    elif ty=='lock': add(click(),t0,0.12,0.5); add(bell(81,0.6),t0+0.02,0.05,0.5)
    elif ty=='blip': add(pop(1300,1320,0.09),t0,0.07,0.7)
    elif ty=='pop': add(pop(600,1400,0.1),t0,0.13,0.8)
    elif ty=='final':
        add(riser(1.6),t0-1.6,0.08,0.5)
        for j,m in enumerate([74,81,86,89]): add(bell(m,3.0),t0+j*0.07,0.10*(1-0.15*j),0.35+0.1*j)
        n=int(2.5*SR); tt=np.arange(n)/SR; add(np.sin(2*np.pi*36.7*tt)*np.clip(tt/0.05,0,1)*np.exp(-tt*1.4),t0,0.22,0.5)
    elif ty=='end':
        for j,m in enumerate([62,69,74,77]): add(bell(m,3.0),t0+j*0.12,0.07,0.4+0.07*j)
L+=M[0]; R+=M[1]
out=np.stack([L,R],1); out=out/np.max(np.abs(out))*0.8
w=wave.open('out/mix.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype(np.int16).tobytes()); w.close()
print('ok fin',fin)
