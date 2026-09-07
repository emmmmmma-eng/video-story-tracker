import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Clapperboard,
  Download,
  FileText,
  Filter,
  Flame,
  FolderOpen,
  Hash,
  LayoutDashboard,
  Lightbulb,
  Menu,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Settings2,
  Share2,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

type View = "overview" | "records" | "accounts" | "patterns";

type Entry = {
  id: string;
  account: string;
  title: string;
  views: string;
  likes: string;
  comments: string;
  saves: string;
  shares: string;
  hookType: string;
  contrastStructure: string;
  endingType: string;
  contentType: string;
  script: string;
  notes: string;
  createdAt: string;
};

type Ranking = { type: string; avg: number; count: number };

const HOOK_TYPES = ["身份反差", "結果先丟一半", "懸念提問", "數字/戲劇性開場", "畫面衝擊", "其他"];
const ENDING_TYPES = ["金句昇華", "遺憾/來不及", "留言引導", "私訊/導流", "開放式留白", "其他"];
const CONTENT_TYPES = ["故事型", "業配", "教學/知識型", "生活日常", "其他"];
const STORAGE_KEY = "story-structure-tracker-v1";

const FIELD_ALIASES: Record<keyof Pick<Entry, "account" | "title" | "views" | "likes" | "comments" | "saves" | "shares" | "hookType" | "endingType" | "contentType" | "contrastStructure" | "script" | "notes">, string[]> = {
  account: ["帳號"],
  title: ["影片標題", "標題", "主題", "影片標題／主題", "影片標題/主題"],
  views: ["觀看數"],
  likes: ["讚數"],
  comments: ["留言數"],
  saves: ["收藏數"],
  shares: ["分享數"],
  hookType: ["開頭鉤子類型", "鉤子類型", "開頭鉤子"],
  endingType: ["結尾手法"],
  contentType: ["內容類型", "類型"],
  contrastStructure: ["反差結構"],
  script: ["文案", "逐字稿", "腳本", "字幕文案", "完整文案"],
  notes: ["拆解筆記", "筆記"],
};

function makeId() {
  return `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyEntry(): Entry {
  return {
    id: makeId(),
    account: "",
    title: "",
    views: "",
    likes: "",
    comments: "",
    saves: "",
    shares: "",
    hookType: HOOK_TYPES[0],
    contrastStructure: "",
    endingType: ENDING_TYPES[0],
    contentType: CONTENT_TYPES[0],
    script: "",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

const demoEntries: Entry[] = [
  {
    ...emptyEntry(),
    id: "demo_1",
    account: "free__10.23",
    title: "我用七年時間送別無數媽媽",
    views: "172000",
    likes: "3775",
    comments: "118",
    saves: "640",
    shares: "58",
    hookType: "身份反差",
    contrastStructure: "送別別人的媽媽 vs 送不走自己的媽媽",
    endingType: "遺憾/來不及",
    contentType: "故事型",
    script: "我花 7 年的時間，送別很多媽媽。\n我 18 歲進入殯葬業，見過好多家庭最後一面。\n但那天輪到自己的媽媽，我才發現原來最難送走的人，是我最想留住的人。",
    notes: "前 3 秒用職業身份建立可信度，中段換成自己的故事，情緒落差很強。",
    createdAt: "2026-09-07T09:30:00.000Z",
  },
  {
    ...emptyEntry(),
    id: "demo_2",
    account: "slowdays.tw",
    title: "你以為我在偷懶，其實我在恢復",
    views: "86400",
    likes: "5120",
    comments: "206",
    saves: "1880",
    shares: "344",
    hookType: "結果先丟一半",
    contrastStructure: "看起來停滯不前 vs 正在重新蓄力",
    endingType: "金句昇華",
    contentType: "生活日常",
    script: "今天沒有完成任何一件大事。\n但我把窗簾拉開、煮了一頓飯，也終於睡滿八個小時。\n有時候，休息不是偏離軌道，是讓自己回到軌道。",
    notes: "收藏率很高，適合做成系列；金句要留白 1 秒讓觀眾消化。",
    createdAt: "2026-09-05T12:20:00.000Z",
  },
  {
    ...emptyEntry(),
    id: "demo_3",
    account: "thecoachlab",
    title: "真正有效的自律，第一步不是早起",
    views: "42300",
    likes: "2890",
    comments: "98",
    saves: "920",
    shares: "171",
    hookType: "懸念提問",
    contrastStructure: "大家以為的自律 vs 可持續的自律",
    endingType: "留言引導",
    contentType: "教學/知識型",
    script: "你以為自律的第一步是早起嗎？\n其實是先把明天要做的事，縮小到小得不能失敗。\n你今天願意先完成哪一件？留言告訴我。",
    notes: "提問開頭帶來停留，結尾 CTA 自然；可觀察留言的問題類型。",
    createdAt: "2026-09-02T16:45:00.000Z",
  },
];

function toNum(value: string | number) {
  const parsed = Number.parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function engagementScore(entry: Entry) {
  const views = toNum(entry.views);
  if (!views) return 0;
  const weighted = toNum(entry.saves) * 3 + toNum(entry.shares) * 3 + toNum(entry.comments) * 2 + toNum(entry.likes);
  return (weighted / views) * 1000;
}

function formatMetric(value: string | number) {
  const number = toNum(value);
  if (!number) return "—";
  return new Intl.NumberFormat("zh-TW", { notation: number >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(number);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", { month: "short", day: "numeric" }).format(new Date(value));
}

function parsePastedBlock(text: string): Partial<Entry> {
  const result: Partial<Entry> = {};
  let currentKey: keyof Entry | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(/^[*\-•]?\s*\**([^:：]+)\**\s*[:：]\s*(.*)$/);
    if (match) {
      const label = match[1].replace(/\*/g, "").trim();
      const value = match[2].trim();
      const matchedKey = (Object.entries(FIELD_ALIASES) as [keyof Entry, string[]][]).find(([, aliases]) => aliases.some((alias) => label.includes(alias)))?.[0] ?? null;
      if (matchedKey) {
        currentKey = matchedKey;
        result[matchedKey] = `${result[matchedKey] ?? ""}${result[matchedKey] ? "\n" : ""}${value}`;
      } else {
        currentKey = null;
      }
    } else if (currentKey && ["notes", "contrastStructure", "script"].includes(currentKey)) {
      if (line !== "```") result[currentKey] = `${result[currentKey] ?? ""}${result[currentKey] ? "\n" : ""}${line}`;
    }
  }
  return result;
}

function rankEntries(entries: Entry[], field: keyof Entry): Ranking[] {
  const buckets: Record<string, { total: number; count: number }> = {};
  entries.forEach((entry) => {
    const key = String(entry[field] || "（未填寫）");
    buckets[key] ??= { total: 0, count: 0 };
    buckets[key].total += engagementScore(entry);
    buckets[key].count += 1;
  });
  return Object.entries(buckets).map(([type, value]) => ({ type, avg: value.total / value.count, count: value.count })).sort((a, b) => b.avg - a.avg);
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`field ${wide ? "field-wide" : ""}`}><span>{label}</span>{children}</label>;
}

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "orange" | "blue" | "green" }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

function ScorePill({ score, large = false }: { score: number; large?: boolean }) {
  return <span className={`score-pill ${large ? "score-pill-large" : ""}`}><TrendingUp size={large ? 15 : 13} /> {score.toFixed(1)}</span>;
}

function StatCard({ icon: Icon, label, value, detail, accent }: { icon: LucideIcon; label: string; value: string; detail: string; accent: string }) {
  return <div className="stat-card">
    <div className="stat-top"><span className={`stat-icon ${accent}`}><Icon size={17} /></span><span className="stat-label">{label}</span></div>
    <div className="stat-value">{value}</div>
    <div className="stat-detail">{detail}</div>
  </div>;
}

function RankingBars({ title, ranking, icon: Icon, compact = false }: { title: string; ranking: Ranking[]; icon: LucideIcon; compact?: boolean }) {
  const max = ranking[0]?.avg || 1;
  return <section className={`ranking-card ${compact ? "ranking-card-compact" : ""}`}>
    <div className="section-title-row"><div><div className="eyebrow"><Icon size={13} /> PATTERN SIGNAL</div><h3>{title}</h3></div><BarChart3 size={18} className="muted-icon" /></div>
    <div className="ranking-list">
      {ranking.length === 0 ? <div className="empty-mini">還沒有足夠資料可分析</div> : ranking.slice(0, compact ? 3 : 6).map((item, index) => <div className="ranking-row" key={item.type}>
        <div className="ranking-meta"><span className="ranking-name"><span className={`ranking-number ${index === 0 ? "is-first" : ""}`}>{index + 1}</span>{item.type}</span><span><b>{item.avg.toFixed(1)}</b> <small>／ {item.count} 支</small></span></div>
        <div className="bar-track"><span style={{ width: `${Math.max(10, (item.avg / max) * 100)}%` }} /></div>
      </div>)}
    </div>
  </section>;
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>("records");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [form, setForm] = useState<Entry>(emptyEntry());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [notice, setNotice] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [recordAccountFilter, setRecordAccountFilter] = useState("__all__");
  const [patternAccountFilter, setPatternAccountFilter] = useState("__all__");
  const [patternTypeFilter, setPatternTypeFilter] = useState("__all__");
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setEntries(stored ? JSON.parse(stored) : demoEntries);
      if (!stored) localStorage.setItem(STORAGE_KEY, JSON.stringify(demoEntries));
    } catch {
      setEntries(demoEntries);
    } finally {
      setLoading(false);
    }
  }, []);

  const accounts = useMemo(() => Array.from(new Set(entries.map((entry) => entry.account).filter(Boolean))).sort(), [entries]);
  const contentTypes = useMemo(() => Array.from(new Set(entries.map((entry) => entry.contentType).filter(Boolean))).sort(), [entries]);
  const totalViews = useMemo(() => entries.reduce((sum, entry) => sum + toNum(entry.views), 0), [entries]);
  const averageScore = entries.length ? entries.reduce((sum, entry) => sum + engagementScore(entry), 0) / entries.length : 0;
  const hookRanking = useMemo(() => rankEntries(entries.filter((entry) => patternAccountFilter === "__all__" || entry.account === patternAccountFilter).filter((entry) => patternTypeFilter === "__all__" || entry.contentType === patternTypeFilter), "hookType"), [entries, patternAccountFilter, patternTypeFilter]);
  const endingRanking = useMemo(() => rankEntries(entries.filter((entry) => patternAccountFilter === "__all__" || entry.account === patternAccountFilter).filter((entry) => patternTypeFilter === "__all__" || entry.contentType === patternTypeFilter), "endingType"), [entries, patternAccountFilter, patternTypeFilter]);
  const typeRanking = useMemo(() => rankEntries(entries.filter((entry) => patternAccountFilter === "__all__" || entry.account === patternAccountFilter), "contentType"), [entries, patternAccountFilter]);
  const topEntry = [...entries].sort((a, b) => engagementScore(b) - engagementScore(a))[0];
  const filteredRecords = entries.filter((entry) => {
    const query = recordSearch.toLowerCase();
    return (recordAccountFilter === "__all__" || entry.account === recordAccountFilter) && (!query || `${entry.account} ${entry.title} ${entry.contentType} ${entry.hookType}`.toLowerCase().includes(query));
  });

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => current === message ? "" : current), 2800);
  }

  function updateField(key: keyof Entry, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openNewRecord() {
    setForm(emptyEntry());
    setEditingId(null);
    setShowPaste(false);
    setPasteText("");
    setActiveView("records");
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyPaste() {
    if (!pasteText.trim()) return;
    const parsed = parsePastedBlock(pasteText);
    setForm((current) => ({ ...current, ...parsed }));
    setPasteText("");
    setShowPaste(false);
    notify("資料已解析，請確認欄位後儲存");
  }

  function persist(next: Entry[]) {
    setEntries(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* local-only fallback */ }
  }

  function saveRecord(event: React.FormEvent) {
    event.preventDefault();
    if (!form.account.trim()) {
      notify("請至少填寫帳號");
      return;
    }
    if (editingId) {
      persist(entries.map((entry) => entry.id === editingId ? { ...form, id: editingId } : entry));
      notify("紀錄已更新");
    } else {
      persist([{ ...form, id: makeId(), createdAt: new Date().toISOString() }, ...entries]);
      notify("紀錄已儲存");
    }
    setForm(emptyEntry());
    setEditingId(null);
  }

  function editRecord(entry: Entry) {
    setForm({ ...entry });
    setEditingId(entry.id);
    setShowPaste(false);
    setActiveView("records");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteRecord(id: string) {
    if (!window.confirm("確定要刪除這筆拆解紀錄嗎？")) return;
    persist(entries.filter((entry) => entry.id !== id));
    if (editingId === id) { setEditingId(null); setForm(emptyEntry()); }
    notify("紀錄已刪除");
  }

  function exportRecords() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `story-structure-records-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify("已匯出 JSON 紀錄");
  }

  function navigate(view: View) {
    setActiveView(view);
    setMobileNavOpen(false);
    if (view !== "accounts") { setSelectedAccount(null); setSelectedEntry(null); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const navItems: { key: View; label: string; icon: LucideIcon; hint: string }[] = [
    { key: "overview", label: "總覽儀表板", icon: LayoutDashboard, hint: "Overview" },
    { key: "records", label: "影片紀錄", icon: Clapperboard, hint: `${entries.length} 筆資料` },
    { key: "accounts", label: "帳號總覽", icon: Users, hint: `${accounts.length} 個帳號` },
    { key: "patterns", label: "規律分析", icon: BarChart3, hint: "找出高互動結構" },
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
      <div className="brand-block">
        <div className="brand-mark"><Clapperboard size={20} /></div>
        <div><div className="brand-name">Story<span>Lab</span></div><div className="brand-sub">短影音拆解工作台</div></div>
        <button className="mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="關閉選單"><X size={18} /></button>
      </div>
      <div className="workspace-switcher"><div className="workspace-avatar">S</div><div><div className="workspace-name">我的內容資料庫</div><div className="workspace-meta">Personal workspace</div></div><ChevronDown size={14} /></div>
      <div className="nav-label">工作區</div>
      <nav className="side-nav">
        {navItems.map(({ key, label, icon: Icon, hint }) => <button className={`nav-item ${activeView === key ? "nav-item-active" : ""}`} key={key} onClick={() => navigate(key)}><Icon size={18} /><span><b>{label}</b><small>{hint}</small></span>{activeView === key && <span className="nav-active-dot" />}</button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-tip"><div className="tip-icon"><Lightbulb size={15} /></div><div><b>拆解小提醒</b><p>記錄「為什麼有效」，比記錄數字更有價值。</p></div></div>
      <div className="sidebar-footer"><div className="local-status"><span className="status-dot" />資料只儲存在本機</div><button className="settings-button" aria-label="設定"><Settings2 size={17} /></button></div>
    </aside>
    {mobileNavOpen && <button className="sidebar-scrim" onClick={() => setMobileNavOpen(false)} aria-label="關閉側邊欄" />}

    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="開啟選單"><Menu size={20} /></button><div className="topbar-crumb"><span>StoryLab</span><ChevronRight size={14} /><b>{navItems.find((item) => item.key === activeView)?.label}</b></div><div className="topbar-actions"><button className="icon-action" onClick={exportRecords} title="匯出紀錄"><Download size={17} /></button><button className="primary-button top-add" onClick={openNewRecord}><Plus size={17} /> 新增拆解</button></div></header>

      {notice && <div className="notice"><Check size={15} />{notice}</div>}

      {activeView === "overview" && <div className="page-wrap page-enter">
        <div className="page-heading"><div><div className="eyebrow"><Sparkles size={14} /> CONTENT INTELLIGENCE</div><h1>把每一次拆解，變成下一支影片的底氣。</h1><p>從故事結構到互動數據，StoryLab 幫你看見內容真正有效的地方。</p></div><button className="secondary-button" onClick={() => navigate("patterns")}><BarChart3 size={16} /> 查看規律分析</button></div>
        <section className="hero-panel"><div className="hero-copy"><div className="hero-kicker"><span className="pulse-dot" /> 本週內容觀察</div><h2>{topEntry ? <>你的高互動密碼，<em>正在浮現。</em></> : <>先記下一支影片，<em>讓洞察開始累積。</em></>}</h2><p>{topEntry ? `目前「${topEntry.hookType}」開場表現最好，平均互動分數 ${hookRanking[0]?.avg.toFixed(1) ?? "0.0"}。繼續保持這個觀察角度。` : "每一次紀錄，都是替下一次創作留下線索。"}</p><button className="hero-button" onClick={openNewRecord}>{entries.length ? "新增一筆拆解" : "開始第一筆拆解"}<ArrowDownRight size={17} /></button></div><div className="hero-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-core"><Clapperboard size={28} /><span>STORY<br />LAB</span></div><div className="orbit-chip chip-one"><TrendingUp size={13} /> +38%</div><div className="orbit-chip chip-two"><MessageCircle size={13} /> 互動</div></div></section>
        <div className="stats-grid"><StatCard icon={FileText} label="已拆解影片" value={String(entries.length).padStart(2, "0")} detail="持續累積中" accent="accent-orange" /><StatCard icon={Users} label="追蹤帳號" value={String(accounts.length).padStart(2, "0")} detail="個內容來源" accent="accent-blue" /><StatCard icon={TrendingUp} label="平均互動分數" value={averageScore.toFixed(1)} detail="收藏・分享加權" accent="accent-green" /><StatCard icon={Flame} label="最高分開場" value={hookRanking[0]?.type ?? "—"} detail={hookRanking[0] ? `${hookRanking[0].avg.toFixed(1)} 分平均` : "等待更多資料"} accent="accent-purple" /></div>
        <div className="dashboard-grid"><section className="panel recent-panel"><div className="panel-heading"><div><div className="eyebrow">LATEST NOTES</div><h3>最近拆解</h3></div><button className="text-button" onClick={() => navigate("records")}>查看全部 <ChevronRight size={14} /></button></div>{loading ? <div className="loading-state">載入紀錄中…</div> : entries.slice(0, 4).map((entry) => <RecordRow key={entry.id} entry={entry} onClick={() => { setActiveView("records"); setExpandedId(entry.id); }} />)}</section><div className="dashboard-side"><RankingBars title="最有感的開頭" ranking={hookRanking} icon={Hash} compact /><section className="quote-card"><div className="quote-mark">“</div><p>好的拆解不是複製答案，而是找到可重複的提問方式。</p><span>— StoryLab note 001</span></section></div></div>
      </div>}

      {activeView === "records" && <div className="page-wrap page-enter"><div className="page-heading"><div><div className="eyebrow"><Clapperboard size={14} /> RECORDS LIBRARY</div><h1>故事結構追蹤表</h1><p>每次拆解一支影片就記一筆，累積夠多之後就能看出哪種鉤子、哪種結尾方式互動表現最好。</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => setShowPaste((current) => !current)}><ClipboardPaste size={16} /> 貼上整段資料</button><button className="primary-button" onClick={openNewRecord}><Plus size={17} /> 新增紀錄</button></div></div><div className="mobile-tabs">{([['records','影片紀錄'],['accounts','帳號總覽'],['patterns','規律分析']] as [View,string][]).map(([key,label]) => <button key={key} className={activeView === key ? 'mobile-tab-active' : ''} onClick={() => navigate(key)}>{label}</button>)}</div>
        <section className={`record-form-card ${editingId ? "is-editing" : ""}`}><div className="form-card-heading"><div><div className="eyebrow">{editingId ? "EDIT RECORD" : "NEW RECORD"}</div><h2>{editingId ? "編輯這筆拆解" : "新增一筆拆解紀錄"}</h2></div><div className="form-heading-actions"><button className="form-paste-button" type="button" onClick={() => setShowPaste((current) => !current)}><ClipboardPaste size={15} /> {showPaste ? "收起貼上區" : "貼上整段資料自動帶入"}</button>{editingId && <button className="text-button" onClick={() => { setEditingId(null); setForm(emptyEntry()); }}>取消編輯 <X size={14} /></button>}</div></div>{showPaste && <div className="paste-box"><div className="paste-heading"><div className="paste-icon"><ClipboardPaste size={16} /></div><div><b>快速帶入整段資料</b><p>把「帳號：… 觀看數：…」格式的文字貼上，系統會自動配對欄位。</p></div></div><textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={'帳號：free__10.23\n影片標題：我用七年時間送別無數媽媽\n觀看數：172000\n讚數：3775\n開頭鉤子類型：身份反差\n結尾手法：遺憾/來不及\n內容類型：故事型\n反差結構：送別別人的媽媽 vs 送不走自己的媽媽\n文案：我花 7 年的時間…'} /><button className="secondary-button small-button" onClick={applyPaste}><Sparkles size={14} /> 解析並帶入表單</button></div>}
          <form onSubmit={saveRecord}><div className="form-section-label"><span>01</span> 基本資料</div><div className="form-grid form-grid-two"><Field label="帳號 *"><input value={form.account} onChange={(event) => updateField("account", event.target.value)} placeholder="例如 free__10.23" /></Field><Field label="影片標題／主題"><input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="例如：媽媽過世的故事" /></Field></div><div className="form-section-label"><span>02</span> 互動數據 <small>數字會自動轉成互動分數</small></div><div className="metric-grid"><Field label="觀看數"><input inputMode="numeric" value={form.views} onChange={(event) => updateField("views", event.target.value)} placeholder="0" /></Field><Field label="讚數"><input inputMode="numeric" value={form.likes} onChange={(event) => updateField("likes", event.target.value)} placeholder="0" /></Field><Field label="留言數"><input inputMode="numeric" value={form.comments} onChange={(event) => updateField("comments", event.target.value)} placeholder="0" /></Field><Field label="收藏數"><input inputMode="numeric" value={form.saves} onChange={(event) => updateField("saves", event.target.value)} placeholder="0" /></Field><Field label="分享數"><input inputMode="numeric" value={form.shares} onChange={(event) => updateField("shares", event.target.value)} placeholder="0" /></Field><div className="live-score"><span>LIVE SCORE</span><strong>{engagementScore(form).toFixed(1)}</strong><small>互動分數</small></div></div><div className="form-section-label"><span>03</span> 結構拆解</div><div className="form-grid form-grid-three"><Field label="開頭鉤子類型"><select value={form.hookType} onChange={(event) => updateField("hookType", event.target.value)}>{HOOK_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="結尾手法"><select value={form.endingType} onChange={(event) => updateField("endingType", event.target.value)}>{ENDING_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="內容類型"><select value={form.contentType} onChange={(event) => updateField("contentType", event.target.value)}>{CONTENT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field></div><div className="form-grid form-grid-two"><Field label="反差結構"><input value={form.contrastStructure} onChange={(event) => updateField("contrastStructure", event.target.value)} placeholder="例如：看似 A，其實是 B" /></Field><Field label="拆解筆記"><input value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="這支影片為什麼有效？" /></Field></div><Field label="完整文案／逐字稿" wide><textarea className="script-textarea" value={form.script} onChange={(event) => updateField("script", event.target.value)} placeholder="貼上完整文案，之後回看時更容易找出故事節點…" /></Field><div className="form-submit-row"><span><Save size={14} /> {editingId ? "更新後會保留原始建立日期" : "紀錄會儲存在你的瀏覽器"}</span><button className="primary-button" type="submit"><Save size={16} /> {editingId ? "儲存變更" : "新增紀錄"}</button></div></form>
        </section>
        <section className="records-library"><div className="library-heading"><div><div className="eyebrow">YOUR LIBRARY</div><h2>已記錄 <span>{entries.length}</span> 支影片</h2></div><div className="library-tools"><div className="search-box"><Search size={15} /><input value={recordSearch} onChange={(event) => setRecordSearch(event.target.value)} placeholder="搜尋標題、帳號…" /></div><select value={recordAccountFilter} onChange={(event) => setRecordAccountFilter(event.target.value)}><option value="__all__">全部帳號</option>{accounts.map((account) => <option key={account}>{account}</option>)}</select></div></div>{loading ? <div className="empty-state">載入紀錄中…</div> : filteredRecords.length === 0 ? <div className="empty-state"><FolderOpen size={27} /><b>找不到符合的紀錄</b><p>試試看調整搜尋關鍵字或篩選條件。</p></div> : <div className="records-list">{filteredRecords.map((entry) => <RecordCard key={entry.id} entry={entry} expanded={expandedId === entry.id} onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)} onEdit={() => editRecord(entry)} onDelete={() => deleteRecord(entry.id)} />)}</div>}</section>
      </div>}

      {activeView === "accounts" && <div className="page-wrap page-enter"><div className="page-heading"><div><div className="eyebrow"><Users size={14} /> ACCOUNT INTELLIGENCE</div><h1>帳號總覽</h1><p>用每個帳號自己的節奏，看見內容優勢。</p></div></div><div className="mobile-tabs">{([['records','影片紀錄'],['accounts','帳號總覽'],['patterns','規律分析']] as [View,string][]).map(([key,label]) => <button key={key} className={activeView === key ? 'mobile-tab-active' : ''} onClick={() => navigate(key)}>{label}</button>)}</div>{!accounts.length ? <div className="empty-state large-empty"><Users size={34} /><b>還沒有帳號資料</b><p>先到「影片紀錄」新增第一筆，這裡會自動整理。</p><button className="primary-button" onClick={openNewRecord}><Plus size={16} /> 新增第一筆</button></div> : selectedAccount ? <AccountDetail account={selectedAccount} entries={entries.filter((entry) => entry.account === selectedAccount)} selectedEntry={selectedEntry} setSelectedEntry={setSelectedEntry} onBack={() => { setSelectedAccount(null); setSelectedEntry(null); }} /> : <div className="account-grid">{accounts.map((account) => { const accountEntries = entries.filter((entry) => entry.account === account); const avg = accountEntries.reduce((sum, entry) => sum + engagementScore(entry), 0) / accountEntries.length; const best = [...accountEntries].sort((a, b) => engagementScore(b) - engagementScore(a))[0]; return <button className="account-card" key={account} onClick={() => setSelectedAccount(account)}><div className="account-card-top"><div className="account-avatar">{account.slice(0, 1).toUpperCase()}</div><ChevronRight size={18} className="account-arrow" /></div><h3>{account}</h3><div className="account-card-stats"><span><b>{accountEntries.length}</b> 支影片</span><span><b>{avg.toFixed(1)}</b> 平均分</span></div><div className="account-best"><Star size={13} /> 最佳：{best?.title || "未命名影片"}</div></button>; })}</div>}</div>}

      {activeView === "patterns" && <div className="page-wrap page-enter"><div className="page-heading"><div><div className="eyebrow"><BarChart3 size={14} /> PATTERN ANALYSIS</div><h1>規律分析</h1><p>把直覺變成可重複的內容策略。</p></div><div className="heading-filter"><Filter size={15} /><select value={patternAccountFilter} onChange={(event) => setPatternAccountFilter(event.target.value)}><option value="__all__">所有帳號</option>{accounts.map((account) => <option key={account}>{account}</option>)}</select><select value={patternTypeFilter} onChange={(event) => setPatternTypeFilter(event.target.value)}><option value="__all__">所有內容類型</option>{contentTypes.map((type) => <option key={type}>{type}</option>)}</select></div></div><div className="mobile-tabs">{([['records','影片紀錄'],['accounts','帳號總覽'],['patterns','規律分析']] as [View,string][]).map(([key,label]) => <button key={key} className={activeView === key ? 'mobile-tab-active' : ''} onClick={() => navigate(key)}>{label}</button>)}</div><div className="analysis-callout"><div className="callout-icon"><Lightbulb size={19} /></div><div><b>{hookRanking[0] ? `「${hookRanking[0].type}」是目前最有感的開場。` : "再多記錄幾支影片，就能看見第一個訊號。"}</b><p>{hookRanking[0] ? `平均互動分數 ${hookRanking[0].avg.toFixed(1)}，來自 ${hookRanking[0].count} 支影片。這是一個值得持續測試的方向。` : "分析會隨著你的紀錄自動更新，不需要另外整理表格。"}</p></div><span className="callout-badge">INSIGHT 01</span></div><div className="analysis-grid"><RankingBars title="開頭鉤子類型 × 平均互動分數" ranking={hookRanking} icon={Hash} /><RankingBars title="結尾手法 × 平均互動分數" ranking={endingRanking} icon={Send} /><RankingBars title="內容類型 × 平均互動分數" ranking={typeRanking} icon={BookOpen} /></div><section className="top-performers"><div className="panel-heading"><div><div className="eyebrow">TOP PERFORMERS</div><h3>高互動影片</h3></div><span className="muted-caption">依互動分數排序</span></div><div className="performer-grid">{[...entries].sort((a, b) => engagementScore(b) - engagementScore(a)).slice(0, 5).map((entry, index) => <div className="performer-row" key={entry.id}><span className="performer-rank">0{index + 1}</span><div className="performer-main"><b>{entry.title || "（未命名影片）"}</b><span>{entry.account} · {entry.hookType} → {entry.endingType}</span></div><ScorePill score={engagementScore(entry)} large /></div>)}</div></section></div>}
    </main>
  </div>;
}

function RecordRow({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  return <button className="record-row" onClick={onClick}><div className="record-thumb"><Clapperboard size={17} /></div><div className="record-row-main"><b>{entry.title || "（未命名影片）"}</b><span>{entry.account} · {formatDate(entry.createdAt)}</span></div><Tag tone="orange">{entry.hookType}</Tag><ScorePill score={engagementScore(entry)} /><ChevronRight size={16} className="row-arrow" /></button>;
}

function RecordCard({ entry, expanded, onToggle, onEdit, onDelete }: { entry: Entry; expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return <article className={`record-card ${expanded ? "record-card-expanded" : ""}`}><div className="record-card-main"><button className="record-card-info" onClick={onToggle}><div className="record-card-icon"><Clapperboard size={18} /></div><div className="record-card-title"><div className="record-title-line"><b>{entry.account || "未命名帳號"}</b>{entry.title && <span>／ {entry.title}</span>}</div><div className="record-subline"><Tag>{entry.contentType}</Tag><span>{entry.hookType} <ArrowDownRight size={11} /> {entry.endingType}</span><span className="record-date">{formatDate(entry.createdAt)}</span></div></div></button><div className="record-card-score"><ScorePill score={engagementScore(entry)} /><button className="more-toggle" onClick={onToggle} aria-label="切換詳情">{expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</button></div></div>{expanded && <div className="record-detail"><div className="detail-metrics"><div><span>觀看</span><b>{formatMetric(entry.views)}</b></div><div><span>讚</span><b>{formatMetric(entry.likes)}</b></div><div><span>留言</span><b>{formatMetric(entry.comments)}</b></div><div><span>收藏</span><b>{formatMetric(entry.saves)}</b></div><div><span>分享</span><b>{formatMetric(entry.shares)}</b></div></div><div className="detail-columns">{entry.contrastStructure && <div><span className="detail-label">反差結構</span><p>{entry.contrastStructure}</p></div>}{entry.script && <div><span className="detail-label">完整文案／逐字稿</span><p className="pre-wrap">{entry.script}</p></div>}{entry.notes && <div><span className="detail-label">拆解筆記</span><p>{entry.notes}</p></div>}</div><div className="detail-actions"><button className="ghost-button blue" onClick={onEdit}><Pencil size={14} /> 編輯</button><button className="ghost-button red" onClick={onDelete}><Trash2 size={14} /> 刪除</button></div></div>}</article>;
}

function AccountDetail({ account, entries, selectedEntry, setSelectedEntry, onBack }: { account: string; entries: Entry[]; selectedEntry: string | null; setSelectedEntry: (id: string | null) => void; onBack: () => void }) {
  const avg = entries.reduce((sum, entry) => sum + engagementScore(entry), 0) / entries.length;
  const hook = rankEntries(entries, "hookType");
  const ending = rankEntries(entries, "endingType");
  const selected = entries.find((entry) => entry.id === selectedEntry);
  return <div className="account-detail"><button className="back-button" onClick={onBack}><ArrowLeft size={15} /> 返回帳號列表</button><div className="account-detail-heading"><div><div className="account-heading-avatar">{account.slice(0, 1).toUpperCase()}</div><div className="eyebrow">ACCOUNT PROFILE</div><h2>{account}</h2><p>{entries.length} 支影片 · 平均互動分數 {avg.toFixed(1)}</p></div><div className="account-highlight"><span>BEST SCORE</span><b>{Math.max(...entries.map(engagementScore)).toFixed(1)}</b></div></div>{selected ? <div className="selected-entry panel"><button className="back-button" onClick={() => setSelectedEntry(null)}><ArrowLeft size={15} /> 返回影片列表</button><h3>{selected.title || "（未命名影片）"}</h3><div className="record-subline"><Tag tone="orange">{selected.hookType}</Tag><span>{selected.endingType}</span><ScorePill score={engagementScore(selected)} /></div><div className="detail-metrics"><div><span>觀看</span><b>{formatMetric(selected.views)}</b></div><div><span>讚</span><b>{formatMetric(selected.likes)}</b></div><div><span>留言</span><b>{formatMetric(selected.comments)}</b></div><div><span>收藏</span><b>{formatMetric(selected.saves)}</b></div><div><span>分享</span><b>{formatMetric(selected.shares)}</b></div></div><div className="selected-copy">{selected.contrastStructure && <div><span className="detail-label">反差結構</span><p>{selected.contrastStructure}</p></div>}{selected.script && <div><span className="detail-label">完整文案／逐字稿</span><p className="pre-wrap">{selected.script}</p></div>}{selected.notes && <div><span className="detail-label">拆解筆記</span><p>{selected.notes}</p></div>}</div></div> : <><div className="account-rankings"><RankingBars title="開頭鉤子" ranking={hook} icon={Hash} compact /><RankingBars title="結尾手法" ranking={ending} icon={Send} compact /></div><section className="panel account-videos"><div className="panel-heading"><div><div className="eyebrow">ALL VIDEOS</div><h3>所有影片</h3></div><span className="muted-caption">點擊查看詳情</span></div>{[...entries].sort((a, b) => engagementScore(b) - engagementScore(a)).map((entry) => <button className="account-video-row" key={entry.id} onClick={() => setSelectedEntry(entry.id)}><div><b>{entry.title || "（未命名影片）"}</b><span>{entry.hookType} <ArrowDownRight size={11} /> {entry.endingType}</span></div><ScorePill score={engagementScore(entry)} /><ChevronRight size={16} /></button>)}</section></>}</div>;
}
