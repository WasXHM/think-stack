import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSession, login, logout } from '../services/auth.js';
import Drawer from './Drawer.js';
import { Button } from './Button.js';

const Context = createContext(null);
export const useAuth = () => useContext(Context);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => getSession().then((data) => { if (active) setUser(data.user); }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setLoading(false); });
    const expired = () => { setUser(null); setPassword(''); };
    void refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('thinkstack:unauthorized', expired);
    return () => { active = false; window.removeEventListener('focus', refresh); window.removeEventListener('thinkstack:unauthorized', expired); };
  }, []);
  function openLogin() { setError(''); setPassword(''); setOpen(true); }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await login({ username, password }); setUser(data.user); setPassword(''); setOpen(false); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setError('');
    try { await logout(); setUser(null); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <Context.Provider value={{ user, canEdit: Boolean(user), loading, openLogin, signOut, busy, error }}>
    {children}
    <Drawer open={open} onClose={() => { setOpen(false); setPassword(''); }} title="登录" description="登录后可以新增、编辑和删除内容。" busy={busy} presentation="workspace-dialog">
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="login-username">用户名</label><input id="login-username" autoComplete="username" required maxLength={100} value={username} onChange={(event) => setUsername(event.target.value)} disabled={busy} data-autofocus /></div>
        <div className="field"><label htmlFor="login-password">密码</label><input id="login-password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="form-actions"><Button busy={busy} type="submit" variant="primary">登录</Button><Button disabled={busy} type="button" onClick={() => { setOpen(false); setPassword(''); }}>取消</Button></div>
      </form>
    </Drawer>
  </Context.Provider>;
}
export function AuthControl() {
  const { user, openLogin, signOut, busy, error } = useAuth();
  return <div className="auth-control">{user ? <><span>{user.username}</span><Button disabled={busy} onClick={signOut}>退出登录</Button>{error ? <span role="alert">{error}</span> : null}</> : <Button onClick={openLogin}>登录</Button>}</div>;
}
export function RequireEditor({ children }) {
  const { canEdit, loading, openLogin } = useAuth();
  if (loading) return <div className="page" role="status">正在确认登录状态…</div>;
  if (!canEdit) return <div className="page"><h1>当前为只读模式</h1><p>你可以浏览所有文档，登录后即可新增和编辑内容。</p><Button onClick={openLogin} variant="primary">登录</Button></div>;
  return children;
}
