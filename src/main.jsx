import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileDown,
  FileText,
  Gift,
  Globe2,
  Images,
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
  X,
} from "lucide-react";
import "./styles.css";

const storageKey = "mako-linktree.workspace.v2.expo";
const adminSessionKey = "mako-linktree.admin-unlocked.v1";
const adminPassword = "080308";
const customPublicHost = "mako-linktree.hyphen.it.com";
const landingPageUrl = "https://mako-landing.hyphen.it.com/";
const apiBaseUrl = String(import.meta.env.VITE_MAKO_API_BASE_URL || "").replace(/\/$/, "");
const consultationApiPath = `${apiBaseUrl}/api/public/mako-consultations`;
const betaEvent = {
  popupImage: "/events/mako-beta-popup.png",
  detailImage: "/events/mako-beta-detail.png",
  deadline: "2026년 6월 5일",
};

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
    bio: "박람회 현장에서 MAKO의 랜딩, 상담, 산출물, 제안서를 한 번에 확인하세요.",
    notice: "부스에서 바로 상담 예약과 산출물 예시를 확인할 수 있습니다.",
    avatar: "M",
  },
  theme: "mako",
  published: true,
  links: [
    { id: "landing", title: "랜딩페이지", subtitle: "MAKO 제품 소개 페이지", badge: "Product", url: landingPageUrl, icon: "globe", clicks: 428, active: true, featured: false },
    { id: "consult", title: "상담 예약하기", subtitle: "박람회 현장 상담 신청", badge: "Booking", url: "/consult", icon: "message", clicks: 316, active: true, featured: false },
    { id: "samples", title: "산출물 예시", subtitle: "카드뉴스/랜딩/운영 화면", badge: "Showcase", url: "/samples", icon: "images", clicks: 211, active: true, featured: false },
    { id: "proposal", title: "제안서 보기", subtitle: "도입 방식과 제공 범위", badge: "Proposal", url: "/proposal", icon: "file", clicks: 184, active: true, featured: false },
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

function toCsvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadConsultationsCsv(consultations) {
  const headers = ["접수번호", "접수시각", "이름", "소속/브랜드", "연락처", "관심 항목", "희망 시간", "메모"];
  const rows = consultations.map((item) => [
    item.id,
    item.createdAt,
    item.name,
    item.company,
    item.contact,
    item.interest,
    item.preferredTime,
    item.memo,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mako-consultations.csv";
  anchor.click();
  URL.revokeObjectURL(url);
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
  if (isInternalPath(url)) return url;
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url) || /^tel:/i.test(url)) return url;
  return `https://${url}`;
}

function isInternalPath(value) {
  return /^\/(consult|samples|proposal|event)(\/)?$/i.test(String(value || "").trim());
}

function App() {
  const [workspace, setWorkspace] = useState(loadWorkspace);
  const [consultations, setConsultations] = useState([]);
  const [route, setRoute] = useState(window.location.pathname);
  const [toast, setToast] = useState("모든 변경사항은 이 브라우저에 자동 저장됩니다.");
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(() => sessionStorage.getItem(adminSessionKey) === "true");
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [eventPopupOpen, setEventPopupOpen] = useState(true);

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

  useEffect(() => {
    if (!adminUnlocked) return;
    refreshConsultations();
  }, [adminUnlocked]);

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

  async function refreshConsultations() {
    try {
      const response = await fetch(consultationApiPath, {
        headers: { "x-mako-admin-password": adminPassword },
      });
      if (!response.ok) throw new Error("상담 접수 목록을 불러오지 못했습니다.");
      const data = await response.json();
      setConsultations(Array.isArray(data.consultations) ? data.consultations : []);
    } catch (error) {
      setToast(error.message || "상담 접수 목록을 불러오지 못했습니다.");
    }
  }

  async function submitConsultation(entry) {
    const response = await fetch(consultationApiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "상담 접수 저장 중 오류가 발생했습니다.");
    return data.consultation;
  }

  function exportConsultations() {
    downloadConsultationsCsv(consultations);
    setToast("상담 접수 CSV를 다운로드했습니다.");
  }

  async function clearConsultations() {
    try {
      const response = await fetch(consultationApiPath, {
        method: "DELETE",
        headers: { "x-mako-admin-password": adminPassword },
      });
      if (!response.ok) throw new Error("상담 접수 목록을 비우지 못했습니다.");
      setConsultations([]);
      setToast("상담 접수 목록을 비웠습니다.");
    } catch (error) {
      setToast(error.message || "상담 접수 목록을 비우지 못했습니다.");
    }
  }

  if (route === "/consult") {
    return <ConsultPage onBack={() => navigateTo(publicPath(workspace.profile.handle))} onSubmit={submitConsultation} />;
  }

  if (route === "/samples") {
    return <SamplesPage onBack={() => navigateTo(publicPath(workspace.profile.handle))} />;
  }

  if (route === "/proposal") {
    return <ProposalPage onBack={() => navigateTo(publicPath(workspace.profile.handle))} onConsult={() => navigateTo("/consult")} />;
  }

  if (route === "/event") {
    return <EventPage onBack={() => navigateTo(publicPath(workspace.profile.handle))} onConsult={() => navigateTo("/consult")} />;
  }

  if (route.startsWith("/@") || isCustomPublicRoot) {
    return (
      <>
        <PublicPage
          workspace={workspace}
          theme={selectedTheme}
          onTrack={trackClick}
          onNavigate={navigateTo}
          onAdminRequest={() => setAdminLoginOpen(true)}
        />
        {eventPopupOpen ? (
          <BetaEventPopup
            onClose={() => setEventPopupOpen(false)}
            onDetail={() => {
              setEventPopupOpen(false);
              navigateTo("/event");
            }}
            onApply={() => {
              setEventPopupOpen(false);
              navigateTo("/consult");
            }}
          />
        ) : null}
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
                      <option value="globe">랜딩</option>
                      <option value="images">이미지</option>
                      <option value="file">문서</option>
                      <option value="calendar">예약</option>
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

            <ConsultationPanel
              consultations={consultations}
              onExport={exportConsultations}
              onClear={clearConsultations}
              onRefresh={refreshConsultations}
            />
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

function PhoneSurface({ workspace, theme, onTrack, preview = false, onNavigate }) {
  const activeLinks = workspace.links.filter((link) => link.active);
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
      <LinkList links={activeLinks} onTrack={onTrack} preview={preview} onNavigate={onNavigate} />
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

function LinkList({ links, onTrack, preview = false, onNavigate }) {
  return (
    <div className="mobile-links">
      {links.map((link, index) => (
        <a
          className=""
          href={normalizeUrl(link.url)}
          key={link.id}
          target={preview || isInternalPath(link.url) ? undefined : "_blank"}
          rel="noreferrer"
          onClick={(event) => {
            onTrack(link.id);
            if (preview) {
              event.preventDefault();
              return;
            }
            if (isInternalPath(link.url)) {
              event.preventDefault();
              onNavigate?.(link.url);
            }
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
          <h2>실제성과</h2>
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

function ConsultationPanel({ consultations, onExport, onClear, onRefresh }) {
  const latest = consultations.slice(0, 5);
  return (
    <Panel id="consultations" title="상담 접수" icon={MessageCircle} action={<span className="live-pill">{consultations.length}건</span>}>
      <div className="consult-admin-tools">
        <button onClick={onRefresh}><RotateCcw size={16} /> 새로고침</button>
        <button onClick={onExport} disabled={!consultations.length}><Download size={16} /> CSV 다운로드</button>
        <button onClick={onClear} disabled={!consultations.length}><Trash2 size={16} /> 목록 초기화</button>
      </div>
      {latest.length ? (
        <div className="consult-admin-list">
          {latest.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.name || "이름 미입력"}</strong>
                <span>{item.company || "소속 미입력"} · {item.interest}</span>
              </div>
              <p>{item.contact}</p>
              <small>{item.preferredTime || "희망 시간 미입력"} · {new Date(item.createdAt).toLocaleString("ko-KR")}</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-note">아직 저장된 상담 접수가 없습니다.</p>
      )}
    </Panel>
  );
}

function PublicPage({ workspace, theme, onTrack, onNavigate, onAdminRequest }) {
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
        <PhoneSurface workspace={workspace} theme={theme} onTrack={onTrack} onNavigate={onNavigate} />
      </div>
    </main>
  );
}

function outputSlides(slug, count) {
  return Array.from({ length: count }, (_, index) => `/showcase/outputs/${slug}-${String(index + 1).padStart(2, "0")}.png`);
}

const cardnewsShowcase = [
  { title: "MAKO 홍보 카드뉴스", tag: "MAKO", slides: outputSlides("mako-promo-cardnews", 5), text: "MAKO를 소개하는 박람회용 홍보 카드뉴스입니다. imagegen으로 새로 제작했습니다." },
  { title: "콜라겐 부스터 네이버 카드뉴스", tag: "Olidia", slides: outputSlides("collagen-naver-cardnews", 5), text: "올리디아 키워드 흐름을 네이버 유입형 카드뉴스로 압축한 산출물입니다." },
  { title: "콜라겐 부스터 상담 기준", tag: "Olidia", slides: outputSlides("collagen-booster-cardnews", 5), text: "상담 전 확인 기준을 중심으로 구성한 올리디아 카드뉴스입니다." },
  { title: "콜라겐주사 필러 차이", tag: "Olidia", slides: outputSlides("collagen-filler-compare", 5), text: "혼동하기 쉬운 시술 선택 기준을 비교형 콘텐츠로 정리했습니다." },
  { title: "시술 후 시기별 관리", tag: "Olidia", slides: outputSlides("post-care-timeline", 6), text: "직후, 1주차, 1개월 관리 흐름을 단계별 카드로 구성했습니다." },
  { title: "올리디아 사후관리", tag: "Olidia", slides: outputSlides("olidia-aftercare", 5), text: "시술 후 루틴과 관리 기준을 상담형 톤으로 정리한 카드뉴스입니다." },
  { title: "올리디아 라인업 비교", tag: "Olidia", slides: outputSlides("olidia-lineup-compare", 5), text: "365, 120, 240 라인업을 상담 기준에 맞춰 비교한 카드뉴스입니다." },
  { title: "올리디아 제품 카드뉴스", tag: "Olidia", slides: outputSlides("olidia-product-card", 5), text: "제품 단위로 바로 보여줄 수 있는 정방형 카드뉴스 시안입니다." },
];

const textShowcase = [
  {
    type: "blog",
    title: "네이버 블로그 SEO 초안",
    label: "Blog",
    headline: "콜라겐주사 필러 차이, 시술 전 비교해야 할 기준",
    body: "꺼짐을 채우는 선택인지, 피부 탄력 반응을 봐야 하는지 상담 전 기준을 자연스럽게 풀어낸 검색 유입형 초안입니다.",
    fullContent: `거울을 볼 때 팔자 옆이나 볼 안쪽이 전보다 꺼져 보이면 가장 먼저 떠오르는 단어가 필러인 경우가 많습니다. 반대로 피부가 얇아지고 잔주름이 늘어난 느낌, 얼굴선이 예전보다 힘없이 내려오는 느낌이 함께 있다면 콜라겐주사나 콜라겐 부스터를 같이 검색하게 됩니다. 이름은 비슷하게 보이지만 상담실에서 확인해야 하는 기준은 다릅니다.

필러는 부족해 보이는 볼륨을 직접 보완하는 방향으로 이야기되는 경우가 많습니다. 특정 부위가 꺼져 보이거나 라인이 끊겨 보일 때 그 공간을 어떻게 자연스럽게 채울지 보는 방식입니다. 그래서 상담에서는 어느 부위가 꺼져 보이는지, 표정 변화에 따라 어색함이 생기지 않을지, 원하는 변화가 즉각적인지 점진적인지 같은 질문이 중요해집니다.

콜라겐 부스터는 피부 자체의 탄력 반응과 결 개선을 함께 보는 접근에 가깝습니다. 단순히 한 부위를 채우는 것보다 피부가 얇아진 느낌, 잔주름, 목주름, 탄력 저하처럼 넓게 퍼진 고민을 어떻게 관리할지 확인합니다. 이때는 기대 효과를 단정하기보다 현재 피부 상태, 회복 기간, 이전 시술 경험, 생활 패턴을 함께 봐야 합니다.

상담 전에는 세 가지를 나누어 적어두면 좋습니다. 첫째, 가장 신경 쓰이는 부위가 어디인지입니다. 둘째, 원하는 변화가 볼륨 보완인지 피부결과 탄력 개선인지입니다. 셋째, 회복에 쓸 수 있는 시간과 피하고 싶은 일정입니다. 이 정도만 정리해도 상담에서 필러와 콜라겐 부스터 중 어떤 방향을 먼저 볼지 훨씬 명확해집니다.

MAKO의 블로그 산출물은 이런 비교 기준을 검색자가 읽기 쉬운 순서로 풀어냅니다. 첫 문단에서는 고객이 실제로 검색하는 고민을 잡고, 중간 문단에서는 선택 기준을 과장 없이 설명합니다. 마지막에는 개인차와 전문가 상담 필요성을 안내하면서 자연스럽게 상담 CTA로 연결합니다. 광고처럼 밀어붙이는 글이 아니라 상담 전 고객이 스스로 판단할 수 있게 돕는 구조입니다.`,
    meta: ["검색 키워드", "섹션 구성", "CTA 문단"],
  },
  {
    type: "blog",
    title: "올리디아 검색형 블로그",
    label: "Blog",
    headline: "올리디아 시술 고민 후기, 상담 전 확인할 기준",
    body: "검색 고객이 궁금해하는 고민, 비교 기준, 상담 전 질문을 순서대로 정리한 블로그 초안입니다.",
    fullContent: `올리디아를 검색하는 분들은 대개 제품명만 알고 싶은 것이 아닙니다. 내 피부 고민에 맞는지, 어떤 상황에서 상담해볼 만한지, 기존에 알고 있던 필러나 스킨부스터와는 어떻게 다른지 확인하고 싶어합니다. 그래서 검색형 블로그는 첫 문장부터 제품 설명으로 들어가기보다 고객의 고민에서 출발해야 합니다.

예를 들어 피부 탄력이 떨어진 것 같다는 말 안에는 여러 고민이 섞여 있습니다. 팔자 주변이 꺼져 보이는 고민, 잔주름이 많아진 고민, 피부결이 거칠어진 고민, 얼굴 전체가 힘없이 보이는 고민이 서로 다릅니다. 올리디아 관련 글에서는 이 고민들을 하나로 묶어 단정하지 않고, 상담 전 어떤 기준으로 나눠볼 수 있는지 차분하게 설명하는 것이 중요합니다.

본문 중간에서는 비교 기준을 정리합니다. 필러처럼 볼륨 보완을 먼저 보는 선택이 있는 반면, 콜라겐 부스터처럼 피부 반응과 탄력 관리 관점에서 접근하는 선택도 있습니다. 다만 어떤 방식이 더 좋다고 단정하는 글은 신뢰를 떨어뜨릴 수 있습니다. 현재 피부 상태, 기대하는 변화, 회복 기간, 이전 시술 경험에 따라 상담 방향이 달라질 수 있다는 점을 함께 안내해야 합니다.

후반부에서는 체크리스트가 필요합니다. 상담 전에 고민 부위 사진을 준비할지, 평소 예민한 피부인지, 중요한 일정이 언제인지, 이전에 받은 시술이 있는지 정리해두면 상담이 훨씬 구체적이 됩니다. 특히 의료미용 콘텐츠는 과장된 기대보다 확인해야 할 질문을 제시할 때 더 안전하고 설득력이 생깁니다.

마지막 문단은 자연스러운 CTA로 닫습니다. "지금 바로 효과" 같은 표현보다 "내 피부 상태에 맞는 관리 방향이 궁금하다면 상담을 통해 확인해보세요"처럼 부드럽게 연결합니다. MAKO는 이런 흐름을 블로그 제목, 메타 설명, 소제목, 본문, 태그까지 한 번에 구성해 검색 유입이 상담 문의로 이어지도록 정리합니다.`,
    meta: ["올리디아", "검색 SEO", "상담 CTA"],
  },
  {
    type: "blog",
    title: "제품 비교형 블로그",
    label: "Blog",
    headline: "올리디아 365, 120, 240 라인 선택 기준",
    body: "라인업별 적합 상황을 비교하고 상담 전 체크리스트로 이어지게 구성한 정보형 블로그 산출물입니다.",
    fullContent: `제품 라인업을 비교하는 글은 숫자를 나열하는 것만으로는 충분하지 않습니다. 올리디아 365, 120, 240처럼 서로 다른 라인을 설명할 때는 "무엇이 더 강한가"보다 "어떤 고민에서 어떤 질문을 해야 하는가"가 먼저입니다. 검색자는 제품명을 알고 들어오지만 실제로는 내 상태에 맞는 기준을 찾고 있습니다.

첫 번째로 봐야 할 것은 피부 민감도입니다. 피부가 쉽게 붉어지거나 관리 후 자극을 자주 느끼는 분이라면 시작점을 보수적으로 잡아야 할 수 있습니다. 이런 독자에게는 라인업 차이를 단정적으로 말하기보다 상담 시 어떤 점을 확인해야 하는지 알려주는 구성이 좋습니다. 예민도, 회복 기간, 기존 홈케어 루틴 같은 요소가 함께 들어가야 합니다.

두 번째는 시술 경험입니다. 이미 여러 관리를 받아본 분과 처음 상담을 받는 분은 기대치가 다릅니다. 경험이 있는 경우에는 이전 관리에서 만족했던 점과 아쉬웠던 점을 나누어 보는 것이 도움이 됩니다. 처음 상담하는 경우에는 제품명보다 고민 부위와 원하는 변화의 속도를 먼저 정리하도록 안내하는 편이 자연스럽습니다.

세 번째는 콘텐츠의 표현 방식입니다. 의료미용 비교 글은 특정 라인이 무조건 좋다는 결론보다 선택 기준을 제시해야 합니다. "이런 경우 상담에서 120 라인을 물어볼 수 있습니다", "이런 고민이라면 240 관련 설명을 확인해볼 수 있습니다"처럼 가능성을 열어두는 문장이 안전합니다. 독자가 스스로 상담 질문을 준비할 수 있게 만드는 것이 핵심입니다.

MAKO의 비교형 블로그 산출물은 제목에서 검색 키워드를 잡고, 본문에서는 고객 상황별 기준을 정리합니다. 마지막에는 라인 선택은 피부 상태와 상담 결과에 따라 달라질 수 있다는 안내를 넣고 문의 CTA로 연결합니다. 이렇게 작성하면 단순 제품 소개가 아니라 실제 상담 전환에 가까운 정보형 글이 됩니다.`,
    meta: ["비교형", "제품 라인업", "상담 CTA"],
  },
  {
    type: "cafe",
    title: "카페 후기형 콘텐츠",
    label: "Cafe",
    headline: "상담 전에 정리해 본 콜라겐 부스터 체크포인트",
    body: "광고처럼 보이지 않게 고민, 알아본 기준, 상담 전 질문 순서로 작성한 커뮤니티형 목업 산출물입니다.",
    fullContent: `요즘 콜라겐 부스터를 알아보면서 느낀 건, 이름을 많이 아는 것보다 내 고민을 먼저 정리하는 게 훨씬 중요하다는 점이었어요. 처음에는 필러, 스킨부스터, 콜라겐주사 같은 단어가 다 비슷하게 보여서 뭐부터 봐야 할지 헷갈렸습니다.

제가 먼저 적어본 건 고민 부위였어요. 팔자 옆이 꺼져 보이는지, 잔주름이 신경 쓰이는지, 피부결이 거칠어진 느낌인지 나눠봤습니다. 막연히 "탄력이 떨어진 것 같다"라고만 말하면 상담 때도 설명이 흐려질 것 같더라고요.

두 번째로는 원하는 변화의 속도를 적어봤습니다. 빠르게 볼륨감이 달라지는 걸 기대하는지, 피부 컨디션을 천천히 끌어올리는 쪽을 원하는지에 따라 물어볼 내용이 다를 것 같았습니다. 광고 글만 보면 다 좋아 보이지만 실제 상담에서는 내 기대치를 정확히 말하는 게 중요해 보였어요.

세 번째는 일정입니다. 중요한 약속이 언제 있는지, 회복 기간을 어느 정도 생각할 수 있는지, 평소 피부가 예민한 편인지도 적어두면 좋을 것 같습니다. 특히 예민한 피부라면 홈케어 루틴이나 최근에 사용한 제품도 함께 이야기해야 할 것 같았어요.

후기만 보고 바로 결정하기보다, 상담 전에 내가 궁금한 질문을 정리해두는 게 더 현실적이라고 느꼈습니다. 비슷한 고민이 있다면 시술명부터 정하지 말고 고민 부위, 원하는 변화, 회복 일정, 예민도 정도를 먼저 메모해보세요. 상담이 훨씬 구체적으로 이어질 것 같습니다.`,
    meta: ["자연 후기 톤", "질문형 제목", "댓글 유도"],
  },
  {
    type: "cafe",
    title: "지역 카페 추천 글",
    label: "Cafe",
    headline: "올리디아 상담 전, 제가 정리한 질문들",
    body: "카페에서 자연스럽게 읽히도록 고객이 상담 전 메모한 질문 리스트처럼 구성한 목업입니다.",
    fullContent: `올리디아 상담을 알아보면서 제가 먼저 정리한 질문들을 공유해봅니다. 처음에는 제품명만 검색했는데, 보다 보니 결국 중요한 건 내 피부 고민을 얼마나 정확히 말할 수 있느냐였습니다.

첫 번째 질문은 "내가 원하는 변화가 정확히 무엇인지"였습니다. 얼굴이 전반적으로 힘없어 보이는 건지, 특정 부위가 꺼져 보이는 건지, 잔주름이나 피부결이 더 신경 쓰이는 건지 나눠서 적어봤습니다. 같은 탄력 고민이라고 해도 상담 방향이 다를 수 있겠다는 생각이 들었습니다.

두 번째 질문은 "기존 시술이나 관리 경험을 어떻게 말해야 하는지"였습니다. 이전에 어떤 관리를 받았는지, 만족했던 부분과 아쉬웠던 부분을 적어두면 상담이 더 빨리 정리될 것 같았습니다. 그냥 좋았다, 별로였다가 아니라 어떤 점이 좋았는지 구체적으로 써보는 게 도움이 됐습니다.

세 번째 질문은 "회복 기간과 일정"이었습니다. 중요한 일정이 있으면 그 전에 무리해도 되는지보다, 언제 상담하고 언제 관리하는 게 맞는지 먼저 확인해야 할 것 같았습니다. 특히 피부가 예민한 편이라면 회복 기간을 넉넉하게 잡아야 하는지도 꼭 물어보려고 합니다.

마지막으로 "내 피부 상태에 맞는 선택인지"를 꼭 확인하고 싶었습니다. 후기나 광고에서 본 표현을 그대로 믿기보다, 내 상태에서 기대할 수 있는 범위를 듣는 게 더 중요해 보였어요. 상담 전에 질문을 적어가면 막연한 걱정보다 구체적인 확인으로 이어질 수 있을 것 같습니다.`,
    meta: ["커뮤니티 톤", "질문 리스트", "상담 전환"],
  },
  {
    type: "cafe",
    title: "상담 후기형 글",
    label: "Cafe",
    headline: "상담 전에 질문 정리해가니까 훨씬 편했어요",
    body: "실제 후기를 사칭하지 않고 상담 전 고객이 정리한 메모처럼 자연스럽게 작성한 카페형 산출물입니다.",
    fullContent: `상담을 예약하기 전에는 궁금한 점이 너무 많아서 오히려 무엇을 물어봐야 할지 모르겠더라고요. 그래서 가기 전에 질문을 정리해봤는데, 막상 상담 흐름을 생각해보니 훨씬 편했습니다.

제가 먼저 적은 건 고민 부위였습니다. 팔자 주변이 신경 쓰이는지, 볼 쪽 꺼짐이 고민인지, 피부결과 잔주름이 더 문제인지 나눠서 써봤습니다. 이렇게 적어보니 "탄력이 고민이에요"라는 말보다 훨씬 구체적으로 설명할 수 있을 것 같았습니다.

그다음은 원하는 변화였습니다. 자연스럽게 좋아 보이고 싶은지, 특정 부위가 바로 보완되길 원하는지, 장기적으로 피부 컨디션을 관리하고 싶은지 적어봤습니다. 기대하는 변화가 다르면 상담에서 보는 기준도 달라질 수 있을 것 같았습니다.

이전 관리 경험도 함께 정리했습니다. 예전에 받은 시술이 있다면 언제 받았는지, 만족했던 점은 무엇인지, 불편했던 점은 무엇인지 적어두는 게 좋을 것 같습니다. 평소 피부가 예민한 편인지, 최근 사용한 홈케어 제품이 있는지도 같이 말하면 도움이 될 것 같았어요.

마지막으로 중요한 일정과 회복 기간을 적었습니다. 상담에서는 무조건 빨리 결정하는 것보다 내 일정에 맞게 가능한지 확인하는 과정이 필요하다고 생각했습니다. 비슷하게 상담을 앞두고 있다면 제품명만 검색하지 말고 질문 리스트를 먼저 만들어보세요. 상담 시간이 훨씬 실질적으로 느껴질 것 같습니다.`,
    meta: ["1인칭 관찰", "Q&A", "신뢰 톤"],
  },
  {
    type: "thread",
    title: "쓰레드 연속 포스트",
    label: "Threads",
    headline: "필러와 콜라겐 부스터, 선택 기준은 다릅니다",
    body: "짧은 문장으로 5개 포스트를 이어가며 저장할 만한 비교 포인트와 상담 CTA를 남기는 구조입니다.",
    fullContent: "1. 꺼진 부위를 바로 채우고 싶은 고민과 피부 탄력 자체를 보고 싶은 고민은 출발점이 다릅니다.\n2. 필러는 볼륨 보완 관점에서 이야기되는 경우가 많고, 콜라겐 부스터는 피부 반응과 탄력 관리 관점에서 설명됩니다.\n3. 그래서 상담 전에는 시술명보다 고민 부위와 기대하는 변화의 속도를 먼저 정리해야 합니다.\n4. 회복 기간, 이전 시술 경험, 예민도도 선택 기준에 들어갑니다.\n5. 헷갈린다면 비교표보다 내 피부 기준으로 상담을 받아보는 것이 가장 안전합니다.",
    meta: ["5-post thread", "저장 유도", "짧은 CTA"],
  },
  {
    type: "thread",
    title: "맛집 쓰레드",
    label: "Threads",
    headline: "처음 가는 식당은 메뉴보다 동선을 먼저 봅니다",
    body: "올리디아 상담 전 체크포인트를 짧은 연속 포스트로 쪼개 저장과 공유를 유도합니다.",
    fullContent: "1. 상담 전에는 시술명보다 고민 부위를 먼저 정리하는 것이 좋습니다.\n2. 꺼짐, 잔주름, 탄력 저하는 비슷해 보여도 상담 기준이 달라질 수 있습니다.\n3. 회복 가능한 일정과 이전 시술 경험도 함께 적어두면 설명이 쉬워집니다.\n4. 후기에서 본 표현을 그대로 믿기보다 내 피부 상태와 맞는지 확인해야 합니다.\n5. 헷갈린다면 체크리스트를 저장해두고 상담 때 하나씩 물어보세요.",
    meta: ["올리디아", "저장형", "연속 포스트"],
  },
  {
    type: "thread",
    title: "브랜드 운영 쓰레드",
    label: "Threads",
    headline: "카드뉴스 하나로 끝내지 말고, 블로그와 카페까지 나누세요",
    body: "하나의 캠페인 소재를 채널별 역할로 나눠 재가공하는 운영 팁형 쓰레드입니다.",
    fullContent: "1. 카드뉴스는 관심을 끌고 저장을 만드는 역할에 강합니다.\n2. 블로그는 검색 유입과 긴 설명을 맡기 좋습니다.\n3. 카페 글은 고객이 실제로 묻는 말투에 가깝게 풀어야 반응이 자연스럽습니다.\n4. 쓰레드는 짧은 기준과 비교 포인트를 빠르게 확산시키는 데 유리합니다.\n5. MAKO는 같은 소재를 채널별 역할에 맞게 다시 정리해서 운영 시간을 줄입니다.",
    meta: ["콘텐츠 재가공", "B2B", "운영 팁"],
  },
];

function ExpoPageShell({ eyebrow, title, lead, onBack, children, action }) {
  return (
    <main className="expo-page">
      <header className="expo-header">
        <button className="expo-back" onClick={onBack}>← MAKO Link</button>
        <span>{eyebrow}</span>
      </header>
      <section className="expo-hero">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{lead}</p>
        </div>
        {action}
      </section>
      {children}
    </main>
  );
}

const initialConsultForm = {
  name: "",
  company: "",
  contact: "",
  interest: "콘텐츠 운영 자동화",
  preferredTime: "",
  memo: "",
  consent: false,
};

function ConsultPage({ onBack, onSubmit }) {
  const [form, setForm] = useState(initialConsultForm);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function patchForm(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) {
      setError("이름과 연락처를 입력해주세요.");
      return;
    }
    if (!form.consent) {
      setError("상담 접수를 위해 개인정보 활용 동의가 필요합니다.");
      return;
    }
    const entry = {
      name: form.name.trim(),
      company: form.company.trim(),
      contact: form.contact.trim(),
      interest: form.interest,
      preferredTime: form.preferredTime.trim(),
      memo: form.memo.trim(),
    };
    try {
      setSubmitting(true);
      const saved = await onSubmit(entry);
      setSubmitted(saved);
      setError("");
      setForm(initialConsultForm);
      window.setTimeout(onBack, 900);
    } catch (submitError) {
      setError(submitError.message || "상담 접수 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ExpoPageShell
      eyebrow="BOOKING"
      title="박람회 현장 상담 예약"
      lead="부스에서 만난 팀을 위해 필요한 정보만 빠르게 정리합니다. 제출 전이라도 화면을 보여주며 상담 항목을 함께 체크할 수 있습니다."
      onBack={onBack}
      action={<a className="expo-primary" href="tel:010-9145-5226">바로 전화 상담</a>}
    >
      <section className="consult-layout">
        <form className="expo-form" onSubmit={submit}>
          <label><span>이름</span><input value={form.name} onChange={(event) => patchForm({ name: event.target.value })} placeholder="상담자 이름" /></label>
          <label><span>소속/브랜드</span><input value={form.company} onChange={(event) => patchForm({ company: event.target.value })} placeholder="회사 또는 브랜드명" /></label>
          <label><span>연락처</span><input inputMode="tel" value={form.contact} onChange={(event) => patchForm({ contact: event.target.value })} placeholder="전화번호 또는 이메일" /></label>
          <label><span>관심 항목</span><select value={form.interest} onChange={(event) => patchForm({ interest: event.target.value })}><option>콘텐츠 운영 자동화</option><option>랜딩페이지 제작</option><option>산출물 샘플 제작</option><option>맞춤 툴 제작</option></select></label>
          <label className="is-wide"><span>상담 희망 시간</span><input value={form.preferredTime} onChange={(event) => patchForm({ preferredTime: event.target.value })} placeholder="예: 오늘 15:30, 박람회 종료 후 다음 주" /></label>
          <label className="is-wide"><span>메모</span><textarea value={form.memo} onChange={(event) => patchForm({ memo: event.target.value })} placeholder="현재 운영 중인 채널, 필요한 산출물, 상담에서 확인하고 싶은 내용을 적어주세요." /></label>
          <label className="consent-row">
            <input type="checkbox" checked={form.consent} onChange={(event) => patchForm({ consent: event.target.checked })} />
            <span>상담 접수와 후속 연락을 위한 개인정보 활용에 동의합니다.</span>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          {submitted ? (
            <div className="submit-complete">
              <CheckCircle2 size={20} />
              <div>
                <strong>접수 완료</strong>
                <span>{submitted.id} · 운영 화면에 저장되었습니다.</span>
              </div>
            </div>
          ) : null}
          <button type="submit" className="expo-primary" disabled={submitting}>{submitting ? "저장 중" : "상담 정보 저장"}</button>
        </form>
        <aside className="expo-side-card">
          <strong>상담에서 바로 확인할 내용</strong>
          <ul>
            <li>브랜드 자료 기반 콘텐츠 생성 방식</li>
            <li>카드뉴스, 블로그, 랜딩페이지 산출 범위</li>
            <li>주간/월간 SNS 운영 자동화 흐름</li>
            <li>박람회 이후 도입 상담 일정</li>
          </ul>
        </aside>
      </section>
    </ExpoPageShell>
  );
}

function SamplesPage({ onBack }) {
  const [selectedOutput, setSelectedOutput] = useState(null);
  return (
    <ExpoPageShell
      eyebrow="OUTPUT SHOWCASE"
      title="산출물 예시"
      lead="기능 화면이 아니라 실제 제작된 산출물만 모았습니다. 올리디아 카드뉴스, MAKO 홍보 카드뉴스, 블로그/카페/쓰레드 목업을 상담 자리에서 바로 넘겨볼 수 있습니다."
      onBack={onBack}
      action={<a className="expo-primary" href="/showcase/outputs/mako-promo-cardnews-01.png" target="_blank" rel="noreferrer">대표 카드뉴스 열기</a>}
    >
      <section className="output-summary">
        <article><strong>8세트</strong><span>카드뉴스</span></article>
        <article><strong>41장</strong><span>개별 이미지</span></article>
        <article><strong>3종</strong><span>블로그/카페/쓰레드</span></article>
        <article><strong>2배</strong><span>추가 제작</span></article>
      </section>

      <ShowcaseImageSection
        eyebrow="CARDNEWS"
        title="카드뉴스 산출물"
        lead="올리디아 실제 생성 산출물과 새로 제작한 MAKO 홍보 카드뉴스를 묶음 이미지 없이 개별 슬라이드로 볼 수 있게 정리했습니다."
        items={cardnewsShowcase}
        onSelect={setSelectedOutput}
      />

      <section className="text-output-section">
        <div className="sample-section-head">
          <div>
            <p className="eyebrow">COPY OUTPUTS</p>
            <h2>블로그, 카페, 쓰레드 산출물</h2>
          </div>
          <span>Mockup Preview</span>
        </div>
        <div className="text-output-grid">
          {textShowcase.map((item) => (
            <button className={`text-output-card is-${item.type}`} key={item.title} onClick={() => setSelectedOutput(item)}>
              <div>
                <span>{item.label}</span>
                <strong>{item.title}</strong>
              </div>
              <h3>{item.headline}</h3>
              <p>{item.body}</p>
              <footer>
                {item.meta.map((meta) => <em key={meta}>{meta}</em>)}
              </footer>
            </button>
          ))}
        </div>
      </section>
      {selectedOutput ? <ShowcaseModal item={selectedOutput} onClose={() => setSelectedOutput(null)} /> : null}
    </ExpoPageShell>
  );
}

function ShowcaseImageSection({ eyebrow, title, lead, items, onSelect }) {
  return (
    <section className="sample-section">
      <div className="sample-section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span>{lead}</span>
      </div>
      <div className="sample-grid">
        {items.map((item) => (
          <button className="sample-card" onClick={() => onSelect(item)} key={item.title}>
            <img src={item.slides?.[0] || item.image} alt={item.title} />
            <div>
              <span>{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ShowcaseModal({ item, onClose }) {
  const [index, setIndex] = useState(0);
  const hasSlides = Array.isArray(item.slides) && item.slides.length > 0;
  const slideCount = item.slides?.length || 0;
  const currentSlide = hasSlides ? item.slides[index] : null;

  function move(direction) {
    if (!hasSlides) return;
    setIndex((current) => (current + direction + slideCount) % slideCount);
  }

  return (
    <div className="showcase-modal-backdrop" role="dialog" aria-modal="true">
      <section className={`showcase-modal ${hasSlides ? "is-slides" : "is-text"}`}>
        <header>
          <div>
            <p className="eyebrow">{item.tag || item.label}</p>
            <h2>{item.title}</h2>
          </div>
          <button onClick={onClose}>닫기</button>
        </header>
        {hasSlides ? (
          <>
            <div className="showcase-slide-stage">
              <button aria-label="이전 이미지" onClick={() => move(-1)}>‹</button>
              <img src={currentSlide} alt={`${item.title} ${index + 1}`} />
              <button aria-label="다음 이미지" onClick={() => move(1)}>›</button>
            </div>
            <div className="showcase-slide-footer">
              <span>{index + 1} / {slideCount}</span>
              <a href={currentSlide} target="_blank" rel="noreferrer">원본 열기</a>
            </div>
            <p>{item.text}</p>
          </>
        ) : (
          <article className="showcase-full-copy">
            <h3>{item.headline}</h3>
            {(item.fullContent || item.body).split("\n").map((line) => (
              line.trim() ? <p key={line}>{line}</p> : null
            ))}
          </article>
        )}
      </section>
    </div>
  );
}

function ProposalPage({ onBack, onConsult }) {
  return (
    <ExpoPageShell
      eyebrow="PROPOSAL"
      title="MAKO 도입 제안서"
      lead="브랜드 자료 학습부터 산출물 제작, SNS 운영 자동화까지 박람회 상담에서 바로 설명할 수 있도록 핵심만 압축했습니다."
      onBack={onBack}
      action={<button className="expo-primary" onClick={onConsult}>상담 예약하기</button>}
    >
      <section className="proposal-grid">
        <article><span>01</span><h2>문제</h2><p>일반 AI 콘텐츠는 제품 맥락, 브랜드 톤, 실제 고객 설득 포인트를 놓치기 쉽습니다.</p></article>
        <article><span>02</span><h2>해결</h2><p>MAKO는 브로슈어, 후기, 제품 자료를 학습해 브랜드 맞춤형 콘텐츠 흐름을 만듭니다.</p></article>
        <article><span>03</span><h2>산출물</h2><p>카드뉴스, 블로그, 랜딩페이지, SNS 게시물, 운영 캘린더를 한 패키지로 제공합니다.</p></article>
        <article><span>04</span><h2>운영</h2><p>게시물 반응을 다시 학습해 다음 캠페인의 후킹, 소재, 톤을 개선합니다.</p></article>
      </section>
      <section className="proposal-preview">
        <img src="/showcase/mako-brochure-page1.png" alt="MAKO 제안서 첫 페이지" />
        <img src="/showcase/mako-brochure-page2.png" alt="MAKO 제안서 두 번째 페이지" />
      </section>
    </ExpoPageShell>
  );
}

function EventPage({ onBack, onConsult }) {
  return (
    <ExpoPageShell
      eyebrow="BETA EVENT"
      title="6월 5일까지 베타 신청 이벤트"
      lead="박람회 기간과 초기 베타 신청 팀에게 MAKO 도입 컨설팅과 브랜드 맞춤형 제작 지원을 함께 제공합니다."
      onBack={onBack}
      action={<button className="expo-primary" onClick={onConsult}>베타 상담 신청</button>}
    >
      <section className="event-detail-hero">
        <img src={betaEvent.detailImage} alt="MAKO 베타 신청 이벤트 안내" />
      </section>
      <section className="event-benefit-grid">
        <article>
          <span>01</span>
          <h2>무료 컨설팅</h2>
          <p>브랜드 자료, 현재 운영 채널, 필요한 산출물을 기준으로 첫 캠페인 구조와 실행 우선순위를 정리합니다.</p>
        </article>
        <article>
          <span>02</span>
          <h2>맞춤형 제작비 지원</h2>
          <p>초기 베타 팀은 랜딩페이지, 카드뉴스, 블로그, 카페, 쓰레드 제작 범위를 검토해 제작비 일부를 지원받을 수 있습니다.</p>
        </article>
        <article>
          <span>03</span>
          <h2>산출물 패키지 제안</h2>
          <p>단순 상담에서 끝내지 않고 브랜드별 후킹, 콘텐츠 흐름, 채널별 원고까지 바로 검토 가능한 형태로 제안합니다.</p>
        </article>
      </section>
      <section className="event-steps">
        <div>
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>신청 후 진행 방식</h2>
        </div>
        <ol>
          <li><strong>베타 신청</strong><span>상담 예약 또는 현장 QR로 신청 정보를 남깁니다.</span></li>
          <li><strong>자료 확인</strong><span>브랜드 소개서, 제품 자료, 기존 콘텐츠를 기준으로 필요한 제작 범위를 확인합니다.</span></li>
          <li><strong>컨설팅 진행</strong><span>무료 컨설팅에서 랜딩/콘텐츠/운영 자동화 방향을 정리합니다.</span></li>
          <li><strong>맞춤 제작 제안</strong><span>지원 가능 범위와 제작 일정, 우선 제작 산출물을 안내합니다.</span></li>
        </ol>
      </section>
    </ExpoPageShell>
  );
}

function BetaEventPopup({ onClose, onDetail, onApply }) {
  return (
    <div className="event-popup-backdrop" role="dialog" aria-modal="true" aria-label="MAKO 베타 신청 이벤트">
      <section className="event-popup">
        <button type="button" className="event-popup-close" aria-label="닫기" onClick={onClose}><X size={18} /></button>
        <img src={betaEvent.popupImage} alt="6월 5일까지 MAKO 베타 신청 이벤트" />
        <div className="event-popup-copy">
          <span><Gift size={15} /> {betaEvent.deadline}까지</span>
          <h2>베타 신청 팀에게 무료 컨설팅과 맞춤형 제작비 지원을 제공합니다.</h2>
          <p>브랜드 자료를 바탕으로 랜딩페이지, 카드뉴스, 블로그, 카페, 쓰레드까지 실제 운영 가능한 산출물 방향을 함께 잡아드립니다.</p>
          <div>
            <button type="button" onClick={onApply}>지금 신청하기</button>
            <button type="button" onClick={onDetail}>상세 안내 보기</button>
          </div>
        </div>
      </section>
    </div>
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
  if (type === "images") return <Images size={17} />;
  if (type === "file") return <FileText size={17} />;
  if (type === "calendar") return <CalendarDays size={17} />;
  return <Link2 size={17} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
