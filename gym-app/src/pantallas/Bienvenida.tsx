import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { BRAND } from '../config/brand';
import { Mensaje } from '../componentes/ui';
import { entrar, registrar } from '../nube/servicio';

export function Bienvenida({ volver = false }: { volver?: boolean }) {
  const navegar = useNavigate();
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (modo === 'crear' && contrasena !== confirmar) { setError('Las contraseñas no coinciden.'); return; }
    setEnviando(true);
    try {
      if (modo === 'entrar') await entrar(usuario, contrasena);
      else await registrar({ codigo, nombre, usuario, contrasena });
      if (volver) navegar('/perfil');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.');
    } finally { setEnviando(false); }
  }

  const campoTexto = 'campo text-[17px]';
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 pb-10 pt-[max(24px,env(safe-area-inset-top))]">
      <div className="mb-6 flex flex-col items-center text-center">
        <img src={BRAND.logo} alt="" className="h-24 w-24 rounded-3xl shadow-lg" />
        <h1 className="titulo mt-4 text-[34px] leading-none">{BRAND.nombre}</h1>
        <p className="mt-2 text-sm text-tenue">{BRAND.descripcion}</p>
      </div>

      <div className="mb-4 flex rounded-xl bg-tarjeta p-1" role="tablist" aria-label="Acceso">
        {(['entrar', 'crear'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={modo === m} onClick={() => { setModo(m); setError(null); }}
            className={`titulo min-h-11 flex-1 rounded-[9px] text-base ${modo === m ? 'bg-marca text-sobre-marca' : 'text-tenue'}`}>
            {m === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </button>
        ))}
      </div>

      <form onSubmit={enviar} className="tarjeta space-y-3.5" noValidate>
        {modo === 'crear' && (
          <>
            <label className="block"><span className="etiqueta">Código de invitación</span>
              <input className={`${campoTexto} num uppercase tracking-wider`} value={codigo} onChange={(e) => setCodigo(e.target.value)}
                placeholder="EVA-XXXX-XXXX" autoCapitalize="characters" autoCorrect="off" spellCheck={false} required /></label>
            <label className="block"><span className="etiqueta">Tu nombre</span>
              <input className={campoTexto} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Eva" autoComplete="given-name" /></label>
          </>
        )}
        <label className="block"><span className="etiqueta">Usuario</span>
          <input className={campoTexto} value={usuario} onChange={(e) => setUsuario(e.target.value.replace(/\s/g, '').toLowerCase())}
            placeholder="ej. eva.arellano" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required /></label>
        {modo === 'crear' && <p className="-mt-2 text-xs text-tenue">3 a 24 caracteres: letras, números, punto, guion o guion bajo.</p>}
        <label className="block"><span className="etiqueta">Contraseña</span>
          <div className="relative">
            <input className={`${campoTexto} pr-12`} type={ver ? 'text' : 'password'} value={contrasena} onChange={(e) => setContrasena(e.target.value)}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required minLength={8} />
            <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-tenue">{ver ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}</button>
          </div></label>
        {modo === 'crear' && (
          <label className="block"><span className="etiqueta">Repite la contraseña</span>
            <input className={campoTexto} type={ver ? 'text' : 'password'} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" required /></label>
        )}
        {error && <Mensaje tono="error" titulo={error} />}
        <button className="btn btn-marca w-full" disabled={enviando || !usuario || !contrasena || (modo === 'crear' && !codigo)}>
          {modo === 'entrar' ? <LogIn size={20} aria-hidden /> : <UserPlus size={20} aria-hidden />}
          {enviando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-tenue">
        {modo === 'entrar' ? '¿Olvidaste tu contraseña? Pídele a quien te invitó que te la restablezca.' : 'Solo puedes crear una cuenta con un código de invitación.'}
      </p>
    </main>
  );
}
