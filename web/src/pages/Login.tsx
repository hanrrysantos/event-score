import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { api, token, type Schemas } from '../api/client';
import './Login.css';

// O mock tinha "matrícula" e "Esqueceu a senha?": saíram, pois o login é só por e-mail e sem recuperação (contrato v0.3).
export default function Login() {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (token.ler()) return <Navigate to="/" replace />;

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    setErro('');
    setEnviando(true);
    try {
      const resposta = await api<Schemas['LoginResponseDto']>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: dados.get('email'), senha: dados.get('senha') }),
      });
      token.salvar(resposta.token, dados.get('manter') === 'on');
      navigate('/', { replace: true });
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <section className="login-form">
        <div className="login-logo">
          <span className="login-selo">E/S</span>
          <div>
            <strong>EVENTSCORE</strong>
            <small>Motor de apuração</small>
          </div>
        </div>

        <form onSubmit={entrar}>
          <span className="login-tag">Acesso administrativo</span>
          <h1>Acesso ao sistema</h1>
          <p className="login-sub">Entre com suas credenciais para gerenciar provas, notas e a apuração oficial.</p>

          <label className="campo">
            E-mail
            <input name="email" type="email" required autoComplete="username" placeholder="operador@arenacomp.org" />
          </label>
          <label className="campo">
            Senha
            <input name="senha" type="password" required autoComplete="current-password" />
          </label>
          <label className="login-manter">
            <input name="manter" type="checkbox" /> Manter conectado
          </label>

          {erro && (
            <p className="erro" role="alert">
              {erro}
            </p>
          )}

          <button className="btn" type="submit" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar no sistema →'}
          </button>
        </form>

        <small className="login-rodape">© 2026 Arena Comp</small>
      </section>

      <section className="login-arte" aria-hidden="true">
        <h2>
          Arena
          <br />
          Comp 2026
        </h2>
        <p>Pontuação, frequência e relatórios do evento em um só lugar.</p>
        <div className="login-barras">
          {['80%', '55%', '68%'].map((largura) => (
            <i key={largura}>
              <span style={{ width: largura }} />
            </i>
          ))}
        </div>
      </section>
    </main>
  );
}
