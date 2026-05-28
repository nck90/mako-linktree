import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Camera,
  Copy,
  Download,
  Eye,
  FileDown,
  Globe2,
  Link2,
  MessageCircle,
  Palette,
  Plus,
  QrCode,
  RotateCcw,
  Settings2,
  Share2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import "./styles.css";

const storageKey = "mako-linktree.workspace.v1";
const adminSessionKey = "mako-linktree.admin-unlocked.v1";
const adminPassword = "080308";
const customPublicHost = "mako-linktree.hyphen.it.com";

const themes = [
  { id: "mako", name: "MAKO", label: "운영형 딥그린", surface: "#f8f7f3", accent: "#003f33", ink: "#17171c", glow: "#ff7759" },
  { id: "night", name: "Signal", label: "프리미엄 다크", surface: "#101115", accent: "#d9ffe4", ink: "#ffffff", glow: "#67c7ac" },
  { id: "launch", name: "Launch", label: "캠페인 코랄", surface: "#fff4ef", accent: "#f05f3e", ink: "#17171c", glow: "#003f33" },
  { id: "clean", name: "Studio", label: "화이트 블루", surface: "#ffffff", accent: "#1863dc", ink: "#17171c", glow: "#003f33" },
];

const defaultWorkspace = {
  profile: {
    handle: "mako.official",
    name: "MAKO",
    bio: "AI 마케팅 운영, 카드뉴스, 랜딩페이지, CRM까지 한 링크에서 연결합니다.",
    notice: "이번 주 베타 온보딩 신청을 받고 있습니다.",
    avatar: "M",
  },
  theme: "mako",
  published: true,
  links: [
    { id: "reserve", title: "상담 예약하기", subtitle: "이번 주 베타 온보딩 상담", badge: "Primary", url: "https://mako.link/reserve", icon: "message", clicks: 428, active: true, featured: true },
    { id: "campaign", title: "이번 달 캠페인 보기", subtitle: "카드뉴스/블로그/CRM 패키지", badge: "Campaign", url: "https://mako.link/campaign", icon: "spark", clicks: 316, active: true },
    { id: "portfolio", title: "카드뉴스 포트폴리오", subtitle: "생성 샘플과 전환 흐름", badge: "Work", url: "https://mako.link/work", icon: "link", clicks: 211, active: true },
    { id: "instagram", title: "인스타그램", subtitle: "콘텐츠 운영 레퍼런스", badge: "Social", url: "https://instagram.com/mako", icon: "instagram", clicks: 184, active: true },
  ],
};

function normalizeLink(link, index = 0) {
  return {
    subtitle: index === 0 ? "대표 전환 링크" : "",
    badge: index === 0 ? "Primary" : "Link",
    featured: index === 0 ? true : false,
    clicks: 0,
    active: true,
    icon: "link",
    ...link,
  };
}

function loadWorkspace() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return defaultWorkspace;
    const parsed = JSON.parse(saved);
    return {
      ...defaultWorkspace,
      ...parsed,
      profile: { ...defaultWorkspace.profile, ...(parsed.profile || {}) },
      links: Array.isArray(parsed.links) ? parsed.links.map(normalizeLink) : defaultWorkspace.links.map(normalizeLink),
    };
  } catch {
    return { ...defaultWorkspace, links: defaultWorkspace.links.map(normalizeLink) };
  }
}

function publicPath(handle) {
  if (window.location.hostname === customPublicHost) return "/";
  return `/@${encodeURIComponent(handle || "mako.official")}`;
}

function getPublicUrl(handle) {
  return `${window.location.origin}${publicPath(handle)}`;
}

function normalizeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url) || /^tel:/i.test(url)) return url;
  return `https://${url}`;
}

function App() {
  const [workspace, setWorkspace] = useState(loadWorkspace);
  const [route, setRoute] = useState(window.location.pathname);
  const [toast, setToast] = useState("모든 변경사항은 이 브라우저에 자동 저장됩니다.");
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(() => sessionStorage.getItem(adminSessionKey) === "true");
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(workspace));
  }, [workspace]);

  const selectedTheme = themes.find((theme) => theme.id === workspace.theme) || themes[0];
  const publicUrl = getPublicUrl(workspace.profile.handle);
  const isCustomPublicRoot = window.location.hostname === customPublicHost && route === "/";

  async function openQr() {
    const dataUrl = await QRCode.toDataURL(publicUrl, {
      width: 720,
      margin: 2,
      color: { dark: "#101115", light: "#ffffff" },
    });
    setQrDataUrl(dataUrl);
    setQrOpen(true);
  }

  function navigateTo(path) {
    window.history.pushState({}, "", path);
    setRoute(path);
  }

  function unlockAdmin() {
    sessionStorage.setItem(adminSessionKey, "true");
    setAdminUnlocked(true);
    setAdminLoginOpen(false);
    navigateTo("/studio");
  }

  function patchWorkspace(patch) {
    setWorkspace((current) => ({ ...current, ...patch }));
  }

  function patchProfile(patch) {
    setWorkspace((current) => ({ ...current, profile: { ...current.profile, ...patch } }));
  }

  function patchLink(id, patch) {
    setWorkspace((current) => ({
      ...current,
      links: current.links.map((link) => link.id === id ? { ...link, ...patch } : link),
    }));
  }

  function addLink() {
    setWorkspace((current) => ({
      ...current,
      links: [
        ...current.links,
        { id: `link-${Date.now()}`, title: "새 링크", subtitle: "링크 설명", badge: "Link", url: "https://", icon: "link", clicks: 0, active: true, featured: false },
      ],
    }));
  }

  function removeLink(id) {
    setWorkspace((current) => ({ ...current, links: current.links.filter((link) => link.id !== id) }));
  }

  function moveLink(id, direction) {
    setWorkspace((current) => {
      const links = [...current.links];
      const index = links.findIndex((link) => link.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= links.length) return current;
      [links[index], links[nextIndex]] = [links[nextIndex], links[index]];
      return { ...current, links };
    });
  }

  function trackClick(id) {
    setWorkspace((current) => ({
      ...current,
      links: current.links.map((link) => link.id === id ? { ...link, clicks: Number(link.clicks || 0) + 1 } : link),
    }));
  }

  async function copyPublicUrl() {
    await navigator.clipboard.writeText(publicUrl);
    setToast("공개 링크를 복사했습니다.");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mako-linktree-${workspace.profile.handle || "profile"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("설정 파일을 내보냈습니다.");
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        setWorkspace({
          ...defaultWorkspace,
          ...parsed,
          profile: { ...defaultWorkspace.profile, ...(parsed.profile || {}) },
          links: Array.isArray(parsed.links) ? parsed.links.map(normalizeLink) : defaultWorkspace.links.map(normalizeLink),
        });
        setToast("설정 파일을 가져왔습니다.");
      } catch {
        setToast("가져오기 실패: JSON 파일을 확인하세요.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function resetAnalytics() {
    setWorkspace((current) => ({ ...current, links: current.links.map((link) => ({ ...link, clicks: 0 })) }));
    setToast("클릭 집계를 초기화했습니다.");
  }

  if (route.startsWith("/@") || isCustomPublicRoot) {
    return (
      <>
        <PublicPage
          workspace={workspace}
          theme={selectedTheme}
          onTrack={trackClick}
          onAdminRequest={() => setAdminLoginOpen(true)}
        />
        {adminLoginOpen ? (
          <AdminLoginModal
            onClose={() => setAdminLoginOpen(false)}
            onUnlock={unlockAdmin}
          />
        ) : null}
      </>
    );
  }

  if (!adminUnlocked) {
    return (
      <AdminLoginPage
        onUnlock={unlockAdmin}
        onPublic={() => navigateTo(publicPath(workspace.profile.handle))}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigateTo("/studio")}>
          <span>M</span>
          <strong>MAKO Link</strong>
          <small>profile link builder</small>
        </button>
        <nav>
          <a href="#links"><Link2 size={18} /> 링크</a>
          <a href="#design"><Palette size={18} /> 디자인</a>
          <a href="#analytics"><BarChart3 size={18} /> 분석</a>
          <a href="#settings"><Settings2 size={18} /> 설정</a>
        </nav>
        <section className="sidebar-card">
          <p>PUBLIC URL</p>
          <strong>{publicUrl.replace(/^https?:\/\//, "")}</strong>
          <button onClick={copyPublicUrl}><Copy size={15} /> 복사</button>
        </section>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">WORKSPACE</p>
            <strong>{workspace.profile.name} link hub</strong>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={() => navigateTo(publicPath(workspace.profile.handle))}><Eye size={16} /> 공개 페이지</button>
            <button className="ghost-button" onClick={openQr}><QrCode size={16} /> QR</button>
            <button className="dark-button" onClick={() => { patchWorkspace({ published: !workspace.published }); setToast(workspace.published ? "공개를 중지했습니다." : "공개했습니다."); }}>
              <Share2 size={16} /> {workspace.published ? "공개 중" : "비공개"}
            </button>
          </div>
        </header>

        <section className="hero">
          <div>
            <p className="eyebrow">MAKO LINK STUDIO</p>
            <h1>프로필 링크를 전환 허브로 운영합니다.</h1>
            <p>대표 CTA, 보조 링크, QR, 공개 상태와 클릭 집계를 한 화면에서 관리하는 프리미엄 링크 운영 도구입니다.</p>
          </div>
          <Metrics links={workspace.links} />
        </section>

        <div className="workspace">
          <section className="editor">
            <Panel id="settings" title="프로필" icon={Settings2}>
              <div className="profile-grid">
                <label><span>핸들</span><input value={workspace.profile.handle} onChange={(event) => patchProfile({ handle: event.target.value.replace(/[^a-zA-Z0-9._-]/g, "") })} /></label>
                <label><span>브랜드 이름</span><input value={workspace.profile.name} onChange={(event) => patchProfile({ name: event.target.value })} /></label>
                <label><span>아바타 문자</span><input maxLength={2} value={workspace.profile.avatar} onChange={(event) => patchProfile({ avatar: event.target.value })} /></label>
                <label className="is-wide"><span>소개</span><textarea value={workspace.profile.bio} onChange={(event) => patchProfile({ bio: event.target.value })} /></label>
                <label className="is-wide"><span>상단 공지</span><input value={workspace.profile.notice} onChange={(event) => patchProfile({ notice: event.target.value })} /></label>
              </div>
            </Panel>

            <Panel id="design" title="마코 디자인" icon={Palette}>
              <div className="theme-grid">
                {themes.map((theme) => (
                  <button className={workspace.theme === theme.id ? "is-active" : ""} key={theme.id} onClick={() => patchWorkspace({ theme: theme.id })}>
                    <span style={{ background: theme.accent }} />
                    <strong>{theme.name}</strong>
                    <em>{theme.label}</em>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel id="links" title="링크" icon={Link2} action={<button className="add-button" onClick={addLink}><Plus size={16} /> 추가</button>}>
              <div className="link-editor">
                {workspace.links.map((link, index) => (
                  <article className={link.active ? "" : "is-muted"} key={link.id}>
                    <b>{index + 1}</b>
                    <div className="link-title-stack">
                      <input aria-label="링크 제목" value={link.title} onChange={(event) => patchLink(link.id, { title: event.target.value })} />
                      <input aria-label="링크 설명" value={link.subtitle || ""} onChange={(event) => patchLink(link.id, { subtitle: event.target.value })} />
                    </div>
                    <div className="link-url-stack">
                      <input aria-label="링크 URL" value={link.url} onChange={(event) => patchLink(link.id, { url: event.target.value })} />
                      <input aria-label="링크 배지" value={link.badge || ""} onChange={(event) => patchLink(link.id, { badge: event.target.value })} />
                    </div>
                    <select value={link.icon} onChange={(event) => patchLink(link.id, { icon: event.target.value })}>
                      <option value="message">문의</option>
                      <option value="spark">캠페인</option>
                      <option value="instagram">인스타</option>
                      <option value="link">링크</option>
                    </select>
                    <button className={link.active ? "is-on" : ""} onClick={() => patchLink(link.id, { active: !link.active })}>{link.active ? "ON" : "OFF"}</button>
                    <div className="row-tools">
                      <button aria-label="대표 링크" className={link.featured ? "is-featured" : ""} onClick={() => patchLink(link.id, { featured: !link.featured })}><Sparkles size={15} /></button>
                      <button aria-label="위로 이동" onClick={() => moveLink(link.id, -1)}><ArrowUp size={15} /></button>
                      <button aria-label="아래로 이동" onClick={() => moveLink(link.id, 1)}><ArrowDown size={15} /></button>
                      <button aria-label="삭제" onClick={() => removeLink(link.id)}><Trash2 size={15} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel id="analytics" title="운영 도구" icon={FileDown}>
              <div className="ops-grid">
                <button onClick={exportData}><Download size={16} /> 설정 내보내기</button>
                <label>
                  <Upload size={16} />
                  설정 가져오기
                  <input type="file" accept="application/json" onChange={importData} />
                </label>
                <button onClick={resetAnalytics}><RotateCcw size={16} /> 클릭 초기화</button>
              </div>
            </Panel>
          </section>

          <aside className="preview-column">
            <PreviewInspector
              workspace={workspace}
              theme={selectedTheme}
              publicUrl={publicUrl}
              onTrack={trackClick}
              onOpenPublic={() => navigateTo(publicPath(workspace.profile.handle))}
              onQr={openQr}
            />
            <Analytics links={workspace.links} />
          </aside>
        </div>
      </main>

      <div className="toast">{toast}</div>
      {qrOpen ? (
        <QrModal
          dataUrl={qrDataUrl}
          publicUrl={publicUrl}
          onClose={() => setQrOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Metrics({ links }) {
  const activeLinks = links.filter((link) => link.active);
  const totalClicks = links.reduce((sum, link) => sum + Number(link.clicks || 0), 0);
  const topLink = [...links].sort((a, b) => Number(b.clicks || 0) - Number(a.clicks || 0))[0] || links[0];
  return (
    <div className="hero-stats">
      <article><span>전체 클릭</span><strong>{totalClicks.toLocaleString()}</strong></article>
      <article><span>활성 링크</span><strong>{activeLinks.length}</strong></article>
      <article><span>상위 링크</span><strong>{topLink?.title || "-"}</strong></article>
    </div>
  );
}

function Panel({ id, title, icon: Icon, action, children }) {
  return (
    <section className="panel" id={id}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">BUILDER</p>
          <h2>{title}</h2>
        </div>
        {action || <Icon size={20} />}
      </div>
      {children}
    </section>
  );
}

function PreviewInspector({ workspace, theme, publicUrl, onTrack, onOpenPublic, onQr }) {
  const activeLinks = workspace.links.filter((link) => link.active);
  const totalClicks = workspace.links.reduce((sum, link) => sum + Number(link.clicks || 0), 0);
  const topLink = [...workspace.links].sort((a, b) => Number(b.clicks || 0) - Number(a.clicks || 0))[0];
  return (
    <section className="preview-inspector">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">LIVE PREVIEW</p>
          <strong className={workspace.published ? "status-pill is-live" : "status-pill"}>{workspace.published ? "공개 중" : "비공개"}</strong>
        </div>
        <div className="preview-actions">
          <button onClick={onQr} aria-label="QR 코드"><QrCode size={16} /></button>
          <button onClick={onOpenPublic} aria-label="공개 페이지 열기"><Eye size={16} /></button>
        </div>
      </div>
      <div className="preview-url-card">
        <Globe2 size={17} />
        <span>{publicUrl.replace(/^https?:\/\//, "")}</span>
      </div>
      <div className="device-stage">
        <PhonePreview workspace={workspace} theme={theme} onTrack={onTrack} />
      </div>
      <div className="preview-summary-grid">
        <article>
          <span>활성 링크</span>
          <strong>{activeLinks.length}</strong>
        </article>
        <article>
          <span>전체 클릭</span>
          <strong>{totalClicks.toLocaleString()}</strong>
        </article>
        <article>
          <span>상위 링크</span>
          <strong>{topLink?.title || "-"}</strong>
        </article>
      </div>
    </section>
  );
}

function PhonePreview({ workspace, theme, onTrack }) {
  return <PhoneSurface workspace={workspace} theme={theme} onTrack={onTrack} preview />;
}

function PhoneSurface({ workspace, theme, onTrack, preview = false }) {
  return (
    <section
      className="phone"
      style={{
        "--preview-surface": theme.surface,
        "--preview-accent": theme.accent,
        "--preview-ink": theme.ink,
      }}
    >
      <div className="phone-top">
        <span>9:41</span>
        <div className="phone-island" />
        <span>5G</span>
      </div>
      <ProfileBlock workspace={workspace} />
      <LinkList links={workspace.links.filter((link) => link.active)} onTrack={onTrack} preview={preview} />
      <footer className="phone-footer">
        <span>Made with</span>
        <strong>MAKO Link</strong>
      </footer>
    </section>
  );
}

function ProfileBlock({ workspace }) {
  return (
    <div className="profile-card">
      <div className="avatar">{workspace.profile.avatar || "M"}</div>
      <p>@{workspace.profile.handle}</p>
      <h2>{workspace.profile.name}</h2>
      <span>{workspace.profile.bio}</span>
      {workspace.profile.notice ? <em>{workspace.profile.notice}</em> : null}
    </div>
  );
}

function LinkList({ links, onTrack, preview = false }) {
  return (
    <div className="mobile-links">
      {links.map((link, index) => (
        <a
          className=""
          href={normalizeUrl(link.url)}
          key={link.id}
          target={preview ? undefined : "_blank"}
          rel="noreferrer"
          onClick={(event) => {
            onTrack(link.id);
            if (preview) event.preventDefault();
          }}
        >
          <IconFor type={link.icon} />
          <span className="link-copy">
            <strong>{link.title}</strong>
            <em>{link.badge || (index === 0 ? "Primary action" : link.url.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</em>
          </span>
          <ArrowUpRight size={15} />
        </a>
      ))}
    </div>
  );
}

function Analytics({ links }) {
  const totalClicks = links.reduce((sum, link) => sum + Number(link.clicks || 0), 0);
  return (
    <section className="analytics">
      <div className="panel-head">
        <div>
          <p className="eyebrow">ANALYTICS</p>
          <h2>링크 성과</h2>
        </div>
        <span className="live-pill">LIVE</span>
      </div>
      {links.map((link) => {
        const width = totalClicks ? Math.max(4, Math.round((Number(link.clicks || 0) / totalClicks) * 100)) : 4;
        return (
          <article key={link.id}>
            <div><strong>{link.title}</strong><em>{Number(link.clicks || 0).toLocaleString()}</em></div>
            <span style={{ "--bar": `${width}%` }} />
          </article>
        );
      })}
    </section>
  );
}

function PublicPage({ workspace, theme, onTrack, onAdminRequest }) {
  const [adminTapCount, setAdminTapCount] = useState(0);

  function handleAdminTap() {
    setAdminTapCount((count) => {
      const nextCount = count + 1;
      if (nextCount >= 3) {
        onAdminRequest();
        return 0;
      }
      window.setTimeout(() => setAdminTapCount(0), 1200);
      return nextCount;
    });
  }

  if (!workspace.published) {
    return (
      <main className="public-page is-private">
        <button className="admin-hotspot" aria-label="운영 로그인" onClick={handleAdminTap} />
        <section>
          <strong>MAKO Link</strong>
          <h1>현재 비공개 링크입니다.</h1>
        </section>
      </main>
    );
  }
  return (
    <main
      className="public-page"
      style={{
        "--preview-surface": theme.surface,
        "--preview-accent": theme.accent,
        "--preview-ink": theme.ink,
      }}
    >
      <button className="admin-hotspot" aria-label="운영 로그인" onClick={handleAdminTap} />
      <div className="public-shell-label">
        <span>MAKO LINK</span>
        <strong>{workspace.profile.handle}</strong>
      </div>
      <div className="public-device-stage">
        <PhoneSurface workspace={workspace} theme={theme} onTrack={onTrack} />
      </div>
    </main>
  );
}

function useAdminPasswordForm(onUnlock) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    if (password === adminPassword) {
      onUnlock();
      return;
    }
    setPassword("");
    setError("비밀번호를 확인하세요.");
  }

  return { password, setPassword, error, submit };
}

function AdminLoginPage({ onUnlock, onPublic }) {
  const { password, setPassword, error, submit } = useAdminPasswordForm(onUnlock);

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={submit}>
        <span>MAKO Link</span>
        <h1>운영 로그인</h1>
        <input
          autoFocus
          inputMode="numeric"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p>{error}</p> : null}
        <button className="dark-button" type="submit">입장</button>
        <button className="ghost-button" type="button" onClick={onPublic}>공개 페이지</button>
      </form>
    </main>
  );
}

function AdminLoginModal({ onClose, onUnlock }) {
  const { password, setPassword, error, submit } = useAdminPasswordForm(onUnlock);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="admin-login-card admin-login-modal" onSubmit={submit}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">MAKO LINK</p>
            <h2>운영 로그인</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>닫기</button>
        </div>
        <input
          autoFocus
          inputMode="numeric"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p>{error}</p> : null}
        <button className="dark-button" type="submit">입장</button>
      </form>
    </div>
  );
}

function QrModal({ dataUrl, publicUrl, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="qr-modal">
        <div className="panel-head">
          <div>
            <p className="eyebrow">QR CODE</p>
            <h2>공개 링크 QR</h2>
          </div>
          <button className="icon-button" onClick={onClose}>닫기</button>
        </div>
        {dataUrl ? <img src={dataUrl} alt="공개 링크 QR 코드" /> : null}
        <code>{publicUrl}</code>
        <a className="dark-button" href={dataUrl} download="mako-link-qr.png"><Download size={16} /> QR 다운로드</a>
      </section>
    </div>
  );
}

function IconFor({ type }) {
  if (type === "message") return <MessageCircle size={17} />;
  if (type === "spark") return <Sparkles size={17} />;
  if (type === "instagram") return <Camera size={17} />;
  if (type === "globe") return <Globe2 size={17} />;
  return <Link2 size={17} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
