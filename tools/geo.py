import math
LAT0, LON0 = 51.1301965, 18.9215954
KX = 111320*math.cos(math.radians(LAT0)); KZ = 110574
def to2180(lat, lon):
    a=6378137; f=1/298.257222101; k0=0.9993; l0=math.radians(19)
    phi=math.radians(lat); lam=math.radians(lon); n=f/(2-f); A=a/(1+n)*(1+n*n/4+n**4/64)
    al=[0, n/2-2*n*n/3+5*n**3/16, 13*n*n/48-3*n**3/5, 61*n**3/240]
    t=math.sinh(math.atanh(math.sin(phi))-2*math.sqrt(n)/(1+n)*math.atanh(2*math.sqrt(n)/(1+n)*math.sin(phi)))
    dl=lam-l0; xi=math.atan(t/math.cos(dl)); eta=math.atanh(math.sin(dl)/math.sqrt(1+t*t))
    N=xi; E=eta
    for j in range(1,4): N+=al[j]*math.sin(2*j*xi)*math.cosh(2*j*eta); E+=al[j]*math.cos(2*j*xi)*math.sinh(2*j*eta)
    return k0*A*N-5300000, k0*A*E+500000
def loc2180(x,z): return to2180(LAT0-z/KZ, LON0+x/KX)
_a=loc2180(0,0); _bx=loc2180(1000,0); _bz=loc2180(0,1000)
Nx=(_bx[0]-_a[0])/1000; Ex=(_bx[1]-_a[1])/1000; Nz=(_bz[0]-_a[0])/1000; Ez=(_bz[1]-_a[1])/1000
_det=Ex*Nz-Ez*Nx
def from2180(N,E):
    dE=E-_a[1]; dN=N-_a[0]
    x=( Nz*dE-Ez*dN)/_det; z=(-Nx*dE+Ex*dN)/_det
    for _ in range(3):
        n2,e2=loc2180(x,z); dE=E-e2; dN=N-n2
        x+=( Nz*dE-Ez*dN)/_det; z+=(-Nx*dE+Ex*dN)/_det
    return x,z
if __name__=='__main__':
    for x,z in [(0,0),(-3000,1900),(2400,-800)]:
        N,E=loc2180(x,z); print((x,z), from2180(N,E))
